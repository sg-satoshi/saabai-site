import { streamText, tool, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { LEX_KNOWLEDGE } from "../../../lib/lex-knowledge";
import { getPortalSettings, buildSystemPromptAddition } from "../../../lib/portal-config";

export const runtime = "nodejs";
export const maxDuration = 60;

// Tributum Law team email — used to look up portal configuration in Redis
const TRIBUTUM_TEAM_EMAIL = "hello@tributumlaw.com";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.tributumlaw.com";

const SYSTEM_PROMPT = `FORMATTING RULES -- READ THESE FIRST, FOLLOW THEM IN EVERY SINGLE RESPONSE:

1. Never use em dashes. Not a single one. The knowledge base contains em dashes for its own structure -- do not copy that style into your responses. Use a comma or a full stop instead, or rewrite the sentence.

2. Never use asterisks, bold, headers (##), bullet points with *, or any markdown symbols. They render as raw characters.

3. Every 1 to 2 sentences gets its own paragraph. Press enter twice. No walls of text -- ever.

4. When listing items, give each item its own short paragraph. Do not chain them together with em dashes or run them into a single block.

5. Keep responses short. One to three paragraphs is almost always enough. If someone asks what areas you cover, give 3 to 4 sentences -- not a full catalogue.

---

You are Lex, a sophisticated AI legal assistant representing Tributum Law, an Australian law firm specialising in tax law, international structures, and estate planning. You operate on their website and speak on behalf of the firm.

You are sharp, precise, and authoritative -- like a brilliant senior tax lawyer who can explain complex concepts clearly without being condescending. You are warm but professional, and distinctly Australian in sensibility: direct, no unnecessary formality, but deeply serious about the law.

You do not hedge endlessly. You give substantive, genuinely useful answers and are clear about when something requires proper advice.

Your role:

1. Answer questions about Australian and international tax law, estate planning, and asset protection.

2. Help visitors understand their situation and the key issues involved.

3. Identify when a matter is complex enough to require professional legal advice.

4. Route high-value enquiries toward a Tributum Law consultation.

5. Capture contact details from interested visitors.

How to handle questions:

Answer concisely. One or two short paragraphs is usually right. Use plain language but do not dumb it down. These are often sophisticated clients.

Gather the visitor's name, jurisdiction (state or country), and matter type naturally and early. Use it to personalise your responses.

Never make up cases, legislation, or rulings. Only refer to what is in the knowledge base. If something is outside your knowledge, say so honestly.

Disclaimer approach:

Apply it naturally. Do not paste a boilerplate on every message. Weave it in once when the conversation moves into substantive territory. Use framing like "as general information" or "in broad terms" rather than robotic legal notices.

Routing triggers -- proactively suggest a Tributum consultation when you detect:

International relocation to or from Australia, especially UAE, Singapore, USA, or UK.

Business sale or significant exit.

Deceased estate with foreign assets.

Offshore account compliance concerns.

Trust restructuring or disputes.

Estate planning for material assets (estate over $1m).

Cross-border employment or SMSF structuring.

Foreign investment into Australia (FIRB).

When routing, be specific: "This is exactly the kind of matter Tributum Law handles regularly -- would you like to book a consultation?"

When routing, be specific: "This is exactly the kind of matter Tributum Law handles regularly — would you like to book a consultation?"

Contact: hello@tributumlaw.com | https://tributumlaw.com/contact-us

---

## KNOWLEDGE BASE

${LEX_KNOWLEDGE}`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Fetch portal settings for Tributum Law and build an enhanced system prompt
  let systemPrompt = SYSTEM_PROMPT;
  try {
    const portalSettings = await getPortalSettings(TRIBUTUM_TEAM_EMAIL);
    if (portalSettings) {
      systemPrompt = SYSTEM_PROMPT + buildSystemPromptAddition(portalSettings);
    }
  } catch {
    // Non-fatal — fall back to base system prompt if Redis is unavailable
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: systemPrompt,
    messages,
    temperature: 0.3,
    stopWhen: stepCountIs(5),
    tools: {
      captureLead: tool({
        description:
          "Capture the visitor's contact details when they express interest in speaking with Tributum Law. " +
          "Call this when the visitor provides their name, email, or other contact information, or when they " +
          "ask about booking a consultation. Capture as much detail as is available — name and email at minimum.",
        inputSchema: z.object({
          name: z.string().describe("The visitor's full name or first name"),
          email: z.string().email().describe("The visitor's email address"),
          phone: z.string().optional().describe("The visitor's phone number if provided"),
          matterType: z
            .string()
            .describe(
              "Brief description of the legal matter, e.g. 'International relocation to UAE', 'Business sale CGT', 'Estate planning with overseas assets'"
            ),
          jurisdiction: z
            .string()
            .optional()
            .describe("The visitor's jurisdiction — Australian state or country"),
          notes: z.string().optional().describe("Any other relevant context from the conversation"),
        }),
        execute: async (args) => {
          try {
            await fetch(`${BASE_URL}/api/lex-leads`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                source: "lex_chat",
                timestamp: new Date().toISOString(),
                ...args,
              }),
            });
          } catch {
            // Non-fatal — don't surface errors to the user
          }
          return {
            captured: true,
            name: args.name,
            message:
              "Lead captured successfully. The Tributum Law team will be in touch.",
          };
        },
      }),

      suggestConsultation: tool({
        description:
          "Generate a consultation prompt when the visitor's matter is complex enough to require professional advice. " +
          "Use this when you detect high-value signals: international relocation, business sale, estate with foreign assets, " +
          "offshore compliance, trust restructuring, or any matter involving material financial stakes. " +
          "This returns structured booking information to present to the visitor.",
        inputSchema: z.object({
          reason: z
            .string()
            .describe(
              "Why this matter warrants a consultation — one clear sentence, e.g. 'This involves a deemed disposal event under CGT Event I1 and requires careful analysis before you leave Australia.'"
            ),
          urgency: z
            .enum(["immediate", "soon", "when_ready"])
            .describe(
              "'immediate' if there is a time-sensitive event (e.g. imminent departure, pending transaction); 'soon' for matters that should be addressed in weeks; 'when_ready' for general planning"
            ),
        }),
        execute: async (args) => {
          return {
            consultationSuggested: true,
            reason: args.reason,
            urgency: args.urgency,
            bookingUrl: "https://tributumlaw.com/contact-us",
            email: "hello@tributumlaw.com",
            message:
              urgencyMessage(args.urgency) +
              " You can book a confidential consultation at https://tributumlaw.com/contact-us or email hello@tributumlaw.com.",
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}

function urgencyMessage(urgency: "immediate" | "soon" | "when_ready"): string {
  switch (urgency) {
    case "immediate":
      return "Given the timing involved, I'd strongly recommend speaking with Tributum Law as soon as possible.";
    case "soon":
      return "This is worth addressing in the near term — the right structure now can make a material difference.";
    case "when_ready":
      return "When you're ready to move forward, Tributum Law would be well placed to advise on this.";
  }
}
