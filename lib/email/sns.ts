/**
 * Amazon SNS signature check for the sending-provider event webhook.
 * The send-only key cannot create a topic or a configuration set. Shane creates
 * those once in the console, points the topic at POST /api/email/ses-events,
 * and sets AWS_SES_SNS_TOPIC_ARN (and AWS_SES_CONFIGURATION_SET). Until that
 * env var is set, the route refuses every message.
 */
import { createVerify } from "node:crypto";

export type SnsMessage = {
  Type?: string;
  MessageId?: string;
  TopicArn?: string;
  Subject?: string;
  Message?: string;
  Timestamp?: string;
  SignatureVersion?: string;
  Signature?: string;
  SigningCertURL?: string;
  SubscribeURL?: string;
  Token?: string;
};

const CERT_URL = /^https:\/\/sns\.[a-z0-9-]+\.amazonaws\.com\/SimpleNotificationService-[A-Za-z0-9]+\.pem$/;

export function certUrlAllowed(url: string | undefined): boolean {
  if (!url || url.length > 300) return false;
  return CERT_URL.test(url);
}

export function subscribeUrlAllowed(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && /^sns\.[a-z0-9-]+\.amazonaws\.com$/.test(u.hostname);
  } catch {
    return false;
  }
}

/** Canonical string SNS signs. Field order is fixed by the message type. */
export function snsSigningString(msg: SnsMessage): string | null {
  const type = msg.Type || "";
  const lines: string[] = [];
  const add = (name: keyof SnsMessage) => {
    const value = msg[name];
    if (typeof value === "string") lines.push(name, value);
  };
  if (type === "Notification") {
    add("Message");
    add("MessageId");
    if (msg.Subject) add("Subject");
    add("Timestamp");
    add("TopicArn");
    add("Type");
  } else if (type === "SubscriptionConfirmation" || type === "UnsubscribeConfirmation") {
    add("Message");
    add("MessageId");
    add("SubscribeURL");
    add("Timestamp");
    add("Token");
    add("TopicArn");
    add("Type");
  } else return null;
  if (!msg.Message || !msg.MessageId || !msg.Timestamp || !msg.TopicArn || !msg.Type) return null;
  return lines.join("\n") + "\n";
}

export function verifySnsSignature(msg: SnsMessage, pem: string): boolean {
  const signing = snsSigningString(msg);
  if (!signing || !msg.Signature || !pem.includes("BEGIN CERTIFICATE") && !pem.includes("BEGIN PUBLIC KEY")) return false;
  const algo = msg.SignatureVersion === "2" ? "RSA-SHA256" : msg.SignatureVersion === "1" ? "RSA-SHA1" : "";
  if (!algo) return false;
  try {
    const verify = createVerify(algo);
    verify.update(signing, "utf8");
    return verify.verify(pem, msg.Signature, "base64");
  } catch {
    return false;
  }
}

export type ProviderEvent = { email: string; reason: "bounce" | "complaint"; tenant?: string; campaignId?: string | null };

/** Permanent bounces and complaints only. Transient bounces are ignored. */
export function providerEventsFromSns(message: string): ProviderEvent[] {
  let body: Record<string, unknown>;
  try { body = JSON.parse(message) as Record<string, unknown>; } catch { return []; }
  const kind = String(body.eventType || body.notificationType || "");
  const mail = (body.mail && typeof body.mail === "object" ? body.mail : {}) as { tags?: Record<string, string[]> };
  const tags = mail.tags || {};
  const tenant = tags.tenant?.[0];
  const campaignId = tags.campaign?.[0] || null;
  if (kind === "Bounce") {
    const bounce = (body.bounce && typeof body.bounce === "object" ? body.bounce : {}) as { bounceType?: string; bouncedRecipients?: { emailAddress?: string }[] };
    if (bounce.bounceType && bounce.bounceType !== "Permanent") return [];
    return (bounce.bouncedRecipients || []).map((r) => r.emailAddress).filter((e): e is string => !!e).map((email) => ({ email, reason: "bounce" as const, tenant, campaignId }));
  }
  if (kind === "Complaint") {
    const complaint = (body.complaint && typeof body.complaint === "object" ? body.complaint : {}) as { complainedRecipients?: { emailAddress?: string }[] };
    return (complaint.complainedRecipients || []).map((r) => r.emailAddress).filter((e): e is string => !!e).map((email) => ({ email, reason: "complaint" as const, tenant, campaignId }));
  }
  return [];
}
