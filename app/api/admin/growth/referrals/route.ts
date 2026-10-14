import { requireAdminSession } from "@/lib/admin-guard";
import { patchDoc } from "@/lib/growth/store";
import { createReferralCode, referralUrl, type Referral } from "@/lib/growth/growth2";

export const runtime = "nodejs";

/** action create {email,name} -> code; action void|paid {id}. Credits are applied by Shane in Stripe for now. */
export async function POST(req: Request) {
  if (!(await requireAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (b.action === "create") {
    if (typeof b.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) return Response.json({ error: "Valid email required" }, { status: 400 });
    const c = await createReferralCode(b.email, typeof b.name === "string" ? b.name.slice(0, 80) : undefined);
    return Response.json({ code: c.id, url: referralUrl(c.id) });
  }
  if ((b.action === "void" || b.action === "paid") && typeof b.id === "string") {
    const r = await patchDoc<Referral>("referrals", b.id, { status: b.action, ...(b.action === "void" ? { voidReason: "Voided by admin" } : {}) });
    return r ? Response.json({ referral: r }) : Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}
