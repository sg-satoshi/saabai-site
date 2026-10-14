import { requireAdminSession } from "@/lib/admin-guard";
import { getDoc, patchDoc } from "@/lib/growth/store";
import { recordEvent } from "@/lib/growth/events";
import { sendMarketingEmail } from "@/lib/growth/send";
import type { Upsell } from "@/lib/growth/growth2";

export const runtime = "nodejs";

/** actions: approve (sends now), cancel, save (edit subject/body/plan). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = (await params).id;
  const u = await getDoc<Upsell>("upsells", id);
  if (!u) return Response.json({ error: "Not found" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  if (b.action === "save") {
    const patch: Partial<Upsell> = {};
    if (typeof b.subject === "string") patch.subject = b.subject.slice(0, 150);
    if (typeof b.body === "string") patch.body = b.body.slice(0, 5000);
    if (["Presence", "Growth", "Signature", "Build"].includes(b.plan)) patch.plan = b.plan;
    return Response.json({ upsell: await patchDoc<Upsell>("upsells", id, patch) });
  }
  if (b.action === "cancel") return Response.json({ upsell: await patchDoc<Upsell>("upsells", id, { status: "cancelled" }) });
  if (b.action === "approve") {
    if (!["scheduled", "awaiting_approval"].includes(u.status)) return Response.json({ error: `Already ${u.status}` }, { status: 409 });
    const r = await sendMarketingEmail(u.email, u.subject, u.body, "upsell");
    if (!r.ok) return Response.json({ error: r.error }, { status: 502 });
    await recordEvent({ contactId: u.email, type: "upsell_sent", refId: u.id, meta: { plan: u.plan, creditCents: u.creditCents } });
    return Response.json({ upsell: await patchDoc<Upsell>("upsells", id, { status: "sent", sentAt: new Date().toISOString() }) });
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}
