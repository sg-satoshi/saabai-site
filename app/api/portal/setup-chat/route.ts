import { streamText, stepCountIs, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { verifySession } from "../../../../lib/portal-session";

export const runtime = "nodejs";
export const maxDuration = 60;

function parseCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) === name) return trimmed.slice(eq + 1);
  }
  return undefined;
}

const SYSTEM_PROMPT = `You are a specialist AI agent setup consultant for Saabai — a company that builds AI legal intake agents for law firms. Your job is to interview the lawyer or firm owner in a friendly, efficient conversation to extract everything needed to configure their Lex agent to sound and behave exactly like them.

Your goal: gather rich, specific information across these areas through natural conversation — NOT a form.

AREAS TO COVER (work through these naturally, not as a checklist):
1. Who they are: name, firm name, years of practice, practice areas and specialties
2. Their ideal client: who they most want to attract and serve
3. Their communication style: how formal/casual, how warm, do they use humour, how long are their responses
4. Their primary goal for Lex: book consultations? qualify leads? educate clients? capture after-hours enquiries?
5. What a successful conversation looks like for them
6. Language rules: anything Lex should always say? Never say? Phrases that would embarrass them?
7. Their background and philosophy: what shaped their legal worldview? What makes them different?

RULES:
- Ask ONE focused question at a time. Never ask multiple questions in one message.
- Be warm and conversational. This should feel like a smart colleague asking good questions, not an interrogation.
- When you get a useful answer, briefly acknowledge it before moving on.
- Use their name if they've given it.
- Aim to complete the core setup in 7-10 exchanges.
- Call the saveConfig tool EVERY TIME you extract useful information — don't wait until the end.
- When you've covered the key areas, give a brief friendly summary of what you've captured and tell them they can now hit "Save Configuration" to apply it, then tweak anything in the form below.
- Do NOT use markdown stars (**bold**) or em dashes. Plain conversational text only.
- Do NOT use bullet points or numbered lists in your messages. Prose only.

Start by welcoming them warmly, explaining this takes about 5 minutes, and asking their name and firm.`;

const configSchema = z.object({
  firmName:          z.string().optional().describe("The law firm's name"),
  agentName:         z.string().optional().describe("What to name the AI agent (default: Lex)"),
  welcomeMessage:    z.string().optional().describe("The agent's opening greeting message"),
  primaryGoal:       z.string().optional().describe("The firm's primary business goal for the agent"),
  successDefinition: z.string().optional().describe("What a successful conversation looks like"),
  targetClient:      z.string().optional().describe("Description of the ideal client"),
  desiredOutcomes:   z.array(z.string()).optional().describe("List of desired outcomes from conversations"),
  formalityLevel:    z.number().min(0).max(100).optional().describe("Formality 0=very casual, 100=very formal"),
  warmthLevel:       z.number().min(0).max(100).optional().describe("Warmth 0=cold/clinical, 100=very warm"),
  humorLevel:        z.number().min(0).max(100).optional().describe("Use of humour 0=none, 100=frequent"),
  responseLength:    z.enum(["concise", "balanced", "detailed"]).optional().describe("How long responses should be"),
  personalityTraits: z.array(z.string()).optional().describe("Personality traits e.g. Professional, Empathetic, Direct"),
  alwaysSay:         z.array(z.string()).optional().describe("Phrases or things the agent must always do/say"),
  neverSay:          z.array(z.string()).optional().describe("Things the agent must never say or do"),
  practiceFocus:     z.string().optional().describe("Practice areas and specialties"),
  careerBackground:  z.string().optional().describe("Career background and history"),
  birthYear:         z.string().optional().describe("Birth year for generational context"),
  legalPhilosophy:   z.string().optional().describe("Legal philosophy and worldview"),
  formativeInfluences: z.string().optional().describe("Books, mentors, cases that shaped them"),
  skillPacks:        z.array(z.string()).optional().describe("Skill packs to enable e.g. Lead Capture, Consultation Booking"),
});

type ConfigInput = z.infer<typeof configSchema>;
type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const sessionToken = parseCookie(req.headers.get("cookie"), "portal_session");
  const session = sessionToken ? verifySession(sessionToken) : null;
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { messages?: Msg[] };
  const messages: Msg[] = Array.isArray(body.messages) ? body.messages : [];

  const model = anthropic("claude-sonnet-4-6");

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages,
    stopWhen: stepCountIs(5),
    tools: {
      saveConfig: tool({
        description: "Save extracted configuration fields. Call this whenever you learn useful information — don't wait until the end.",
        inputSchema: configSchema,
        execute: async (config: ConfigInput): Promise<{ saved: boolean; fields: string[] }> => {
          const fields = Object.keys(config).filter(k => (config as Record<string, unknown>)[k] !== undefined);
          return { saved: true, fields };
        },
      }),
    },
  });

  // Stream text-delta + config-update events
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "text-delta", delta: part.text })}\n\n`)
            );
          } else if (part.type === "tool-result" && part.toolName === "saveConfig") {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "config-update", config: part.input })}\n\n`)
            );
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[setup-chat] stream error:", msg);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
