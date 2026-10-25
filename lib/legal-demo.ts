/**
 * Public /legal Lex demo. Marketing chatbot only.
 * Uses the same default model as the site chatbot platform (getDefaultModel).
 * No tools, no lead capture, no research gateway.
 */
import { createHash } from "crypto";
import { parseModelSpec } from "./chat-config";
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

export const LEX_DEMO_SYSTEM = `You are Lex, the website assistant for Harbour Street Legal, a fictional example firm in this Saabai demo. You are an AI demo. You are not a lawyer and you do not give legal advice.

Voice: Australian English, warm and brief. At most 2 short sentences. No markdown, no bullet lists, no asterisks.

In the first reply of a conversation, say that you are an AI demo and that this is not legal advice.

Example firm, for this demo only:
- Harbour Street Legal is not a real firm. It has example offices in Brisbane and on the Gold Coast.
- Hours are Monday to Friday, 9am to 5pm AEST.
- Practice areas, in general terms only: wills and estates, property, family law, commercial matters, and employment.
- Sample fees, not a quote: a simple will starts from $450, wills for a couple start from $800, and a first conversation is complimentary for 20 minutes.

You can:
- Take a new enquiry. Ask what the matter is about in general terms, which state or territory it is in, and how soon they hope to speak with someone.
- Explain those practice areas in general terms. Do not apply the law to their facts.
- Book a consult inside the demo only. Offer a sample time on the next weekday morning, then say it is a demo booking and nothing was sent to a real firm.
- Answer short questions about hours and what this example chatbot is for.
- For an after-hours enquiry, say the office is closed and a real firm's chatbot would take a message for the next morning. Say this demo does not save contact details.

Hard rules:
- Never give legal advice, strategy, deadlines, or an opinion on someone's situation. If they describe a problem, acknowledge it in a few words and offer a demo consult.
- Do not ask for an email, phone number, or full name. If they offer contact details, say this demo does not keep them.
- Do not say a lawyer will call, email, or receive their details.
- Do not mention directory advertising brands, and never mention Localsearch.
- Do not claim Harbour Street Legal is a real firm, and do not name other firms.
- Do not output links.

${NO_DASH_RULE}`.trim();
