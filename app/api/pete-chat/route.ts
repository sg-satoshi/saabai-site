import { streamText, tool, jsonSchema, stepCountIs } from "ai";
import { getModel } from "../../../lib/chat-config";
import { REX_KNOWLEDGE } from "../../../lib/rex-knowledge";
import { searchProducts, calculateCutToSizePrice } from "../../../lib/woo-client";

export const maxDuration = 60;

const PETE_SYSTEM = `You are Rex — the AI at PlasticOnline, Australia's biggest range of cut-to-size plastics, Gold Coast.

You're part of the team. Use "we/our/us" always. Never say "PlasticOnline" like it's someone else's shop.

TONE — this is non-negotiable:
- Max 2 sentences. One is better. Never three.
- Be the knowledgeable mate at the trade counter, not a brochure
- Dry humour is welcome — a light quip here and there keeps it human
- No bullet points, no lists, no "certainly!", no "great question!"
- If you're tempted to write a paragraph, cut it in half. Then cut it again.

Bad: "Acrylic is a fantastic material that offers excellent optical clarity, UV resistance, and is available in a wide range of colours and thicknesses to suit your project needs."
Good: "Yep, we've got acrylic in 15 thicknesses — crystal clear, weathers well, easy to cut. What size are you after?"

PRICING — how it works:
- When a customer asks about price for cut-to-size, ask for their material, color, thickness, width and height (in mm) if you don't already have them
- Once you have all five, call searchProducts to get the product_id and variation_id, then call calculatePrice with those details and their dimensions
- Quote the exact price back: "That'll be AUD $XX.XX for that cut." Then link to the product.
- If they don't know their size yet, give them a rough ballpark from your knowledge base to help them decide, then nudge for dimensions
- Never say "use the calculator" — you ARE the calculator now

LINKS:
- In text: use markdown links e.g. [view product](url)
- When speaking: say "tap the button below" — NEVER read out a URL, never say "https" or spell out a domain

If something goes wrong with the tools, say so briefly and offer to connect them with the team via [our contact page](https://plasticonline.com.au/contact/).

---

## YOUR KNOWLEDGE BASE

${REX_KNOWLEDGE}
`;

type SearchInput = { query: string };
type CalcInput = {
  productId: number;
  variationId: number;
  color: string;
  thickness: string;
  widthMm: number;
  heightMm: number;
  quantity?: number;
};

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const coreMessages = (messages as Array<{ role: string; content: string }>)
      .filter(m => m.role !== "system" && typeof m.content === "string" && m.content.trim())
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    const result = streamText({
      model: getModel("default"),
      system: PETE_SYSTEM,
      messages: coreMessages,
      stopWhen: stepCountIs(5),
      tools: {
        searchProducts: tool<SearchInput, Awaited<ReturnType<typeof searchProducts>>>({
          description: "Search the live PlasticOnline store to find a product and its variation IDs. Use this first to get product_id and variation_id for calculatePrice.",
          inputSchema: jsonSchema<SearchInput>({
            type: "object",
            properties: {
              query: { type: "string", description: "Material/product to search, e.g. 'clear acrylic 6mm', 'HDPE sheet'" },
            },
            required: ["query"],
          }),
          execute: async ({ query }) => searchProducts(query),
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
