/**
 * Lex Firm plan seats. GET: the caller's firm plan (seats, members, billing status).
 * POST {action:"invite"|"revoke", email}: firm admin (the signer) only. Caller comes from signed cookies.
 */
import { resolveSessionEmail } from "@/lib/lex-review-access";
import { LEX_SEAT_CAP, firmByEmail, inviteMember, revokeMember, seatsUsed } from "@/lib/lex-subscription";
import { lexMailer } from "@/lib/lex-subscription-emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function load(req: Request) {
  // Session email without requiring 'lex': a lapsed firm's owner must still see the plan and reach billing.
  const email = await resolveSessionEmail(req);
  if (!email) return null;
  const firm = await firmByEmail(email);
  return firm ? { firm, email, isAdmin: firm.adminEmail === email } : { firm: null, email, isAdmin: false };
}

function view(f: NonNullable<Awaited<ReturnType<typeof firmByEmail>>>, isAdmin: boolean) {
  return {
    plan: "firm", firmName: f.firmName, isAdmin, status: f.status, lapseReason: f.lapseReason ?? null, graceUntil: f.graceUntil ?? null,
    cancelAtPeriodEnd: !!f.cancelAtPeriodEnd, periodEnd: f.periodEnd ?? null,
    seats: { used: seatsUsed(f), cap: LEX_SEAT_CAP },
    admin: f.adminEmail, members: isAdmin ? f.members : [],
  };
}

export async function GET(req: Request) {
  try {
    const ctx = await load(req);
    if (!ctx) return Response.json({ plan: null }, { status: 401 });
    if (!ctx.firm) return Response.json({ plan: null });
    return Response.json(view(ctx.firm, ctx.isAdmin));
  } catch (err) {
    console.error("[lex team]", err instanceof Error ? err.name : err);
    return Response.json({ error: "Could not load your plan" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: { action?: string; email?: unknown };
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email : "";
  try {
    const ctx = await load(req);
    if (!ctx?.firm || !ctx.isAdmin) return Response.json({ error: "Only the account owner can manage seats" }, { status: 403 });
    if (body.action === "invite") {
      const r = await inviteMember(ctx.firm.firmId, email, lexMailer);
      if (!r.ok) return Response.json({ error: r.error, cap: !!r.cap, ...view(r.firm ?? ctx.firm, true) }, { status: r.cap ? 409 : 400 });
      return Response.json(view(r.firm, true));
    } else if (body.action === "revoke") {
      const r = await revokeMember(ctx.firm.firmId, email);
      if (!r.ok) return Response.json({ error: r.error }, { status: 400 });
      return Response.json(view(r.firm ?? ctx.firm, true));
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[lex team]", err instanceof Error ? err.name : err);
    return Response.json({ error: "Could not update seats" }, { status: 500 });
  }
}
