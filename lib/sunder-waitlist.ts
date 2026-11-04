/**
 * SUNDER waitlist (sunder.com.au). Validation, referral codes, tokens and the
 * store calls. Storage is Supabase table sunder_subscribers
 * (db/migrations/008_sunder_waitlist.sql), service role only.
 * The waitlist row is still created on signup. Marketing email is double opt-in
 * after migration 009: existing rows stay confirmed, new rows start pending.
 * Referrer extra entries are capped at 10 in SQL and, after migration 011,
 * are credited when the referred person confirms, not at signup.
 */
import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const SUNDER_CONSENT_VERSION = "2026-11-02-v2";
export const SUNDER_CONSENT_TEXT =
  "By joining, you agree to receive emails from Saabai Pty Ltd (ABN 44 703 735 264) trading as SUNDER about our launch, offers and giveaways. We email you to confirm before any marketing. Unsubscribe any time.";
export const SUNDER_SMS_CONSENT_TEXT = "Text me launch news and offers. Reply STOP to opt out.";
export const REFERRAL_CAP = 10;
export const LAUNCH_PREFS = ["outright", "subscription", "unsure"] as const;
export type LaunchPref = (typeof LAUNCH_PREFS)[number];

const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}$/;
const REF = /^[a-z0-9]{6,12}$/;
const TOKEN = /^[A-Za-z0-9_-]{32,64}$/;

export type SignupInput = {
  firstName: string;
  email: string;
  headline: 1 | 2 | null;
  referredBy: string | null;
  utm: Record<"source" | "medium" | "campaign" | "content" | "term", string | null>;
  source: string | null;
  /** Optional mobile from the signup form. Stored without SMS consent. */
  mobile: string | null;
};

const MOBILE = /^\+?\d{8,15}$/;
/** Strip spaces, brackets and dashes; null when empty. */
export function cleanMobile(v: unknown): string | null | false {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") return false;
  const raw = v.replace(/[\s()-]/g, "");
  if (!raw) return null;
  return MOBILE.test(raw) ? raw : false;
}

const clip = (v: unknown, n: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, n);
  return t ? t : null;
};

/** Returns a clean input, or an error string. `website` is the honeypot. */
export function validateSignup(body: unknown): { ok: true; input: SignupInput } | { ok: false; error: string; bot?: boolean } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request" };
  const b = body as Record<string, unknown>;
  if (typeof b.website === "string" && b.website.trim() !== "") return { ok: false, error: "bot", bot: true };
  const firstName = typeof b.firstName === "string" ? b.firstName.replace(/[\u0000-\u001f<>]/g, "").trim() : "";
  if (!firstName || firstName.length > 60) return { ok: false, error: "Please enter your first name." };
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL.test(email)) return { ok: false, error: "Please enter a valid email." };
  const mobile = cleanMobile(b.mobile);
  if (mobile === false) return { ok: false, error: "Please enter a valid mobile number." };
  const h = Number(b.h);
  const ref = typeof b.ref === "string" ? b.ref.trim().toLowerCase() : "";
  const u = (b.utm && typeof b.utm === "object" ? b.utm : {}) as Record<string, unknown>;
  return {
    ok: true,
    input: {
      firstName,
      email,
      headline: h === 1 || h === 2 ? h : null,
      referredBy: REF.test(ref) ? ref : null,
      utm: { source: clip(u.source, 100), medium: clip(u.medium, 100), campaign: clip(u.campaign, 100), content: clip(u.content, 100), term: clip(u.term, 100) },
      source: clip(b.source, 200),
      mobile,
    },
  };
}

export type UpdateInput = { token: string; mobile?: string; smsConsent?: boolean; launchPref?: LaunchPref };

