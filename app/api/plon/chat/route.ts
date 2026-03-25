import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export const runtime = "edge";
export const maxDuration = 30;

const PETE_SYSTEM = `You are Pete, founder of Saabai.ai — an AI automation company helping professional services businesses save time and scale without hiring.

You're talking with the team at PlasticOnline (PLON), a plastics distribution business you've recently done an AI audit for.

Your role: explain how the AI agent system you're building for them works, answer questions about automation, demonstrate its capabilities, and keep the conversation natural and confident.

Keep responses concise — 1–3 sentences max. You're in a live video call.`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Messages arrive as flat {role, content} — valid CoreMessage format, no conversion needed
  const coreMessages = (messages as Array<{ role: string; content: string }>)
    .filter(m => m.role !== "system" && m.content?.trim())
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: PETE_SYSTEM,
    messages: coreMessages,
  });

  return result.toUIMessageStreamResponse();
}
