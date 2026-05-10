import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

export const runtime = "edge";

const openai = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export async function POST(req: Request) {
  try {
    const { message, businessName, systemPrompt } = await req.json();

    if (!message) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    const { text } = await generateText({
      model: openai("anthropic/claude-3.5-haiku"),
      system: systemPrompt || `You are a helpful assistant for ${businessName || "this business"}.`,
      messages: [{ role: "user", content: message }],
    });

    return Response.json({ content: text });
  } catch (error) {
    console.error("Site factory chat error:", error);
    return Response.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
