// Consent wording and record for the /score "Get your results as a PDF" box.
// The wording lives here so the page and the server always agree. The server stamps
// the time and uses this constant, never client-supplied wording.

export const SCORE_CONSENT_WORDING = "Yes, email me my PDF results and the occasional Saabai update.";

export type ScoreConsentRecord = {
  accepted: boolean;
  wording: string;
  at: string; // ISO timestamp, server clock
  pageUrl: string;
  form: "score_result_pdf";
};

/** Only same-site https pages are stored as the page URL; anything else falls back to the canonical page. */
export function cleanPageUrl(v: unknown): string {
  const fallback = "https://www.saabai.ai/score";
  if (typeof v !== "string") return fallback;
  try {
    const u = new URL(v.slice(0, 300));
    if (u.protocol !== "https:" || !/(^|\.)saabai\.ai$/i.test(u.hostname)) return fallback;
    return `${u.origin}${u.pathname}`;
  } catch {
    return fallback;
  }
}

export function buildConsentRecord(input: { accepted: unknown; pageUrl: unknown }, now: Date = new Date()): ScoreConsentRecord {
  return {
    accepted: input.accepted === true,
    wording: SCORE_CONSENT_WORDING,
    at: now.toISOString(),
    pageUrl: cleanPageUrl(input.pageUrl),
    form: "score_result_pdf",
  };
}
