import { NextRequest, NextResponse } from "next/server";
import type { Redis } from "@upstash/redis";

// Public chat endpoints guarded by per-IP rate limits and size caps.
export const CHAT_API = [
  "/api/chat", // Mia (saabai.ai)
  "/api/lex-chat",
  "/api/lex-help", // in-app Lex Assist (signed in; same per-IP limits and size caps as Lex chat)
  "/api/lmm-chat",
  "/api/nextinvestment-chat",
  "/api/tributum-chat",
  "/api/nico-chat",
  "/api/bo-chat",
  "/api/leadgen/chat",
  "/api/ai-agent/chat",
  "/api/site-factory-chat",
  "/api/site-factory/chat",
  "/api/chat-platform/message",
  "/api/legal-demo",
];

const num = (v: string | undefined, d: number) => (v && Number(v) > 0 ? Number(v) : d);
const SHORT_LIMIT = num(process.env.CHAT_RL_SHORT_LIMIT, 20);
const SHORT_WINDOW = 10 * 60; // seconds
const DAY_LIMIT = num(process.env.CHAT_RL_DAY_LIMIT, 100);
const MAX_MSG_CHARS = num(process.env.CHAT_MAX_MSG_CHARS, 2000);
const MAX_HISTORY = num(process.env.CHAT_MAX_HISTORY, 40);
const MAX_BODY_BYTES = 64 * 1024;

const RATE_MSG =
  "You've sent quite a few messages in a short time, so I'm taking a quick breather. Please try again in a few minutes, or reach out to the team directly.";
const DAY_MSG =
  "You've reached today's chat limit. Please come back tomorrow, or contact the team directly and they'll be happy to help.";
const LONG_MSG = `That message is a bit long for me. Could you shorten it to under ${MAX_MSG_CHARS} characters?`;
const HISTORY_MSG =
  "This conversation has got quite long. Please refresh the page to start a fresh chat.";

function friendly(content: string, status: number, retryAfter?: number) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  };
  if (retryAfter) headers["Retry-After"] = String(retryAfter);
  // `content` is what every widget renders; `error` keeps API clients informed.
  return NextResponse.json({ content, text: content, error: content }, { status, headers });
}

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function textOf(m: unknown): string {
  if (!m || typeof m !== "object") return "";
  const o = m as { content?: unknown; parts?: unknown; text?: unknown };
  if (typeof o.content === "string") return o.content;
  if (typeof o.text === "string") return o.text;
  if (Array.isArray(o.parts))
    return o.parts.map((p) => (p && typeof p === "object" && typeof (p as { text?: unknown }).text === "string" ? (p as { text: string }).text : "")).join("");
  return "";
}

/** Returns a response to short-circuit with, or null to let the request through. */
export async function chatGuard(req: NextRequest, redis: Redis): Promise<NextResponse | null> {
  if (req.method !== "POST") return null;

  // ── Size caps ──
  let raw = "";
  try {
    raw = await req.clone().text();
  } catch {
    return null;
  }
  if (raw.length > MAX_BODY_BYTES) return friendly(HISTORY_MSG, 413);
  try {
    const body = JSON.parse(raw || "{}");
    const msgs: unknown[] = Array.isArray(body?.messages) ? body.messages : [];
    if (msgs.length > MAX_HISTORY) return friendly(HISTORY_MSG, 413);
    const userMsgs = msgs.filter((m) => (m as { role?: string })?.role === "user");
    const latest = typeof body?.message === "string" ? body.message : textOf(userMsgs[userMsgs.length - 1]);
    if (latest.length > MAX_MSG_CHARS) return friendly(LONG_MSG, 413);
  } catch {
    // Not JSON; let the route return its own error.
  }

  // ── Per-IP rate limits (fail open if Redis is unavailable) ──
  try {
    const ip = clientIp(req);
    const now = Math.floor(Date.now() / 1000);
    const shortKey = `chat-rl:10m:${ip}:${Math.floor(now / SHORT_WINDOW)}`;
    const dayKey = `chat-rl:day:${ip}:${new Date().toISOString().slice(0, 10)}`;
    const p = redis.pipeline();
    p.incr(shortKey);
    p.expire(shortKey, SHORT_WINDOW + 60);
    p.incr(dayKey);
    p.expire(dayKey, 26 * 3600);
    const [shortCount, , dayCount] = (await p.exec()) as [number, unknown, number, unknown];
    if (dayCount > DAY_LIMIT) return friendly(DAY_MSG, 429, 3600);
    if (shortCount > SHORT_LIMIT) return friendly(RATE_MSG, 429, SHORT_WINDOW - (now % SHORT_WINDOW));
  } catch (e) {
    console.error("chat rate limit check failed (allowing):", e);
  }
  return null;
}
