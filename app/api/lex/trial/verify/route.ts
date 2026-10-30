/**
 * POST /api/lex/trial/verify {token}: the owner confirmed their email; start the 60-day trial.
 * POST (not GET) so link scanners can't start a trial. Rate limited per IP in form-guard (/api/lex/trial prefix).
 */
import { NextRequest, NextResponse } from "next/server";
import { lexMailer } from "@/lib/lex-subscription-emails";
import { activateTrial } from "@/lib/lex-trial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { token?: unknown } | null;
  try {
    const r = await activateTrial(body?.token, lexMailer);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ ok: true, trialEndsAt: r.firm.trialEndsAt });
  } catch (err) {
    console.error("[lex trial verify]", err instanceof Error ? err.name : "error");
    return NextResponse.json({ error: "Could not start your trial. Please try again." }, { status: 500 });
  }
}
