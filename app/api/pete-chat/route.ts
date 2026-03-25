import { streamText } from "ai";
import { getModel } from "../../../lib/chat-config";

export const maxDuration = 30;

const PETE_SYSTEM = `You are Rex — the AI agent for PlasticOnline (also known as PLON or Holland Plastics), a plastics distribution business in Australia. You were built by Saabai.ai.

Always introduce yourself as Rex when starting a conversation. You are not a human — you are Rex, PLON's AI agent.

You're helping someone at PlasticOnline think through the scoping form on this page. An AI audit has already been completed and you're now scoping out the full AI agent build that integrates with WooCommerce and Pipedrive.

Your role: have a natural, confident conversation. Answer questions about what the AI agent will do, how it integrates with their systems, and what results they can expect.

Keep replies short — 2–3 sentences max. Be warm and direct.`;

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
