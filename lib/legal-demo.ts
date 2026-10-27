/**
 * Public /legal Lex demo. Marketing chatbot only.
 * Uses the same default model as the site chatbot platform (getDefaultModel).
 * No tools, no lead capture, no research gateway.
 */
import { createHash } from "crypto";
import { parseModelSpec } from "./chat-config";
import {
  HARBOUR_AREAS,
  HARBOUR_FEE_SENTENCE,
  HARBOUR_FIRM,
  HARBOUR_HOURS,
  HARBOUR_SAMPLE_TIME,
  SAABAI_ASSISTANT_FACTS,
} from "./harbour-demo-facts";
import { getRedis } from "./redis";
import { NO_DASH_RULE, noDashes } from "./no-dashes";

/** User messages allowed per visitor per UTC day. Burst limits still come from chatGuard. */
export const DEMO_DAY_CAP = 20;

/** Hard ceiling on each reply. Keeps the first answer short and the cost bounded. */
export const DEMO_MAX_OUTPUT_TOKENS = 160;

export const DEMO_UNAVAILABLE =
  "Lex is unavailable right now. You can still talk to Saabai from the button under this demo.";

export const DEMO_LIMIT =
  "You've reached today's limit for this demo. Use the button below to talk to Saabai about your firm.";

export const DEMO_FALLBACK =
  "I can help with a general enquiry, sample fees or a demo booking. I can't give legal advice.";

/** Used when a reply implies a real appointment or a person at the firm. */
export const DEMO_SAFE_CONSULT =
  "I can show a sample consult, and nothing from this chat is sent to a real firm.";

const OVERCLAIM =
  /\blawyer will\b|\bconfirmed\b|with someone at|\b(i'll|i will) (book|arrange|have)\b/i;

const KEY_BY_PROVIDER: Record<string, string[]> = {
  anthropic: ["ANTHROPIC_API_KEY"],
  openai: ["OPENAI_API_KEY"],
  google: ["GOOGLE_GENERATIVE_AI_API_KEY"],
  xai: ["XAI_API_KEY"],
  deepseek: ["AGENT_DEEPSEEK_API_KEY", "DEEPSEEK_API_KEY"],
};

/** Name of the missing server env var, or null when the configured provider has a key. */
export function missingModelKey(env: NodeJS.ProcessEnv = process.env): string | null {
  const { provider } = parseModelSpec(env.DEFAULT_CHAT_MODEL, "anthropic:claude-haiku-4-5");
  const names = KEY_BY_PROVIDER[provider];
  if (!names) return "DEFAULT_CHAT_MODEL";
  if (names.some((name) => (env[name] ?? "").trim().length > 0)) return null;
  return names[0];
}

export function demoCapState(count: number, cap = DEMO_DAY_CAP): "ok" | "capped" {
  return count > cap ? "capped" : "ok";
}

/** Stable daily id. The raw IP is not stored. */
export function demoVisitorId(ip: string, ua: string, day = new Date().toISOString().slice(0, 10)): string {
  return createHash("sha256").update(`legal-demo|${ip}|${ua}|${day}`).digest("hex").slice(0, 24);
}

export function visitorIdFrom(req: Request, day?: string): string {
  const xff = req.headers.get("x-forwarded-for");
  const ip = (xff ? xff.split(",")[0] : req.headers.get("x-real-ip") || "unknown").trim() || "unknown";
  const ua = req.headers.get("user-agent") || "";
  return demoVisitorId(ip, ua, day);
}

/**
 * Count one demo turn in Upstash, the same store chatGuard uses.
 * Returns "unmetered" when Redis is not configured or the write fails (same fail-open as chatGuard).
 */
export async function reserveDemoMessage(visitorId: string): Promise<"ok" | "capped" | "unmetered"> {
  try {
    const redis = getRedis();
    if (!redis) return "unmetered";
    const key = `legal-demo:day:${visitorId}:${new Date().toISOString().slice(0, 10)}`;
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, 26 * 3600);
    return demoCapState(Number(n));
  } catch (err) {
    console.error("[legal-demo] cap check failed (allowing):", err instanceof Error ? err.message.slice(0, 120) : "redis");
    return "unmetered";
  }
}

const BANNED_WORD = "localsearch";

