/** SUNDER is the first tenant. The send-only IAM key may From these domains only. */
export const SUNDER_SLUG = "sunder";
export const SUNDER_FROM_EMAIL = "hello@sunder.com.au";
export const SUNDER_FROM_NAME = "SUNDER Pickleball";
export const EMAIL_PUBLIC_ORIGIN = "https://saabai.ai";
/** SUNDER confirm links land on its own domain (proxy serves /email/confirm there). */
export const SUNDER_PUBLIC_ORIGIN = "https://sunder.com.au";

export function confirmOrigin(slug: string, fallback: string): string {
  return slug === SUNDER_SLUG ? SUNDER_PUBLIC_ORIGIN : fallback;
}

/** Shared account limit is 14/s. Stay under it. */
export const SES_SENDS_PER_SECOND = 10;

export const ALLOWED_FROM_DOMAINS = ["saabai.ai", "sunder.com.au", "lifestylemoneymanagement.com.au"] as const;

export const CONFIRM_TTL_SECONDS = 14 * 24 * 60 * 60;

export type SenderIdentity = {
  slug: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  legalName: string;
  abn: string;
  postalAddress: string;
  domain: string;
  whyText: string;
  /** SES v2 TenantName. Empty omits it. */
  sesTenantName: string;
  /** Configuration set. Empty omits it (MVP sends without one). */
  configSet: string;
};

export const SUNDER_IDENTITY: SenderIdentity = {
  slug: SUNDER_SLUG,
  fromName: SUNDER_FROM_NAME,
  fromEmail: SUNDER_FROM_EMAIL,
  replyTo: SUNDER_FROM_EMAIL,
  legalName: "Saabai Pty Ltd",
  abn: "44 703 735 264",
  postalAddress: "Merrimac QLD 4226 Australia",
  domain: "sunder.com.au",
  whyText: "you joined the SUNDER Pickleball waitlist and agreed to hear from us",
  sesTenantName: SUNDER_SLUG,
  configSet: "",
};
