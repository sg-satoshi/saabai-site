import { streamText, tool, stepCountIs, convertToModelMessages } from "ai";
import { z } from "zod";
import { getModel } from "../../../lib/chat-config";
import { SYSTEM_PROMPT } from "../../../lib/chat-prompt";

export const runtime = "edge";
export const maxDuration = 30;

function buildSystemPrompt(pageContext?: string, returningVisitor?: boolean): string {
  let system = SYSTEM_PROMPT;
  if (pageContext) {
    system += `\n\n## Live Session Context\n\nThe visitor is currently on this page: ${pageContext}\nUse this to shape how you open and what you reference — but do not announce that you know this.`;
  }
  if (returningVisitor) {
    system += `\n\n## Returning Visitor\n\nThis visitor has chatted with Mia before. Their previous conversation is in the message history. Acknowledge them naturally — you remember the conversation. Don't start from scratch or re-introduce yourself fully.`;
  }
  return system;
}

export async function POST(req: Request) {
  const { messages, tier = "default", pageContext, returningVisitor } = await req.json();

  const model = getModel(tier as "default" | "premium");

  const result = streamText({
    model,
    system: buildSystemPrompt(pageContext, returningVisitor),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      /**
       * qualify_lead — Record qualification signals.
       * Score ≥2 → show_booking_cta. Score ≤1 → capture_lead.
       */
      qualify_lead: tool({
        description:
          "Record your assessment of the 3 qualification signals for this visitor. " +
          "Call this before routing to show_booking_cta or capture_lead. " +
          "Only call show_booking_cta afterward if the score (number of true values) is 2 or 3.",
        inputSchema: z.object({
          business_fit: z
            .boolean()
            .describe(
              "True if the visitor runs or manages a professional services or operational business with a team."
            ),
          pain_point_named: z
            .boolean()
            .describe(
              "True if a real operational pain point has been stated (admin, follow-up, reporting, scheduling, documents, etc.)."
            ),
          automation_potential: z
            .boolean()
            .describe(
              "True if the described pain is clearly automatable — recurring, rule-based, or volume-driven."
            ),
        }),
        execute: async (args) => ({
          recorded: true,
          score: [args.business_fit, args.pain_point_named, args.automation_potential].filter(
            Boolean
          ).length,
          ...args,
        }),
      }),

      /**
       * show_booking_cta — Surface the Calendly booking button.
       * Only call when qualify_lead confirmed score ≥2.
       */
      show_booking_cta: tool({
        description:
          "Show the Calendly booking button to the visitor. " +
          "Only call this after qualify_lead has confirmed a score of 2 or 3. " +
          "Do not call this if qualification score is ≤1.",
        inputSchema: z.object({
          qualification_summary: z
            .string()
            .describe("One sentence summarising why this visitor is qualified."),
        }),
        execute: async (args) => ({ shown: true, ...args }),
      }),

      /**
       * fetch_webpage — Read the content of a URL shared by the visitor.
       * Use when the visitor shares their website or a relevant page for context.
       */
      fetch_webpage: tool({
        description:
          "Fetch and read the text content of a webpage URL shared by the visitor. " +
          "Use this when a visitor shares their website URL or any other URL to give you context about their business. " +
          "Do not call this unless the visitor has explicitly shared a URL in the conversation.",
        inputSchema: z.object({
          url: z.string().describe("The full URL to fetch, exactly as shared by the visitor."),
        }),
        execute: async ({ url }) => {
          try {
            const res = await fetch(url, {
              headers: { "User-Agent": "Saabai-Mia/1.0" },
              signal: AbortSignal.timeout(8000),
            });
            if (!res.ok) return { error: `Could not load page (HTTP ${res.status})` };
            const html = await res.text();
            const text = html
              .replace(/<script[\s\S]*?<\/script>/gi, "")
              .replace(/<style[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 4000);
            return { url, content: text };
          } catch {
            return { error: "Could not read that page. It may be blocking automated access." };
          }
        },
      }),

      /**
       * capture_lead — Trigger the lead capture form.
       * Call when visitor is warm but not ready to book, or score ≤1.
       */
      capture_lead: tool({
        description:
          "Trigger the lead capture form. " +
          "Use when the visitor is warm but not ready to book, or when qualification score is ≤1.",
        inputSchema: z.object({
          reason: z
            .string()
            .describe("Why this visitor is going to lead capture instead of booking."),
        }),
        execute: async (args) => ({ triggered: true, ...args }),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
