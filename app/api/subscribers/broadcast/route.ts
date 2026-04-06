import { getSubscribers } from "../../../../lib/subscribers";

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

  // Verify all emails are real subscribers
  const allSubs = await getSubscribers(500);
  const subMap = new Map(allSubs.map(s => [s.email, s]));
  const recipients = emails
    .map(e => subMap.get(e.toLowerCase()))
    .filter((s): s is NonNullable<typeof s> => s != null && s.status !== "unsubscribed");

  if (!recipients.length) return Response.json({ error: "No valid active subscribers in selection" }, { status: 400 });

  const resendKey = (process.env.RESEND_API_KEY ?? "").replace(/[\s\n]/g, "");
  if (!resendKey) return Response.json({ error: "Resend not configured" }, { status: 500 });

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  // Chunk into batches of BATCH_SIZE
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    const payload = batch.map(s => ({
      from: `${fromName} <hello@saabai.ai>`,
      to: [s.email],
      subject,
      // Personalise the greeting using firstName
      html: html.replace(/\{\{firstName\}\}/g, s.firstName || "there"),
    }));

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

  console.log(`[broadcast] subject="${subject}" recipients=${recipients.length} sent=${sent} failed=${failed}`);
  if (errors.length) console.error("[broadcast] errors:", errors);

  return Response.json({ ok: true, sent, failed, total: recipients.length, errors: errors.slice(0, 3) });
}
