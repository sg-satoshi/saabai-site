/**
 * Per-IP rate limits for public endpoints that send email or cost money but are not chat
 * (contact forms, access requests, TTS). Runs in proxy.ts. Fails open if Redis is down.
 * Never applied to GET/HEAD/OPTIONS.
 */
import { NextResponse, type NextRequest } from "next/server";

type Rule = { prefix: string; limit: number; windowSec: number };

export const FORM_RULES: Rule[] = [
  { prefix: "/api/tts", limit: 60, windowSec: 10 * 60 },
  { prefix: "/api/advisory-leads", limit: 10, windowSec: 60 * 60 },
  { prefix: "/api/bo-contact", limit: 10, windowSec: 60 * 60 },
  { prefix: "/api/lmm-contact", limit: 10, windowSec: 60 * 60 },
  { prefix: "/api/onboarding", limit: 10, windowSec: 60 * 60 },
  { prefix: "/api/blueprint/score", limit: 10, windowSec: 60 * 60 },
  { prefix: "/api/auth/register", limit: 10, windowSec: 60 * 60 },
  { prefix: "/api/portal/request-access", limit: 10, windowSec: 60 * 60 },
  { prefix: "/api/testimonial", limit: 10, windowSec: 60 * 60 },
  { prefix: "/api/analyze-document", limit: 30, windowSec: 60 * 60 },
  { prefix: "/api/lex-leads", limit: 10, windowSec: 60 * 60 },
  { prefix: "/api/lex/signup", limit: 10, windowSec: 60 * 60 },
];

export function formRuleFor(pathname: string): Rule | null {
  return FORM_RULES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/")) ?? null;
}

type Counter = { incr(key: string): Promise<number>; expire(key: string, sec: number): Promise<unknown> };

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/** Returns a 429 to short-circuit with, or null to let the request through. */
export async function formGuard(req: NextRequest, redis: Counter, now = Date.now()): Promise<NextResponse | null> {
  const m = req.method.toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return null;
  const rule = formRuleFor(req.nextUrl.pathname);
  if (!rule) return null;
  try {
    const sec = Math.floor(now / 1000);
    const bucket = Math.floor(sec / rule.windowSec);
    const key = `form-rl:${rule.prefix}:${clientIp(req)}:${bucket}`;
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, rule.windowSec + 60);
    if (n > rule.limit) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rule.windowSec - (sec % rule.windowSec)), "Cache-Control": "no-store" } },
      );
    }
  } catch (e) {
    console.error("form rate limit check failed (allowing):", e);
  }
  return null;
}
