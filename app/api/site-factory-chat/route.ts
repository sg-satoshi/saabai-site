import { NextRequest } from "next/server";
import { generateText } from "ai";
import { getDefaultModel } from "../../../lib/chat-config";
import { getSiteBySlug } from "../../../lib/site-registry";

export const runtime = "nodejs";
export const maxDuration = 30;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const { slug, messages = [] } = await req.json();
    if (!slug) return Response.json({ error: "slug required" }, { status: 400, headers: CORS });

    const site = await getSiteBySlug(slug);

    // Build the system prompt from site config or fall back to sensible defaults
    let system: string;
    if (site?.chatbot?.systemPrompt) {
      system = site.chatbot.systemPrompt;
    } else {
      const name = site?.business?.name || site?.name || slug;
      const niche = site?.niche || "business";
      const location = site?.business?.address || "Australia";
      const phone = site?.business?.phone || "";
      const email = site?.business?.email || "";
      system = `You are a helpful assistant for ${name}, a ${niche} business${location ? ` in ${location}` : ""}.
Be warm, friendly and concise. Answer questions about the business and its services.
${phone ? `Phone: ${phone}` : ""}${email ? ` Email: ${email}` : ""}
Keep responses under 120 words. End with a helpful next step when relevant.`;
    }

    const chatMessages = messages
      .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
      .slice(-12)
      .map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const { text } = await generateText({
      model: getDefaultModel(),
      system,
      messages: chatMessages,
    });

    return Response.json({ content: text }, { headers: CORS });
  } catch (e) {
    console.error("site-factory-chat error:", e);
    return Response.json({ error: "Failed to respond" }, { status: 500, headers: CORS });
  }
}
