import { streamText, tool, stepCountIs, convertToModelMessages, type SystemModelMessage } from "ai";
import { z } from "zod";
import { getSaabaiModel } from "../../../lib/chat-config";
import { SYSTEM_PROMPT } from "../../../lib/chat-prompt";
import { saveLead, saveConversation } from "../../../lib/redis";

export const runtime = "edge";
export const maxDuration = 30;

function buildSystemPrompt(pageContext?: string, returningVisitor?: boolean, visitorProfile?: Record<string, unknown>): string {
  let system = SYSTEM_PROMPT;
  if (pageContext) {
    system += `\n\n## Live Session Context\n\nThe visitor is currently on this page: ${pageContext}\nUse this to shape how you open and what you reference — but do not announce that you know this.`;
  }
  if (returningVisitor) {
    system += `\n\n## Returning Visitor\n\nThis visitor has chatted with Mia before. Their previous conversation is in the message history. Acknowledge them naturally — you remember the conversation. Don't start from scratch or re-introduce yourself fully.`;
  }
  if (visitorProfile && Object.keys(visitorProfile).filter(k => k !== "updatedAt").length > 0) {
    const { updatedAt, ...facts } = visitorProfile;
    void updatedAt;
    system += `\n\n## Known Visitor Facts\n\nYou already know the following about this visitor from a previous conversation. Use it naturally — don't re-ask things you already know, and reference these details as if you've always known them:\n${JSON.stringify(facts, null, 2)}`;
  }
  return system;
}

export async function POST(req: Request) {
  const { messages, tier = "default", pageContext, returningVisitor, visitorProfile } = await req.json();

  const model = getSaabaiModel();

  // Accumulate tool results for storage after stream completes
  const sessionData: {
    visitorFacts: Record<string, unknown>;
    qualScore?: number;
    outcome?: "booked" | "lead_captured" | "browsing" | "qualified";
    qualArgs?: Record<string, boolean>;
    captureReason?: string;
  } = { visitorFacts: {} };

  const cachedSystem: SystemModelMessage = {
    role: "system",
    content: buildSystemPrompt(pageContext, returningVisitor, visitorProfile),
    providerOptions: {
      anthropic: { cacheControl: { type: "ephemeral" } },
    },
  };

  const result = streamText({
    model,
    system: cachedSystem,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(3),
    onFinish: async () => {
      // Save conversation + lead after stream completes
      const msgCount = messages.length + 1;
      const hasData = Object.keys(sessionData.visitorFacts).length > 0 || sessionData.qualScore !== undefined;

      if (hasData || sessionData.outcome) {
        // Save conversation summary
        await saveConversation({
          visitorFacts: sessionData.visitorFacts,
          qualificationScore: sessionData.qualScore,
          outcome: sessionData.outcome ?? "browsing",
          messageCount: msgCount,
          pageContext: pageContext ?? "/",
          keyTopics: Object.keys(sessionData.visitorFacts).filter(k => sessionData.visitorFacts[k]),
        });

        // Save lead record if we have meaningful data
        if (Object.keys(sessionData.visitorFacts).length > 0 || sessionData.outcome === "booked" || sessionData.outcome === "lead_captured") {
          await saveLead({
            name: sessionData.visitorFacts.name as string | undefined,
            business: sessionData.visitorFacts.business as string | undefined,
            industry: sessionData.visitorFacts.industry as string | undefined,
            team_size: sessionData.visitorFacts.team_size as string | undefined,
            pain_points: sessionData.visitorFacts.pain_points as string[] | undefined,
            qualification_score: sessionData.qualScore,
            business_fit: sessionData.qualArgs?.business_fit,
            pain_point_named: sessionData.qualArgs?.pain_point_named,
            automation_potential: sessionData.qualArgs?.automation_potential,
            outcome: sessionData.outcome ?? "browsing",
            page: pageContext ?? "/",
            messages: msgCount,
          });
        }
      }
    },
    tools: {
      remember_visitor: tool({
        description:
          "Save key facts about this visitor to persistent memory so future conversations can reference them. " +
          "Call this as soon as you learn their name, what kind of business they run, their industry, team size, or main pain points. " +
          "You can call it multiple times as you learn more.",
        inputSchema: z.object({
          name: z.string().optional().describe("Visitor's first name or full name"),
          business: z.string().optional().describe("What their business does, in one sentence"),
          industry: z.string().optional().describe("Their industry (e.g. accounting, real estate, law, construction)"),
          team_size: z.string().optional().describe("Their team size, e.g. '12 people', 'small team of 3'"),
          pain_points: z.array(z.string()).optional().describe("Key pain points or challenges they've mentioned"),
        }),
        execute: async (args) => {
          Object.assign(sessionData.visitorFacts, args);
          return { saved: true, ...args };
        },
      }),

      qualify_lead: tool({
        description:
          "Record your assessment of the 3 qualification signals for this visitor. " +
          "Call this before routing to show_booking_cta or capture_lead. " +
          "Only call show_booking_cta afterward if the score (number of true values) is 2 or 3.",
        inputSchema: z.object({
          business_fit: z.boolean().describe("True if the visitor runs or manages a professional services or operational business with a team."),
          pain_point_named: z.boolean().describe("True if a real operational pain point has been stated (admin, follow-up, reporting, scheduling, documents, etc.)."),
          automation_potential: z.boolean().describe("True if the described pain is clearly automatable — recurring, rule-based, or volume-driven."),
        }),
        execute: async (args) => {
          const score = [args.business_fit, args.pain_point_named, args.automation_potential].filter(Boolean).length;
          sessionData.qualScore = score;
          sessionData.qualArgs = args;
          if (score >= 2) sessionData.outcome = "qualified";
          return { recorded: true, score, ...args };
        },
      }),

      show_booking_cta: tool({
        description:
          "Show the Calendly booking button to the visitor. " +
          "Only call this after qualify_lead has confirmed a score of 2 or 3. " +
          "Do not call this if qualification score is ≤1.",
        inputSchema: z.object({
          qualification_summary: z.string().describe("One sentence summarising why this visitor is qualified."),
        }),
        execute: async (args) => {
          sessionData.outcome = "booked";
          return { shown: true, ...args };
        },
      }),

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

      capture_lead: tool({
        description:
          "Trigger the lead capture form. " +
          "Use when the visitor is warm but not ready to book, or when qualification score is ≤1.",
        inputSchema: z.object({
          reason: z.string().describe("Why this visitor is going to lead capture instead of booking."),
        }),
        execute: async (args) => {
          sessionData.outcome = "lead_captured";
          sessionData.captureReason = args.reason;
          return { triggered: true, ...args };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
