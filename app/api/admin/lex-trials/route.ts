/**
 * Admin: Lex free trials. GET -> { trials, invites }. POST {action:"create", label, maxUses, expiresInDays} | {action:"revoke", code}
 * | {action:"revokeTrial", firmId} (ends a trial now).
 * Behind ADMIN_API in proxy.ts; checked again here.
 */
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "@/lib/auth";
import { firmKeyForEmail, firmUsageToday } from "@/lib/lex-review-access";
import { getFoundingConfig, setFoundingConfig, createInvite, listInvites, listTrialFirms, revokeInvite, revokeTrial, trialRow } from "@/lib/lex-trial";
import { lexMailer } from "@/lib/lex-subscription-emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function adminId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  return session && (await isAdminSession(session.clientId)) ? session.clientId : null;
}

export async function GET() {
  if (!(await adminId())) return Response.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const now = new Date();
    const firms = await listTrialFirms(now);
    const trials = await Promise.all(firms.map(async (f) => {
      const usage = await firmUsageToday(firmKeyForEmail(f.adminEmail), now).catch(() => null);
      return { ...trialRow(f, now), usageToday: usage ? { reviews: usage.reviews, compares: usage.compares } : null };
    }));
    return Response.json({ trials, invites: await listInvites(now), founding: { ...(await getFoundingConfig()), priceConfigured: Boolean(process.env.STRIPE_PRICE_LEX_FOUNDING?.trim()) } });
  } catch (err) {
    console.error("[admin lex-trials]", err instanceof Error ? err.name : "error");
    return Response.json({ error: "Could not load trials" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const who = await adminId();
  if (!who) return Response.json({ error: "Unauthorized" }, { status: 403 });
  let body: { action?: string; firmId?: unknown; label?: unknown; maxUses?: unknown; expiresInDays?: unknown; code?: unknown; enabled?: unknown; deadline?: unknown; cap?: unknown };
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  try {
    if (body.action === "create") {
      const inv = await createInvite({ label: typeof body.label === "string" ? body.label : "", maxUses: Number(body.maxUses), expiresInDays: Number(body.expiresInDays), createdBy: who });
      return Response.json({ invite: inv });
    }
    if (body.action === "revoke" && typeof body.code === "string") {
      return (await revokeInvite(body.code)) ? Response.json({ ok: true }) : Response.json({ error: "Not found" }, { status: 404 });
    }
    if (body.action === "revokeTrial" && typeof body.firmId === "string") {
      return (await revokeTrial(body.firmId, who, lexMailer)) ? Response.json({ ok: true }) : Response.json({ error: "Not an active trial" }, { status: 404 });
    }
    if (body.action === "founding") {
      try { return Response.json({ founding: await setFoundingConfig(body, who) }); }
      catch (e) { return Response.json({ error: e instanceof Error ? e.message : "Invalid" }, { status: 400 }); }
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[admin lex-trials]", err instanceof Error ? err.name : "error");
    return Response.json({ error: "Could not update invites" }, { status: 500 });
  }
}
