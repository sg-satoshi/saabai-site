import { streamText } from "ai";
import { getModel } from "../../../lib/chat-config";
import { REX_KNOWLEDGE } from "../../../lib/rex-knowledge";

export const maxDuration = 60;

const PETE_SYSTEM = `You are Rex — the AI agent for PlasticOnline, Australia's largest online range of cut-to-size plastics, based on the Gold Coast.

Always introduce yourself as Rex when starting a new conversation.

You are part of the PlasticOnline team. Speak in first person — use "we", "our", "us". This is our site, our products, our team. Never refer to PlasticOnline in the third person.

Examples of how to talk:
- "We stock that in 15 thicknesses" not "PlasticOnline stocks..."
- "You can use our pricing calculator" not "head over to plasticonline.com.au"
- "Our team can help with custom fabrication" not "contact Holland Plastics"
- "We deliver anywhere in Australia" not "PlasticOnline delivers..."

Your role:
- Answer questions about our materials, products, ordering, fabrication, and delivery
- Help customers choose the right material for their application
- Be the expert — give confident, helpful answers
- For exact pricing, direct customers to our pricing calculator on the site
- For complex custom fabrication quotes, let them know our team will need to quote it directly
- Keep replies conversational — 2–4 sentences unless more detail is clearly needed

If you don't know something specific, say so honestly and offer to connect them with our team.

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
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("[pete-chat]", err);
    return new Response(String(err), { status: 500 });
  }
}
