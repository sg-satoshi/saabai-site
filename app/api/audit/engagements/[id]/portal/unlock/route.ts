/** POST (admin): reopen a submitted fact-find for client edits, and tell the client. */
import { after } from "next/server";
import { requireAdmin } from "../../../../../../../lib/audit-admin";
import { unlockForEdits } from "../../../../../../../lib/portal-blueprint/store";
import { unlockedEmail } from "../../../../../../../lib/portal-blueprint/emails";
import { EMAIL_BRAND, sendBrandedEmail } from "../../../../../../../lib/email/branded-layout";
import { baseUrl } from "../../../../../../../lib/portal-blueprint/links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const e = await unlockForEdits(id);
  if (!e) return Response.json({ error: "Not found or not submitted" }, { status: 404 });
  after(async () => {
    await sendBrandedEmail({
      to: e.contactEmail,
      email: unlockedEmail({ name: e.contactName, portalUrl: `${baseUrl()}/portal/login` }),
      from: process.env.BLUEPRINT_FROM_EMAIL || EMAIL_BRAND.fromShane,
      replyTo: EMAIL_BRAND.supportEmail,
    });
  });
  return Response.json({ ok: true });
}
