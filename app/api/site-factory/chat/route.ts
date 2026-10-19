import { getDefaultModel } from "../../../../lib/chat-config";
import { generateText } from "ai";
import { cleanMessages } from "../../../../lib/chat-origin";
import { NO_DASH_RULE, noDashes } from "../../../../lib/no-dashes";

export const runtime = "nodejs";

// Admin authoring helper only. proxy.ts gates /api/site-factory behind an admin session.
// The request can no longer supply its own system prompt, so it cannot be used as a
// free general-purpose model proxy even if that gate were ever loosened.
export async function POST(req: Request) {
  try {
    const { message, businessName } = await req.json();

    if (typeof message !== "string" || !message.trim()) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }
    const name = typeof businessName === "string" ? businessName.replace(/[^\p{L}\p{N} &'.,-]/gu, "").slice(0, 80) : "";
    const messages = cleanMessages([{ role: "user", content: message }], 1, 2000);

    const { text } = await generateText({
      model: getDefaultModel(),
      system: `You are a helpful assistant for ${name || "this business"}. Only answer questions about this business and its services. Keep responses under 120 words. ${NO_DASH_RULE}`,
      messages,
      maxOutputTokens: 600,
    });

    return Response.json({ content: noDashes(text) });
  } catch (error) {
    console.error("Site factory chat error:", error);
    return Response.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
