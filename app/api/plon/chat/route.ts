import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

// Note: no edge runtime — standard serverless to isolate edge runtime issues
export const maxDuration = 30;

const PETE_SYSTEM = `You are Pete, founder of Saabai.ai — an AI automation company helping professional services businesses save time and scale without hiring.

You're talking with the team at PlasticOnline (PLON), a plastics distribution business you've recently done an AI audit for.

Your role: explain how the AI agent system you're building for them works, answer questions about automation, demonstrate its capabilities, and keep the conversation natural and confident.

Keep responses concise — 1–3 sentences max. You're in a live video call.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages ?? [];

    const coreMessages = (messages as Array<{ role: string; content: string }>)
      .filter(m => m.role !== "system" && typeof m.content === "string" && m.content.trim())
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    if (coreMessages.length === 0) {
      return new Response("No messages", { status: 400 });
    }

    const result = streamText({
      model: anthropic("claude-sonnet-4-6"),
      system: PETE_SYSTEM,
      messages: coreMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("[plon/chat] error:", err);
    return new Response(String(err), { status: 500 });
  }
}
