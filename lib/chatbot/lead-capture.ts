/**
 * Chatbot lead capture: SCAFFOLD ONLY (draft).
 * Off by default. No routing, no network, no sends. Pure helpers that a later,
 * approved PR can wire into the chatbot handler.
 */
export const LEAD_CAPTURE_FLAG = "CHATBOT_LEAD_CAPTURE_ENABLED";

export function leadCaptureEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env[LEAD_CAPTURE_FLAG] === "1";
}

export interface CapturedLead {
  botId: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  consent: boolean;
  capturedAt: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "") || undefined;

/** Validate raw widget input. Returns a lead or an error string. Needs email or phone, plus consent. */
export function parseLead(botId: string, body: Record<string, unknown>, now = Date.now()): CapturedLead | string {
  if (!botId) return "Missing bot";
  const email = clean(body.email)?.toLowerCase();
  const phone = clean(body.phone, 30)?.replace(/[^\d+]/g, "") || undefined;
  if (email && !EMAIL_RE.test(email)) return "Invalid email";
  if (!email && !phone) return "Email or phone required";
  if (body.consent !== true) return "Consent required";
  return { botId, name: clean(body.name, 100), email, phone, message: clean(body.message, 1000), consent: true, capturedAt: now };
}

/** Routing decision. Always "off" unless the flag is on; even then only "store" (no sends) in this scaffold. */
export function routeLead(_lead: CapturedLead, env: Record<string, string | undefined> = process.env): "off" | "store" {
  return leadCaptureEnabled(env) ? "store" : "off";
}