/** Thank-you state update. Mobile requires the SMS box ticked (server-side). */
export function validateUpdate(body: unknown): { ok: true; input: UpdateInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request" };
  const b = body as Record<string, unknown>;
  const token = typeof b.token === "string" ? b.token : "";
  if (!TOKEN.test(token)) return { ok: false, error: "Invalid request" };
  const out: UpdateInput = { token };
  if (b.mobile !== undefined) {
    const raw = cleanMobile(b.mobile);
    if (!raw) return { ok: false, error: "Please enter a valid mobile number." };
    if (b.smsConsent !== true) return { ok: false, error: "Tick the box to get texts." };
    out.mobile = raw;
    out.smsConsent = true;
  }
  if (b.launchPref !== undefined) {
    if (!LAUNCH_PREFS.includes(b.launchPref as LaunchPref)) return { ok: false, error: "Invalid request" };
    out.launchPref = b.launchPref as LaunchPref;
  }
  if (!out.mobile && !out.launchPref) return { ok: false, error: "Nothing to save" };
  return { ok: true, input: out };
}

export function newReferralCode(): string {
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(8);
  return Array.from(bytes, (x) => a[x % a.length]).join("");
}
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}
export function hashToken(t: string): string {
  return createHash("sha256").update(t).digest("hex");
}

/** Pure referral credit rule (mirrors the SQL): +1, never above the cap, never self. */
export function creditReferral(current: number, referrerCode: string | null, newCode: string): number {
  if (!referrerCode || referrerCode === newCode) return current;
  return Math.min(current + 1, REFERRAL_CAP);
}

export type SignupRow = {
  p_first_name: string; p_email: string; p_source: string | null;
  p_utm_source: string | null; p_utm_medium: string | null; p_utm_campaign: string | null; p_utm_content: string | null; p_utm_term: string | null;
  p_headline_variant: number | null; p_consent_text: string; p_consent_version: string;
  p_ip_hash: string; p_user_agent: string | null; p_referral_code: string; p_referred_by: string | null; p_update_token_hash: string;
};

export interface WaitlistStore {
  signup(row: SignupRow): Promise<{ referral_code: string; created: boolean }>;
  update(tokenHash: string, patch: Record<string, unknown>): Promise<boolean>;
}

export async function supabaseStore(): Promise<WaitlistStore> {
  const { serviceClient } = await import("./agent-supabase");
  const db = serviceClient();
  return {
    async signup(row) {
      const { data, error } = await db.rpc("sunder_signup", row);
      if (error) throw new Error(error.message);
      const r = Array.isArray(data) ? data[0] : data;
      return { referral_code: r.referral_code, created: !!r.created };
    },
    async update(tokenHash, patch) {
      const { data, error } = await db.from("sunder_subscribers").update(patch).eq("update_token_hash", tokenHash).select("id");
      if (error) throw new Error(error.message);
      return Array.isArray(data) && data.length > 0;
    },
  };
}

/**
 * Signup. A new email gets a fresh code and an update token. A repeat email
 * gets only its existing referral code (no token, no other data).
 */
export async function signup(store: WaitlistStore, input: SignupInput, meta: { ipHash: string; userAgent: string | null }) {
  const token = newToken();
  for (let i = 0; i < 3; i++) {
    const code = newReferralCode();
    try {
      const r = await store.signup({
        p_first_name: input.firstName, p_email: input.email, p_source: input.source,
        p_utm_source: input.utm.source, p_utm_medium: input.utm.medium, p_utm_campaign: input.utm.campaign,
        p_utm_content: input.utm.content, p_utm_term: input.utm.term,
        p_headline_variant: input.headline, p_consent_text: SUNDER_CONSENT_TEXT, p_consent_version: SUNDER_CONSENT_VERSION,
        p_ip_hash: meta.ipHash, p_user_agent: meta.userAgent ? meta.userAgent.slice(0, 300) : null,
        p_referral_code: code, p_referred_by: input.referredBy, p_update_token_hash: hashToken(token),
      });
      if (!r.created) return { ref: r.referral_code, token: null };
      // Optional signup mobile: new rows only (never overwrite an existing
      // subscriber's data), and never opted into SMS here. Best effort.
      if (input.mobile) {
        try {
          await store.update(hashToken(token), { mobile: input.mobile, updated_at: new Date().toISOString() });
        } catch (e) {
          console.error("sunder waitlist mobile save failed:", e instanceof Error ? e.message : "error");
        }
      }
      return { ref: r.referral_code, token };
    } catch (e) {
      // Retry only on a referral-code collision.
      if (!/referral|ref_key/i.test(String((e as Error).message))) throw e;
    }
  }
  throw new Error("Could not allocate a referral code");
}

