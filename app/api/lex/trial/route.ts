/**
 * Lex invite-only free trial (60 days, no card, no Stripe).
 * GET ?code=  -> { valid } (same answer for unknown, expired, used up and revoked codes)
 * POST {code, name, email, firmName, phone?, abn?, acceptTerms, website(honeypot)} -> creates the trial firm and login.
 * Public (new firms have no login). Rate limited in proxy (lib/form-guard). Never call on production from agents.
 */
import { NextRequest, NextResponse } from "next/server";
import { validateSignup } from "@/lib/lex-subscription";
import { lexMailer } from "@/lib/lex-subscription-emails";
import { checkInvite, startTrial, TRIAL_DAYS } from "@/lib/lex-trial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
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
    const r = await startTrial(v.value, body.code, lexMailer);
    if (!r.ok) return NextResponse.json({ error: r.error, field: r.field }, { status: 400 });
    return NextResponse.json({ ok: true, trialEndsAt: r.firm.trialEndsAt });
  } catch (err) {
    console.error("[lex trial]", err instanceof Error ? err.name : "error");
    return NextResponse.json({ error: "Could not start your trial. Please try again." }, { status: 500 });
  }
}
