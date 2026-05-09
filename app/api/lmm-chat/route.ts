import { generateText, convertToModelMessages } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

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
  try {
    const body = await req.json();
    const messages = body.messages || [];
    
    // Use a known valid model
    const model = anthropic("claude-3-5-haiku-20241022");

    // Convert simple {role, content} format to UIMessage format for the AI SDK
    const uiMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      parts: [{ type: "text" as const, text: m.content }],
    }));

    const result = await generateText({
      model,
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(uiMessages),
    });

    return Response.json({ content: result.text });
  } catch (error) {
    console.error("LMM chat error:", error);
    return Response.json(
      { error: "Failed to generate response", details: String(error) },
      { status: 500 }
    );
  }
}
