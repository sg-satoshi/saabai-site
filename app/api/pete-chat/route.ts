import { streamText, tool, jsonSchema, stepCountIs, type SystemModelMessage } from "ai";
import { getModel } from "../../../lib/chat-config";
import { getClientConfig } from "../../../lib/rex-config";
import { searchProducts, calculateCutToSizePrice } from "../../../lib/woo-client";
import { lookupOrder } from "../../../lib/pipedrive-client";
import { getPricing, type PricingInput, type PriceResult } from "../../../lib/rex-pricing-engine";

export const maxDuration = 60;

type SearchInput = { query: string };
type LeadInput = { email: string; name?: string; company?: string; note?: string };
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
    const { messages, clientId } = await req.json();

    const config = getClientConfig(clientId);

    const coreMessages = (messages as Array<{ role: string; content: string }>)
      .filter(m => m.role !== "system" && typeof m.content === "string" && m.content.trim())
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    // Always use premium model — Gemini Flash Lite (DEFAULT_CHAT_MODEL) stalls when tools are
    // present in the request, causing silent empty responses for all queries including general chat.
    // captureLead is always wired into tools, so every request triggers the stall.
    // All queries route to Claude Sonnet (PREMIUM_CHAT_MODEL) until a reliable default is found.
    const tier: "default" | "premium" = "premium";

    // Cache the static system prompt (~7k tokens) — full-context injection is faster than tool retrieval at this KB size
    const cachedSystem: SystemModelMessage = {
      role: "system",
      content: config.systemPrompt,
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    };

    // captureLead is always available — it passes clientId through to rex-leads
    const captureLeadTool = tool<LeadInput, { ok: boolean }>({
      description: "Save the customer's name and email when they share them during the conversation. Call this silently as soon as an email is given.",
      inputSchema: jsonSchema<LeadInput>({
        type: "object",
        properties: {
          email:   { type: "string", description: "Customer email address" },
          name:    { type: "string", description: "Customer's name if they gave it" },
          company: { type: "string", description: "Company or business name if they mentioned it" },
          note:    { type: "string", description: "Brief context, e.g. 'quote for 6mm clear acrylic 600x600mm'" },
        },
        required: ["email"],
      }),
      execute: async ({ email, name, company, note }) => {
        // Fire and forget — pass full conversation so AI can generate structured quote for emails
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? "https://saabai-site.vercel.app"}/api/rex-leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: config.id, source: "rex_mid_chat", email, name, company, note, messages: coreMessages, timestamp: new Date().toISOString() }),
        }).catch(() => {});
        return { ok: true };
      },
    });

    // Build tool set — PLON-specific tools are opt-in per client config
    const enabledTools = new Set(config.tools);

    const result = streamText({
      model: getModel(tier),
      system: cachedSystem,
      messages: coreMessages,
      stopWhen: stepCountIs(8),
      tools: {
        captureLead: captureLeadTool,

        ...(enabledTools.has("searchProducts") && {
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
        }),

        ...(enabledTools.has("lookupOrder") && {
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
        }),

        ...(enabledTools.has("getPrice") && {
          getPrice: tool<GetPriceInput, PriceResult & { cartUrl?: string }>({
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
            execute: async (input) => {
              const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://saabai-site.vercel.app";

              const buildCartUrl = () => {
                const p = new URLSearchParams();
                p.set("material", input.material ?? "");
                if (input.colour)      p.set("colour",    input.colour);
                if (input.thicknessMm) p.set("thickness", String(input.thicknessMm));
                if (input.widthMm)     p.set("width",     String(input.widthMm));
                if (input.heightMm)    p.set("height",    String(input.heightMm));
                p.set("qty", String(input.quantity ?? 1));
                return `${base}/api/rex-cart?${p.toString()}`;
              };

              // For sheets with dimensions: hit PLON's live price API so the price always
              // matches their CTS calculator exactly. Falls back to offline engine if API fails.
              if (input.type === "sheet" && input.widthMm && input.heightMm) {
                try {
                  const search = await searchProducts(`${input.material ?? ""} sheet`);
                  console.log("[getPrice] search:", "error" in search ? search.error : `${search.results?.length} products`);
                  if (!("error" in search) && search.results?.length) {
                    const normNum = (s: string) => s.replace(/[^0-9.]/g, "").replace(/\.0+$/, "");
                    const colStr = (input.colour ?? "").toLowerCase();
                    const thickStr = normNum(String(input.thicknessMm ?? ""));
                    console.log("[getPrice] matching col:", colStr, "thick:", thickStr);

                    outer: for (const product of search.results) {
                      for (const variation of (product.variations as Array<{
                        variation_id: number;
                        attributes: Array<{ name: string; option: string }>;
                        in_stock: boolean;
                      }>)) {
                        if (!variation.in_stock) continue;
                        const attrs = variation.attributes;
                        const thicknessAttr = attrs.find(a => /thickness|size|gauge/i.test(a.name));
                        const colourAttr    = attrs.find(a => /colou?r/i.test(a.name));
                        const tMatch = !thickStr || (thicknessAttr && normNum(thicknessAttr.option) === thickStr);
                        const cMatch = !colStr   || (colourAttr && (
                          colourAttr.option.toLowerCase().includes(colStr) ||
                          colStr.includes(colourAttr.option.toLowerCase())
                        ));
                        console.log("[getPrice] var:", variation.variation_id, "thick:", thicknessAttr?.option, "col:", colourAttr?.option, "tMatch:", tMatch, "cMatch:", cMatch);
                        if (!tMatch || !cMatch) continue;

                        const woo = await calculateCutToSizePrice({
                          productId:   product.product_id,
                          variationId: variation.variation_id,
                          color:       colourAttr?.option ?? "",
                          thickness:   thicknessAttr?.option ?? "",
                          widthMm:     input.widthMm ?? 0,
                          heightMm:    input.heightMm ?? 0,
                          quantity:    input.quantity ?? 1,
                        });
                        console.log("[getPrice] woo result:", JSON.stringify(woo));

                        if ("error" in woo) break outer; // dimensions out of range — fall through

                        const price = Math.round(parseFloat(woo.total.replace(/[^0-9.]/g, "")) * 100) / 100;
                        return {
                          found: true,
                          price,
                          priceFormatted: `$${price.toFixed(2)}`,
                          note: "cut to size",
                          productUrl: product.url,
                          cartUrl: buildCartUrl(),
                          bulkDiscountApplied: false,
                          minimumFeeApplied: false,
                        };
                      }
                    }
                  }
                } catch { /* fall through to offline engine */ }
              }

              // Fallback: offline engine (rods, tubes, full sheets, or if live API unavailable)
              const result = getPricing(input);
              if (result.found && input.type === "sheet") {
                return { ...result, cartUrl: buildCartUrl() };
              }
              return result;
            },
          }),
        }),

        ...(enabledTools.has("calculatePrice") && {
          calculatePrice: tool<CalcInput, Awaited<ReturnType<typeof calculateCutToSizePrice>>>({
            description: "Calculate the exact cut-to-size price via the PlasticOnline calculator. Call searchProducts first to get product_id and variation_id.",
            inputSchema: jsonSchema<CalcInput>({
              type: "object",
              properties: {
                productId:   { type: "number", description: "WooCommerce product ID from searchProducts" },
                variationId: { type: "number", description: "Variation ID matching the customer's thickness and color" },
                color:       { type: "string", description: "Color attribute exactly as returned, e.g. 'Clear 000'" },
                thickness:   { type: "string", description: "Thickness attribute exactly as returned, e.g. '6.0mm'" },
                widthMm:     { type: "number", description: "Required width in millimetres" },
                heightMm:    { type: "number", description: "Required height in millimetres" },
                quantity:    { type: "number", description: "Number of pieces, default 1" },
              },
              required: ["productId", "variationId", "color", "thickness", "widthMm", "heightMm"],
            }),
            execute: async (params) => calculateCutToSizePrice(params),
          }),
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("[pete-chat]", err);
    return new Response(String(err), { status: 500 });
  }
}
