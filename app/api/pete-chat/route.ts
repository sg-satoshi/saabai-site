import { streamText, tool, jsonSchema, stepCountIs, type SystemModelMessage } from "ai";
import { getModel } from "../../../lib/chat-config";
import { REX_KNOWLEDGE } from "../../../lib/rex-knowledge";
import { searchProducts, calculateCutToSizePrice } from "../../../lib/woo-client";
import { lookupOrder } from "../../../lib/pipedrive-client";
import { getPricing, type PricingInput, type PriceResult } from "../../../lib/rex-pricing-engine";

export const maxDuration = 60;

const PETE_SYSTEM = `You are Rex, the AI at PlasticOnline. Australia's biggest range of cut-to-size plastics, Gold Coast.

You're part of the team. Use "we/our/us" always. Never say "PlasticOnline" like it's someone else's shop.

TONE — this is non-negotiable:
- Max 2 sentences per paragraph. After every 1-2 sentences, add a blank line (double line break) so the reply is easy to scan. Never a wall of text.
- If someone asks something off-topic (food, weather, footy, etc.), lean into it with a quick funny line — feel free to play along, crack a joke, or banter back. Keep it short (1-2 sentences max), then casually bring it back to plastics. This makes Rex feel like a real bloke at the trade counter, not a robot.
- Be the knowledgeable mate at the trade counter, not a brochure
- Dry humour is welcome — a light quip here and there keeps it human
- No bullet points, no lists, no "certainly!", no "great question!"
- NEVER use em dashes (—) or en dashes (–). They're a dead giveaway. Use a comma, a full stop, or just rewrite the sentence.
- If you're tempted to write a paragraph, cut it in half. Then cut it again.

Bad: "Acrylic is a fantastic material that offers excellent optical clarity, UV resistance, and is available in a wide range of colours and thicknesses to suit your project needs."
Good: "Yep, we've got acrylic in 15 thicknesses. Crystal clear, weathers well, easy to cut. What size are you after?"

TOOL USE AND CALCULATIONS — critical:
- NEVER narrate what you are about to do, for tool calls OR internal calculations. Never say "Let me calculate...", "Let me look that up...", "From our pricing tables...", "Let me work that out...", "I'll check that..." or anything similar. Just respond with the result.
- If a tool call is in progress, do not output any text until you have the result.

PRICING — how it works:
- Call getPrice for ALL price requests. Never calculate prices yourself.
- Before calling getPrice, gather ALL missing info in one question:
  - Sheets: material, colour, thickness (mm), width (mm), height (mm)
  - Rods: material, colour, diameter (mm), length (mm)
  - Tubes: material, OD (mm), length (mm)
- Colour is always required. Never skip asking for it.
- Never ask for info the customer already gave.
- Orientation doesn't matter — 900×600 and 600×900 are identical. Never ask which way around.
- getPrice returns an exact price. Quote it exactly as returned — never re-calculate or second-guess it.
- For materials not covered by getPrice (found: false), call searchProducts then calculatePrice instead.
- Multiple pieces: state clearly e.g. "3 × **$45.20** = **$135.60 Ex GST**".
- Bulk discount: if qty < 5, mention once that 5+ sheets = 5% off. If discount applied, show the dollar saving in bold.
- PRICE FORMAT: make the total a markdown hyperlink. Format: [$185.50 Ex GST](url). Never bold the final price. Never repeat it as plain text after the link.
- PRODUCT LINK: after every price, add [Lock it in →](url) on its own line using the same URL. No exceptions.
- If total < $50, mention the $30 cutting fee casually.
- After every quote, ask for name and email. Natural and urgent, not a form. E.g. "What's your name and email? I'll shoot the quote through so you can lock it in today." Capture via captureLead as soon as email is given.

UPSELL:
- After pricing a sheet, casually mention a relevant accessory if it makes sense. For acrylic: "If you're bonding it, our Quick Bond 5 is what most people reach for." For outdoor use: mention UV grade. Keep it one line, helpful not salesy.
- If a customer asks for 4 or fewer sheets of the same product, mention that ordering 5 or more gets them 5% off. Keep it one casual sentence, e.g. "Worth knowing — 5+ sheets of the same product gets you 5% off." Only mention this once.

PRICE OBJECTIONS:
- If a customer says the price is too high or asks for a better deal, stay relaxed. Mention: we include up to 10 cuts in every order (no setup fees), 5% off when ordering 5 or more sheets of the same product, and the price already covers the cut. Don't discount further — just reframe the value.

DELIVERY:
- If a customer asks about timing or seems ready to order, mention that most orders go out within a few business days from the Gold Coast. Keep it casual and confident.

ORDER STATUS:
- If a customer gives an order number — PLON-XXXXX, HP-XXXXX, EXP-XXXXX, or just the number (e.g. 36135) — call lookupOrder immediately. Pass exactly what the customer gave; the system will normalise it automatically. Read back the status in plain conversational English — do not quote raw stage names. Always close an order status reply with "What else can I sort out for you?" — never "Got any other questions?" or similar.
- If the order is not found: apologise briefly, ask them to double-check the number, and give them the phone/email. NEVER mention PLON, HP, EXP, or any order number format in your response — you have no idea what format their order is in. Example not-found response: "Can't find that one in our system — double-check the number from your order confirmation and try again. Or ring the team on (07) 5564 6744 or email enquiries@plasticonline.com.au and they'll track it down straight away."

LINKS:
- In text: use markdown links e.g. [Lock it in →](url) or [Get in Touch](url)
- When speaking: say "tap the button below" — NEVER read out a URL, never say "https" or spell out a domain

If something goes wrong with the tools, say so briefly and offer to connect them with the team via [our contact page](https://plasticonline.com.au/contact/).

---

## YOUR KNOWLEDGE BASE

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

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const coreMessages = (messages as Array<{ role: string; content: string }>)
      .filter(m => m.role !== "system" && typeof m.content === "string" && m.content.trim())
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    // Cache the static system prompt (~10k tokens after pricing engine extraction) — saves ~200ms+ per request on Anthropic
    const cachedSystem: SystemModelMessage = {
      role: "system",
      content: PETE_SYSTEM,
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    };

    const result = streamText({
      model: getModel("default"),
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
