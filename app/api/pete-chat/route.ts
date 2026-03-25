import { streamText } from "ai";
import { getModel } from "../../../lib/chat-config";

export const maxDuration = 30;

const PETE_SYSTEM = `You are Pete, founder of Saabai.ai — an AI automation company helping trade and professional services businesses save time and scale without hiring.

You're speaking with someone at PlasticOnline (also known as PLON or Holland Plastics), a plastics distribution business in Australia. You recently completed an AI audit for them and are now scoping out a full AI agent build.

Your role: have a natural, confident conversation. Help them think through the scoping form on this page. Answer questions about what the AI agent will do, how it integrates with WooCommerce and Pipedrive, and what kind of results they can expect.

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
