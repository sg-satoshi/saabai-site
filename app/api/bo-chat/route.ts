import { generateText } from "ai";
import { getDefaultModel } from "../../../lib/chat-config";
import { lastUserText, logChatTurn, modelIdFrom } from "../../../lib/chat-log";
import { BO_SYSTEM_PROMPT } from "../../../lib/chatbot/platform-bot-seed";

// Fallback for widgets cached before the move to /api/chat-platform/message.
// Delete this route after 27 October 2026 (one week).
export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT = BO_SYSTEM_PROMPT;

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const incomingMessages = body.messages || [];

    const chatMessages = incomingMessages
      .filter((m: { role: string }) => m.role !== "system")
      .map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const model = getDefaultModel();
    const result = await generateText({
      model,
      system: SYSTEM_PROMPT,
      messages: chatMessages,
    });
    const text = result.text;
    logChatTurn({
      bot: "bo",
      siteId: "bo-consultancy",
      model: modelIdFrom(model),
      usage: result.totalUsage ?? result.usage,
      userText: lastUserText(chatMessages),
      assistantText: text,
    });

    return new Response(JSON.stringify({ content: text }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    console.error("BO chat error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate response" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
