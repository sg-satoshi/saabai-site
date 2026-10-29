/**
 * Lex Firm plan seats. GET: the caller's firm plan (seats, members, billing status).
 * POST {action:"invite"|"revoke", email}: firm admin (the signer) only. Caller comes from signed cookies.
 */
import { resolveReviewActor } from "@/lib/lex-review-access";
import { LEX_SEAT_CAP, firmByEmail, inviteMember, revokeMember, seatsUsed } from "@/lib/lex-subscription";
import { lexMailer } from "@/lib/lex-subscription-emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function load(req: Request) {
  const actor = await resolveReviewActor(req);
  if (!actor || actor.kind !== "firm") return null;
  const firm = await firmByEmail(actor.email);
  return firm ? { firm, email: actor.email, isAdmin: firm.adminEmail === actor.email } : { firm: null, email: actor.email, isAdmin: false };
}

function view(f: NonNullable<Awaited<ReturnType<typeof firmByEmail>>>, isAdmin: boolean) {
  return {
    plan: "firm", firmName: f.firmName, isAdmin, status: f.status, graceUntil: f.graceUntil ?? null,
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
      const r = await inviteMember(ctx.firm, email, lexMailer);
      if (!r.ok) return Response.json({ error: r.error, cap: !!r.cap, ...view(ctx.firm, true) }, { status: r.cap ? 409 : 400 });
    } else if (body.action === "revoke") {
      const r = await revokeMember(ctx.firm, email);
      if (!r.ok) return Response.json({ error: r.error }, { status: 400 });
    } else {
      return Response.json({ error: "Unknown action" }, { status: 400 });
    }
    return Response.json(view(ctx.firm, true));
  } catch (err) {
    console.error("[lex team]", err instanceof Error ? err.name : err);
    return Response.json({ error: "Could not update seats" }, { status: 500 });
  }
}
