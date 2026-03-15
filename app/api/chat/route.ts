import { streamText, tool, stepCountIs, convertToModelMessages } from "ai";
import { z } from "zod";
import { getModel } from "../../../lib/chat-config";
import { SYSTEM_PROMPT } from "../../../lib/chat-prompt";

export const runtime = "edge";
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, tier = "default" } = await req.json();

  const model = getModel(tier as "default" | "premium");

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
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
