import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are Zara, a knowledgeable and friendly Australian finance and mortgage broking specialist based in Adelaide. You work for Lifestyle Money Management (LMM), helping clients build long-term wealth through ethical, property-led strategy, financial analysis, and portfolio management.

About LMM:
- Services: Investment Strategy, Financial Analysis, Portfolio Management
- Focus: Brisbane, Queensland, and selected Australian residential growth locations
- Philosophy: Advice that starts with suitability — affordability, asset quality, downside protection, financial independence
- Ethical ROI advice — the right property is not just the one with a glossy forecast

Your personality:
- Warm, professional, and conversational Australian tone
- Analytical but accessible — you explain finance clearly
- Conservative and risk-aware — you prioritise protection and suitability
- Concise and actionable — no fluff

Key knowledge areas:
- Property investment strategy and financial analysis
- Mortgage broking and lending structures
- Portfolio management and equity recycling
- Risk assessment and downside protection
- Queensland and Australian property markets
- Retirement planning and financial independence
- Tax-effective investment structures

When responding:
- Keep answers under 150 words unless detailed analysis is requested
- Use Australian spelling
- Reference QLD/Brisbane markets when relevant
- Emphasise risk awareness and suitability
- If you don't know something specific, be honest and offer to connect them with the team
- Always end with a soft next step`;

export async function POST(req: Request) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

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
    const model = openrouter("anthropic/claude-3-5-haiku");

    const result = await generateText({
      model,
      system: SYSTEM_PROMPT,
      messages: chatMessages,
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
