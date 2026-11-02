/**
 * Thin SESv2 SendEmail wrapper.
 *
 * ConfigurationSetName is set only when the tenant or AWS_SES_CONFIGURATION_SET
 * has a name. The send-only key cannot create that set or the event topic.
 * Wire them by hand, set AWS_SES_SNS_TOPIC_ARN, and events arrive at
 * POST /api/email/ses-events. Until that env var is set the route refuses
 * every message. Sends still go out without it.
 *
 * TenantName is the SES tenant (sunder). Omit it when ses_tenant_name is empty.
 */
import { SESv2Client, SendEmailCommand, type SendEmailCommandInput } from "@aws-sdk/client-sesv2";

export type SesTag = { Name: string; Value: string };

export type SesMessage = {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
  tenantName?: string;
  configurationSetName?: string;
  tags?: SesTag[];
};

export function sesConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.AWS_SES_ACCESS_KEY_ID && env.AWS_SES_SECRET_ACCESS_KEY && env.AWS_SES_REGION);
}

export function configurationSetName(tenantSet: string | null | undefined, envSet: string | undefined): string | undefined {
  const value = (tenantSet || envSet || "").trim();
  return value || undefined;
}

export function sesTags(input: { tenant: string; kind: string; campaignId?: string | null }): SesTag[] {
  const tags: SesTag[] = [
    { Name: "tenant", Value: input.tenant },
    { Name: "kind", Value: input.kind },
  ];
  if (input.campaignId && /^[A-Za-z0-9_-]{1,256}$/.test(input.campaignId)) {
    tags.push({ Name: "campaign", Value: input.campaignId });
  }
  return tags;
}

export function buildSesCommandInput(msg: SesMessage): SendEmailCommandInput {
  const input: SendEmailCommandInput = {
    FromEmailAddress: msg.from,
    Destination: { ToAddresses: [msg.to] },
    ReplyToAddresses: msg.replyTo ? [msg.replyTo] : undefined,
    Content: {
      Simple: {
        Subject: { Data: msg.subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: msg.html, Charset: "UTF-8" },
          Text: { Data: msg.text, Charset: "UTF-8" },
        },
        Headers: Object.entries(msg.headers).map(([Name, Value]) => ({ Name, Value })),
      },
    },
    EmailTags: msg.tags,
  };
  if (msg.tenantName) input.TenantName = msg.tenantName;
  if (msg.configurationSetName) input.ConfigurationSetName = msg.configurationSetName;
  return input;
}

export type SesSender = (msg: SesMessage) => Promise<{ messageId: string }>;

let cached: SESv2Client | null = null;

function client(): SESv2Client {
  if (!sesConfigured()) throw new Error("SES is not configured");
  if (!cached) {
    cached = new SESv2Client({
      region: process.env.AWS_SES_REGION,
      credentials: {
        accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY || "",
      },
    });
  }
  return cached;
}

export async function sendSes(msg: SesMessage, sender?: SesSender): Promise<{ messageId: string }> {
  if (sender) return sender(msg);
  const out = await client().send(new SendEmailCommand(buildSesCommandInput(msg)));
  const messageId = out.MessageId || "";
  if (!messageId) throw new Error("SES accepted the message without a message id");
  return { messageId };
}
