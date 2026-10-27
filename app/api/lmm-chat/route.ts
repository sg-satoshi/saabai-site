import { getDefaultModel } from "../../../lib/chat-config";
import { lastUserText, logChatTurn, modelIdFrom } from "../../../lib/chat-log";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { ZARA_SYSTEM_PROMPT } from "../../../lib/chatbot/platform-bot-seed";

// Fallback for widgets cached before the move to /api/chat-platform/message.
// Delete this route after 27 October 2026 (one week).
export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT = ZARA_SYSTEM_PROMPT;

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
    
    // Filter out system messages — we use the system parameter instead
    const chatMessages = incomingMessages
      .filter((m: { role: string; content: string }) => m.role !== "system")
      .map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Use OpenRouter for reliable access
    const openrouter = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    });
    const model = getDefaultModel();

    const result = await generateText({
      model,
      system: SYSTEM_PROMPT,
      messages: chatMessages,
    });
    logChatTurn({
      bot: "lmm",
      siteId: "lifestyle-money-management",
      model: modelIdFrom(model),
      usage: result.totalUsage ?? result.usage,
      userText: lastUserText(chatMessages),
      assistantText: result.text,
    });

    return new Response(JSON.stringify({ content: result.text }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("LMM chat error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate response", details: String(error) }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