/** Holds back a trailing prefix of the banned word so it never leaves the server in pieces. */
export function createBannedWordFilter(word = BANNED_WORD) {
  const target = word.toLowerCase();
  let held = "";
  let tripped = false;
  const scan = (): { text: string; banned: boolean } => {
    if (tripped) return { text: "", banned: true };
    const low = held.toLowerCase();
    if (low.includes(target)) {
      tripped = true;
      held = "";
      return { text: "", banned: true };
    }
    let keep = 0;
    const max = Math.min(held.length, target.length - 1);
    for (let i = max; i > 0; i--) {
      if (target.startsWith(low.slice(-i))) {
        keep = i;
        break;
      }
    }
    const text = held.slice(0, held.length - keep);
    held = held.slice(held.length - keep);
    return { text, banned: false };
  };
  return {
    push(delta: string) {
      if (tripped) return { text: "", banned: true };
      held += delta;
      return scan();
    },
    flush() {
      if (tripped) return { text: "", banned: true };
      const text = held;
      held = "";
      return { text, banned: text.toLowerCase().includes(target) };
    },
  };
}

export function scrubDemoText(input: string): string {
  if (!input.trim() || new RegExp(BANNED_WORD, "i").test(input)) return DEMO_FALLBACK;
  return noDashes(input).replace(/\s{2,}/g, " ").trim();
}

/** Replace a reply that sounds like a real booking or a conversation with a lawyer. */
export function guardDemoReply(input: string): string {
  const clean = scrubDemoText(input);
  if (clean === DEMO_FALLBACK || OVERCLAIM.test(clean)) return clean === DEMO_FALLBACK ? clean : DEMO_SAFE_CONSULT;
  return clean;
}

export const LEX_DEMO_SYSTEM = `You are Lex, the website assistant for Harbour Street Legal, a fictional example firm in this Saabai demo. You are an AI demo. You are not a lawyer and you do not give legal advice.

Voice: Australian English, warm, professional and brief. At most 2 short sentences, except a question about this assistant, where you may use 4. No slang. No markdown, no bullet lists, no asterisks.

The opening greeting already says you are an AI demo and that this is not legal advice. Do not repeat that disclaimer in your replies. Do not call yourself an AI, an AI demo, or an AI assistant again. Answer the question they asked.

If they only say hello, welcome them and ask what they need. Do not introduce yourself again.

If they ask for legal advice on their own matter, give one short natural redirect and offer a sample consult. Do not recite the opening disclaimer.

Example firm, for this demo only:
- ${HARBOUR_FIRM} is not a real firm. It has example offices in Brisbane and on the Gold Coast.
- Hours are ${HARBOUR_HOURS}.
- Practice areas, in general terms only: ${HARBOUR_AREAS}.
- Sample fees, not a quote: ${HARBOUR_FEE_SENTENCE}.

${SAABAI_ASSISTANT_FACTS}

Firm questions stay on the Harbour Street example above. Questions about the assistant, pricing to get one, setup or integrations use About this assistant. Lead with yes when they ask if it integrates. End that reply by telling them to book a call with Saabai, using the button on this page.

Answer these starters in this shape:
- New client enquiry: ask what the matter is about in general terms.
- Fee question: give the matching sample fee and say it is not a quote. You may add that a first conversation is complimentary for 20 minutes. Stop there. Do not mention the team, a lawyer, or their needs.
- Book a demo: the visitor is asking for a demo of Lex, not a legal consultation. Do not ask a question first. Offer ${HARBOUR_SAMPLE_TIME} as a sample time, and say it is a demo booking so nothing was sent to a real firm.
- After-hours enquiry: say the office is closed outside ${HARBOUR_HOURS}, and that this demo does not save contact details.

You may explain those practice areas in general terms. Do not apply the law to their facts.

Hard rules:
- Never give legal advice, strategy, deadlines, or an opinion on someone's situation. If they describe a problem, acknowledge it in a few words and offer a demo consult.
- Do not ask for an email, phone number, or full name. If they offer contact details, say this demo does not keep them.
- Do not say a lawyer will call, email, meet, discuss their matter, or receive their details.
- If they accept Tuesday at 10am, say the demo is only showing how a booking would look. Never say the time is confirmed, held, or booked.
- Do not mention directory advertising brands, and never mention Localsearch.
- Do not claim Harbour Street Legal is a real firm, and do not name other firms.
- Do not output links.

${NO_DASH_RULE}`.trim();
