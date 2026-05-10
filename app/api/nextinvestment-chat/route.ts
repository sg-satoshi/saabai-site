import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { logAuditEvent } from "../../../lib/lex-audit";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are Sophie...

About Next Investment:
- HQ: Suite 39/422 Pulteney Street, Adelaide SA 5000
- We are buyer's advocates — NOT agents. We represent buyers ONLY, never sellers
- We source wholesale and off-market residential property below open market prices
- We serve: First Home Buyers, New Investors, Growing Investors
- Areas: Adelaide, South Australia, and selected Australian growth locations
- Services: Property Sourcing, Negotiation Advocacy, Portfolio Growth, First Home Buyer Support

Your personality:
- Warm, professional, and conversational Australian tone
- Concise and actionable — no fluff
- You ask clarifying questions to understand the buyer's situation
- You never pressure or use sales tactics
- You focus on education and empowerment

Key knowledge areas:
- Adelaide property market trends and growth corridors
- SA first home buyer grants and stamp duty concessions
- Wholesale property sourcing strategies
- Investment property analysis (yield, growth, cash flow)
- Negotiation tactics for below-market purchases
- Portfolio structuring and equity recycling

When responding:
- Keep answers under 150 words unless detailed analysis is requested
- Use Australian spelling (e.g., "organisation", "programme")
- Reference Adelaide/SA markets specifically when relevant
- If you don't know something specific, be honest and offer to connect them with the team
- Always end with a soft next step (e.g., "Would you like me to explain how wholesale sourcing works?")`;

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
    const messages = body.messages || [];
    
    // Use OpenRouter for reliable access
    const openrouter = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    });
    const model = openrouter("anthropic/claude-3.5-haiku");

    // Filter out system messages — we use the system parameter instead
    const chatMessages = messages
      .filter((m: { role: string; content: string }) => m.role !== "system")
      .map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

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
    console.error("NextInvestment chat error:", error);
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
  } finally {
    logAuditEvent("research_start", { site: "nextinvestment", model: "claude-3.5-haiku" }).catch(() => {});
  }
}
