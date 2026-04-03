import { streamText, tool, jsonSchema, stepCountIs, type SystemModelMessage } from "ai";
import { getModel } from "../../../lib/chat-config";
import { REX_KNOWLEDGE } from "../../../lib/rex-knowledge";
import { searchProducts, calculateCutToSizePrice } from "../../../lib/woo-client";
import { lookupOrder } from "../../../lib/pipedrive-client";
import { getPricing, type PricingInput, type PriceResult } from "../../../lib/rex-pricing-engine";

export const maxDuration = 60;

const PETE_SYSTEM = `You are Rex, the AI at PlasticOnline. Australia's biggest range of cut-to-size plastics, Gold Coast. You're part of the team. Use "we/our/us" always.

TONE:
2 sentences max per paragraph, double line break between. Trade counter mate, not brochure. Dry humour OK. No bullets, no "certainly!", no em/en dashes. Cut paragraphs in half, then cut again. Off-topic? Quick joke, then back to plastics (1-2 sentences max).

TOOL USE:
Never narrate. Banned: "Let me calculate/check/look that up..." Just respond with result.

PRICING:
Call getPrice for ALL prices. Gather missing info in ONE question (sheets: material, colour, thickness mm, width mm, height mm | rods: material, colour, diameter mm, length mm | tubes: material, OD mm, length mm). Colour always required. Never re-ask. Orientation irrelevant (900×600 = 600×900). Quote exact price returned. Multiple pieces: "3 × **$45.20** = **$135.60 Ex GST**". Bulk: if qty < 5, mention once "5+ sheets = 5% off". Format: [$185.50 Ex GST](url) then [Lock it in →](url) on new line. If < $50, mention $30 cutting fee. After every quote, ask name/email naturally. Capture via captureLead.

UPSELL:
After pricing, casually mention accessory if relevant (acrylic: Quick Bond 5 | outdoor: UV grade). 1 line, helpful not salesy. If qty ≤ 4, mention 5% off for 5+ (once only).

PRICE OBJECTIONS:
Stay relaxed. Mention: 10 cuts included, 5% off 5+ sheets, price includes cut. Don't discount.

DELIVERY:
If asked or ready to order: most orders ship within a few business days from Gold Coast.

ORDER STATUS:
Order number given (PLON-XXXXX, HP-XXXXX, EXP-XXXXX, or just number)? Call lookupOrder immediately. Read back in plain English (no raw stage names). Close with "What else can I sort out for you?" Not found? Apologise, ask to double-check, give phone/email. Never mention order formats.

LINKS:
Text: markdown [Lock it in →](url). Speaking: "tap the button below". Never read URLs.

Error? Say so briefly, offer [contact page](https://plasticonline.com.au/contact/).

---

${REX_KNOWLEDGE}
`;

type SearchInput = { query: string };
type LeadInput = { email: string; name?: string; note?: string };
type CalcInput = {
  productId: number;
  variationId: number;
  color: string;
  thickness: string;
  widthMm: number;
  heightMm: number;
  quantity?: number;
};

type OrderInput = { orderNumber: string };
type GetPriceInput = PricingInput;

