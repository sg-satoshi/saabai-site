import { getSubscribers } from "../../../../lib/subscribers";
import { broadcastEmail, broadcastRecipients } from "../../../../lib/broadcast";
import { isSuppressed, unsubHeaders, unsubUrl } from "../../../../lib/growth/consent";

export const runtime = "nodejs";

// Maximum recipients per Resend batch call
const BATCH_SIZE = 100;

export async function POST(req: Request) {
  let body: { emails?: string[]; subject?: string; html?: string; fromName?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { emails, subject, html, fromName = "Shane at Saabai" } = body;

  if (!emails?.length) return Response.json({ error: "emails required" }, { status: 400 });
  if (!subject?.trim()) return Response.json({ error: "subject required" }, { status: 400 });
  if (!html?.trim()) return Response.json({ error: "html required" }, { status: 400 });

  // Only real subscribers who opted in to marketing email, minus anyone who unsubscribed
  // (the suppression list that /api/unsubscribe writes to). Older sign-ups from the retired
  // checklist pop-up have no consent flag and stay out until they opt in.
  const allSubs = await getSubscribers(500);
  const { recipients, suppressed } = await broadcastRecipients(emails, allSubs, isSuppressed);

  if (!recipients.length) return Response.json({ error: "No subscribers in the selection have opted in to marketing email (unsubscribed people are excluded)", suppressed }, { status: 400 });

  const resendKey = (process.env.RESEND_API_KEY ?? "").replace(/[\s\n]/g, "");
  if (!resendKey) return Response.json({ error: "Resend not configured" }, { status: 500 });

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  // Chunk into batches of BATCH_SIZE
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    // Each email carries the sender ID, an unsubscribe footer and one-click unsubscribe headers.
    const payload = batch.map(s => broadcastEmail(s, { subject, html, fromName }, { unsubUrl, unsubHeaders }));

    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        failed += batch.length;
        errors.push(data.message ?? "Batch send failed");
      } else {
        sent += batch.length;
      }
    } catch (err) {
      failed += batch.length;
      errors.push(String(err));
    }
  }

  console.log(`[broadcast] subject="${subject}" recipients=${recipients.length} suppressed=${suppressed} sent=${sent} failed=${failed}`);
  if (errors.length) console.error("[broadcast] errors:", errors);

  return Response.json({ ok: true, sent, failed, total: recipients.length, suppressed, errors: errors.slice(0, 3) });
}
