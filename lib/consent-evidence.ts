/**
 * Consent evidence (Spam Act proof) captured from the request at signup and at
 * the confirm click. IP, user agent and coarse geo from Vercel edge headers
 * (country, region, city). Nothing more invasive. Columns: migration 015.
 */
export type RequestEvidence = {
  ip: string | null;
  userAgent: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
};

const clip = (v: string | null | undefined, n: number): string | null => {
  const t = (v ?? "").trim().slice(0, n);
  return t ? t : null;
};

function decode(v: string | null): string | null {
  if (!v) return null;
  try { return decodeURIComponent(v); } catch { return v; }
}

const IP = /^[0-9a-fA-F:.]{2,45}$/;

export function requestEvidence(req: Request): RequestEvidence {
  const h = req.headers;
  const raw = (h.get("x-real-ip") || (h.get("x-forwarded-for") ?? "").split(",")[0] || "").trim();
  return {
    ip: IP.test(raw) ? raw : null,
    userAgent: clip(h.get("user-agent"), 300),
    country: clip(h.get("x-vercel-ip-country"), 8),
    region: clip(h.get("x-vercel-ip-country-region"), 16),
    city: clip(decode(h.get("x-vercel-ip-city")), 80),
  };
}

/** Columns written on a new signup row. */
export function signupEvidencePatch(ev: RequestEvidence, extra: { pageUrl: string | null; formId: string | null }): Record<string, unknown> {
  return {
    signup_ip: ev.ip, signup_country: ev.country, signup_region: ev.region, signup_city: ev.city,
    page_url: extra.pageUrl, form_id: extra.formId,
  };
}

/** Columns written on the first confirm click. */
export function confirmEvidencePatch(ev: RequestEvidence, now = new Date()): Record<string, unknown> {
  return {
    confirm_ip: ev.ip, confirm_user_agent: ev.userAgent, confirm_country: ev.country, confirm_region: ev.region, confirm_city: ev.city,
    confirm_evidence_at: now.toISOString(),
  };
}

/** Page URL from the form body, else the same-origin Referer header. http(s) only, query kept (UTM). */
export function cleanPageUrl(v: unknown, refererHeader: string | null): string | null {
  for (const c of [v, refererHeader]) {
    if (typeof c !== "string") continue;
    try {
      const u = new URL(c.trim());
      if (u.protocol === "https:" || u.protocol === "http:") return u.toString().slice(0, 400);
    } catch { /* next */ }
  }
  return null;
}

export function cleanFormId(v: unknown): string | null {
  return typeof v === "string" && /^[a-z0-9][a-z0-9-]{0,39}$/.test(v) ? v : null;
}

export const EVIDENCE_COLUMNS = [
  "consent_at", "consent_text", "consent_version", "source", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "user_agent", "ip_hash", "sms_consent", "sms_consent_at", "sms_consent_text", "confirmed_at",
  "signup_ip", "signup_country", "signup_region", "signup_city", "page_url", "form_id",
  "confirm_ip", "confirm_user_agent", "confirm_country", "confirm_region", "confirm_city", "confirm_evidence_at",
] as const;
export type Evidence = Partial<Record<(typeof EVIDENCE_COLUMNS)[number], string | boolean | null>>;