// Proactive intent detection from first message
function detectIntent(firstMessage: string): "pricing" | "technical" | "general" {
  const msg = firstMessage.toLowerCase();
  
  // Pricing intent signals
  if (/price|quote|cost|how much|\$/.test(msg)) return "pricing";
  if (/\d+mm|\d+\s*x\s*\d+/.test(msg)) return "pricing"; // dimensions = likely pricing
  if (/buy|order|purchase|cart/.test(msg)) return "pricing";
  
  // Technical intent signals
  if (/peek|ptfe|nylon|acetal|uhmwpe|properties|spec/i.test(msg)) return "technical";
  if (/(best|suitable|recommend|right).*for/i.test(msg)) return "technical";
  if (/bond|glue|cut|drill|form|machine/.test(msg)) return "technical";
  
  return "general";
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const coreMessages = (messages as Array<{ role: string; content: string }>)
      .filter(m => m.role !== "system" && typeof m.content === "string" && m.content.trim())
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    // Proactive model selection based on intent
    const firstMsg = coreMessages[0]?.content || "";
    const intent = detectIntent(firstMsg);
    const tier = (intent !== "general" || coreMessages.length > 6) ? "premium" : "default";

    // Cache the static system prompt (~7k tokens) — full-context injection is faster than tool retrieval at this KB size
    const cachedSystem: SystemModelMessage = {
      role: "system",
      content: PETE_SYSTEM,
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    };

    const result = streamText({
      model: getModel(tier),
      system: cachedSystem,
      messages: coreMessages,
      stopWhen: stepCountIs(8),
      tools: {
        searchProducts: tool<SearchInput, Awaited<ReturnType<typeof searchProducts>>>({
          description: "Search the live PlasticOnline store to find a product and its variation IDs. Use this first to get product_id and variation_id for calculatePrice.",
          inputSchema: jsonSchema<SearchInput>({
            type: "object",
            properties: {
              query: { type: "string", description: "Base material name only — e.g. 'acrylic sheet', 'polycarbonate sheet', 'HDPE sheet'. Do NOT include color or thickness — those are matched from variation attributes." },
            },
            required: ["query"],
          }),
          execute: async ({ query }) => searchProducts(query),
        }),

        captureLead: tool<LeadInput, { ok: boolean }>({
          description: "Save the customer's name and email when they share them during the conversation. Call this silently as soon as an email is given.",
          inputSchema: jsonSchema<LeadInput>({
            type: "object",
            properties: {
              email: { type: "string", description: "Customer email address" },
              name: { type: "string", description: "Customer's name if they gave it" },
              note: { type: "string", description: "Brief context, e.g. 'quote for 6mm clear acrylic 600x600mm'" },
            },
            required: ["email"],
          }),
          execute: async ({ email, name, note }) => {
            // Fire and forget — pass full conversation so AI can generate structured quote for emails
            fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? "https://saabai-site.vercel.app"}/api/rex-leads`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ source: "rex_mid_chat", email, name, note, messages: coreMessages, timestamp: new Date().toISOString() }),
            }).catch(() => {});
            return { ok: true };
          },
        }),

        lookupOrder: tool<OrderInput, Awaited<ReturnType<typeof lookupOrder>>>({
          description: "Look up the status of a customer's order in Pipedrive by order number. Accepts PLON-XXXXX format or just the number (e.g. 36135) — normalisation is handled automatically. Call this whenever a customer provides an order number.",
          inputSchema: jsonSchema<OrderInput>({
            type: "object",
            properties: {
              orderNumber: { type: "string", description: "The order number exactly as given by the customer, e.g. PLON-36135" },
            },
            required: ["orderNumber"],
          }),
          execute: async ({ orderNumber }) => lookupOrder(orderNumber),
        }),

        getPrice: tool<GetPriceInput, PriceResult>({
          description: "Get the exact price for any plastic product — sheets, rods, or tubes. Handles cut-to-size logic, oversized sheets, bulk discounts, and minimum order fees automatically. Call this for ALL price requests.",
          inputSchema: jsonSchema<GetPriceInput>({
            type: "object",
            properties: {
              type:        { type: "string", enum: ["sheet", "rod", "tube"], description: "Product type" },
              material:    { type: "string", description: "Material name e.g. 'acrylic', 'polycarbonate', 'acetal', 'HDPE', 'PTFE', 'nylon', 'UHMWPE', 'polypropylene', 'PETG', 'HIPS', 'corflute', 'ACP', 'mirror acrylic', 'euromir', 'PEEK'" },
              colour:      { type: "string", description: "Colour or grade e.g. 'clear', 'opal', 'white', 'black', 'natural', 'silver', 'gold', 'tint'" },
              thicknessMm: { type: "number", description: "Sheet thickness in mm" },
              diameterMm:  { type: "number", description: "Rod or tube outer diameter in mm" },
              widthMm:     { type: "number", description: "Sheet width in mm" },
              heightMm:    { type: "number", description: "Sheet height in mm" },
              lengthMm:    { type: "number", description: "Rod or tube length in mm (omit or 0 for full standard length)" },
              quantity:    { type: "number", description: "Number of pieces, default 1" },
            },
            required: ["type", "material"],
          }),
          execute: async (input) => getPricing(input),
        }),

        calculatePrice: tool<CalcInput, Awaited<ReturnType<typeof calculateCutToSizePrice>>>({
          description: "Calculate the exact cut-to-size price via the PlasticOnline calculator. Call searchProducts first to get product_id and variation_id.",
          inputSchema: jsonSchema<CalcInput>({
            type: "object",
            properties: {
              productId: { type: "number", description: "WooCommerce product ID from searchProducts" },
              variationId: { type: "number", description: "Variation ID matching the customer's thickness and color" },
              color: { type: "string", description: "Color attribute exactly as returned, e.g. 'Clear 000'" },
              thickness: { type: "string", description: "Thickness attribute exactly as returned, e.g. '6.0mm'" },
              widthMm: { type: "number", description: "Required width in millimetres" },
              heightMm: { type: "number", description: "Required height in millimetres" },
              quantity: { type: "number", description: "Number of pieces, default 1" },
            },
            required: ["productId", "variationId", "color", "thickness", "widthMm", "heightMm"],
          }),
          execute: async (params) => calculateCutToSizePrice(params),
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("[pete-chat]", err);
    return new Response(String(err), { status: 500 });
  }
}
