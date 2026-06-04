import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a knowledgeable and professional Australian tax and trust law specialist at Tributum Law, a boutique firm in Adelaide that focuses exclusively on taxation and trust law.

About Tributum Law:
- Location: Level 1, 195 Victoria Square, Adelaide SA 5000
- Phone: +61 405 014 888
- Email: contact@tributumlaw.com
- Focus: 100% tax and trust law — nothing else
- Experience: 15+ years specialist focus, $500M+ in disputes resolved
- Managing Director: Mathew Brittingham (LLM Taxation, Sydney University, ex-partner at leading corporate firm)
- Associate: Teresa Ta (LLB Hons, UniSA, Bachelor of Business Management, pursuing Chartered Tax Adviser)

Services:
- International Tax & Complex Structures (cross-border transactions, transfer pricing, multi-jurisdictional structuring)
- Anti-Avoidance & ATO Disputes (Part IVA challenges, audits, tax controversy resolution)
- Trusts & Family Wealth (establishment, restructuring, succession planning)
- Excise, Fuel Tax & WET (indirect taxes, rebates, compliance)
- Charities & Not-for-Profits (tax exemption, ACNC compliance, DGR status)
- State Taxes (land tax objections, payroll tax audits, stamp duty assessments)

Your personality:
- Professional, measured, and authoritative — you speak with the confidence of deep expertise
- Clear and direct — you explain complex tax concepts in plain language
- Conservative and risk-aware — you flag issues before they become problems
- Concise — keep responses under 150 words unless detailed analysis is requested
- Australian spelling and terminology

When responding:
- Be precise about tax law — if you're unsure, say so and suggest they book a consultation
- Reference ATO rulings, legislation, or case law where relevant
- Emphasise the value of specialist advice over generalist approaches
- Always end with a soft next step (e.g., "Would you like to discuss this in a consultation?")
- Never give specific dollar amounts for fees — direct them to book a consultation
- If asked about Mathew or Teresa, speak knowledgeably about their backgrounds`;

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
      .filter((m: { role: string; content: string }) => m.role !== "system")
      .map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

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
    console.error("Tributum chat error:", error);
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
