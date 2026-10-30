/**
 * Lex free trial, open self-serve (60 days, no card, no Stripe, never auto-converts to paid).
 * GET ?code=  -> { valid } (optional tracking code; same answer for unknown, expired, used up and revoked)
 * POST {code?, name, email, firmName, phone?, abn?, acceptTerms, website(honeypot)} -> emails a confirm link.
 * The trial starts at POST /api/lex/trial/verify {token}. One trial per firm (email domain; full email for webmail).
 * Public (new firms have no login). Rate limited in proxy (lib/form-guard). Never call on production from agents.
 */
import { NextRequest, NextResponse } from "next/server";
import { validateSignup } from "@/lib/lex-subscription";
import { checkInvite, requestTrial, TRIAL_DAYS } from "@/lib/lex-trial";
import { sendTrialVerifyEmail } from "@/lib/lex-subscription-emails";
import { siteUrl } from "@/lib/billing/stripe-ops";
import { getRedis } from "@/lib/redis";

/** GET code checks: 30 an hour per IP (POST is limited in form-guard). */
export const CHECKS_PER_HOUR = 30;
async function checkLimited(req: NextRequest): Promise<boolean> {
  const r = getRedis();
  if (!r) return false;
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  const k = `lex:trial:check:${ip.slice(0, 64)}`;
  const n = Number(await r.incr(k));
  if (n === 1) await r.expire(k, 3600);
  return n > CHECKS_PER_HOUR;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    if (await checkLimited(req)) return NextResponse.json({ valid: false, error: "Too many attempts. Please try again later." }, { status: 429 });
    const chk = await checkInvite(req.nextUrl.searchParams.get("code"));
    return NextResponse.json({ valid: chk.ok, days: TRIAL_DAYS, ...(chk.ok ? {} : { error: chk.error }) });
  } catch {
    return NextResponse.json({ valid: false, error: "Could not check the code" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const v = validateSignup(body);
  if (!v.ok) return NextResponse.json({ error: v.error, field: v.field }, { status: 400 });
  try {
    // Open self-serve: the code is optional. Nothing starts until the owner clicks the emailed link.
    const r = await requestTrial(v.value, body.code, sendTrialVerifyEmail, siteUrl());
    if (!r.ok) return NextResponse.json({ error: r.error, field: r.field }, { status: 400 });
    return NextResponse.json({ ok: true, verify: true });
  } catch (err) {
    console.error("[lex trial]", err instanceof Error ? err.name : "error");
    return NextResponse.json({ error: "Could not start your trial. Please try again." }, { status: 500 });
  }
}