export function updatePatch(input: UpdateInput, now = new Date()): Record<string, unknown> {
  const t = now.toISOString();
  const p: Record<string, unknown> = { updated_at: t };
  if (input.mobile) Object.assign(p, { mobile: input.mobile, sms_consent: true, sms_consent_at: t, sms_consent_text: SUNDER_SMS_CONSENT_TEXT });
  if (input.launchPref) Object.assign(p, { launch_pref: input.launchPref, launch_pref_at: t });
  return p;
}

const csvCell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // spreadsheet formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const EXPORT_COLUMNS = [
  "created_at", "first_name", "email", "headline_variant", "source", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "referral_code", "referred_by", "referral_entries", "mobile", "sms_consent", "sms_consent_at", "launch_pref", "consent_version", "consent_at",
] as const;
export function toCsv(rows: Record<string, unknown>[]): string {
  return [EXPORT_COLUMNS.join(","), ...rows.map((r) => EXPORT_COLUMNS.map((c) => csvCell(r[c])).join(","))].join("\n") + "\n";
}

/** "sam@example.com" -> "s**@example.com". Admin display only. */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 1)}${"*".repeat(Math.max(2, Math.min(local.length - 1, 6)))}@${domain}`;
}

export type ReferralStats = { code: string; friends: number; entries: number };

/** Counts only, never names. */
export function referralLineText(r: ReferralStats): string {
  return `Your link: https://sunder.com.au/?r=${r.code} · ${r.friends} ${r.friends === 1 ? "friend" : "friends"} joined · ${Math.min(r.entries, REFERRAL_CAP)}/${REFERRAL_CAP} bonus entries`;
}


/**
 * Referral stats per email (lower case). friends = referred people who
 * confirmed (migration 011). Before 011 it falls back to referral_entries.
 */
export async function referralStatsFor(db: SupabaseClient, emails: string[]): Promise<Map<string, ReferralStats & { referredBy: string | null; referredByEmail: string | null }>> {
  const out = new Map<string, ReferralStats & { referredBy: string | null; referredByEmail: string | null }>();
  if (!emails.length) return out;
  const { data, error } = await db.from("sunder_subscribers").select("email,referral_code,referred_by,referral_entries").in("email", emails.slice(0, 300));
  if (error || !data) return out;
  const rows = data as { email: string; referral_code: string; referred_by: string | null; referral_entries: number }[];
  const codes = rows.map((r) => r.referral_code);
  const friends = new Map<string, number>();
  let counted = false;
  if (codes.length) {
    const f = await db.from("sunder_subscribers").select("referred_by").in("referred_by", codes).not("referral_credited_at", "is", null);
    if (!f.error && f.data) {
      counted = true;
      for (const r of f.data as { referred_by: string }[]) friends.set(r.referred_by, (friends.get(r.referred_by) || 0) + 1);
    }
  }
  const byCodes = [...new Set(rows.map((r) => r.referred_by).filter((c): c is string => !!c))];
  const byEmail = new Map<string, string>();
  if (byCodes.length) {
    const b = await db.from("sunder_subscribers").select("email,referral_code").in("referral_code", byCodes);
    for (const r of (b.data || []) as { email: string; referral_code: string }[]) byEmail.set(r.referral_code, r.email);
  }
  for (const r of rows) {
    out.set(r.email, {
      code: r.referral_code,
      friends: counted ? friends.get(r.referral_code) || 0 : r.referral_entries,
      entries: r.referral_entries,
      referredBy: r.referred_by,
      referredByEmail: r.referred_by ? byEmail.get(r.referred_by) || null : null,
    });
  }
  return out;
}
