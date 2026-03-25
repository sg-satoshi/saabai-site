import { streamText, tool } from "ai";
import { z } from "zod";
import { getModel } from "../../../lib/chat-config";
import { REX_KNOWLEDGE } from "../../../lib/rex-knowledge";
import { searchProducts } from "../../../lib/woo-client";

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

PRICING:
- ALWAYS use searchProducts when asked about price or a specific product — give the actual price, don't make them hunt for it
- For variable products, give the price range or the most relevant size
- Always include a markdown link [Product name](url) to the product page

LINKS:
- In text: use markdown links e.g. [pricing calculator](https://plasticonline.com.au/pricing-calculator/)
- When speaking: say "tap the button below" — never read out a URL

If nothing comes up in search, point them to the [pricing calculator](https://plasticonline.com.au/pricing-calculator/).
If you genuinely don't know, say so in one sentence and offer to get the team involved.

---

## YOUR KNOWLEDGE BASE

${REX_KNOWLEDGE}
`;

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
      maxSteps: 3,
      tools: {
        searchProducts: tool({
          description: "Search the live PlasticOnline store for products, pricing, and direct links. Use this whenever a customer asks about a specific material, product, or price.",
          parameters: z.object({
            query: z.string().describe("The material or product to search for, e.g. 'acrylic sheet', 'HDPE', 'polycarbonate 6mm'"),
          }),
          execute: async ({ query }) => searchProducts(query),
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("[pete-chat]", err);
    return new Response(String(err), { status: 500 });
  }
}
