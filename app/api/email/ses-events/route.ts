import { recordProviderEvent, recordTrackingEvent } from "../../../../lib/email/ops";
import { certUrlAllowed, providerEventsFromSns, subscribeUrlAllowed, trackingEventFromSns, verifySnsSignature, type SnsMessage } from "../../../../lib/email/sns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Sending-provider events via SNS HTTPS: bounce and complaint (suppression),
 * delivery, open and click (engagement stats, matched by SES message id).
 * Manual step, because the send-only key cannot create them:
 * 1. Create an SNS topic and a configuration set in ap-southeast-2, with open and
 *    click tracking on and an SNS event destination for Send, Delivery, Bounce,
 *    Complaint, Open and Click.
 * 2. Subscribe this URL (https://saabai.ai/api/email/ses-events) to the topic.
 * 3. Set AWS_SES_SNS_TOPIC_ARN to that topic, and AWS_SES_CONFIGURATION_SET to the set name.
 * Until AWS_SES_SNS_TOPIC_ARN is set, every message is refused.
 */
export async function POST(req: Request) {
  const topic = process.env.AWS_SES_SNS_TOPIC_ARN || "";
  if (!topic) return Response.json({ error: "Event topic is not configured" }, { status: 503, headers: NO_STORE });
  let msg: SnsMessage;
  try { msg = await req.json() as SnsMessage; } catch { return Response.json({ error: "Invalid message" }, { status: 400, headers: NO_STORE }); }
  if (msg.TopicArn !== topic) return Response.json({ error: "Wrong topic" }, { status: 403, headers: NO_STORE });
  if (!certUrlAllowed(msg.SigningCertURL)) return Response.json({ error: "Untrusted certificate" }, { status: 403, headers: NO_STORE });
  const pem = await fetch(msg.SigningCertURL as string).then((r) => r.ok ? r.text() : "").catch(() => "");
  if (!pem || !verifySnsSignature(msg, pem)) return Response.json({ error: "Bad signature" }, { status: 403, headers: NO_STORE });

  if (msg.Type === "SubscriptionConfirmation") {
    if (!subscribeUrlAllowed(msg.SubscribeURL)) return Response.json({ error: "Untrusted confirmation" }, { status: 403, headers: NO_STORE });
    const confirmed = await fetch(msg.SubscribeURL as string).then((r) => r.ok).catch(() => false);
    if (!confirmed) return Response.json({ error: "Confirmation failed" }, { status: 502, headers: NO_STORE });
    return Response.json({ ok: true, confirmed: true }, { headers: NO_STORE });
  }

  if (msg.Type !== "Notification" || !msg.Message) return Response.json({ ok: true, ignored: true }, { headers: NO_STORE });
  const events = providerEventsFromSns(msg.Message);
  let applied = 0;
  for (const event of events) {
    const result = await recordProviderEvent(event);
    if (result.ok) applied++;
  }
  const tracking = trackingEventFromSns(msg.Message);
  let tracked = false;
  if (tracking) {
    const result = await recordTrackingEvent(tracking);
    // A database error returns 500 so SNS retries. The update is idempotent, so a retry is safe.
    if (!result.ok) return Response.json({ error: "Could not record event" }, { status: 500, headers: NO_STORE });
    tracked = result.matched;
  }
  return Response.json({ ok: true, applied, tracked }, { headers: NO_STORE });
}
