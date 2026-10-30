/**
 * Lex Assist knowledge: editable source in content/lex-help/*.md, compiled by
 * scripts/build-lex-help.mjs into lex-help-content.generated.ts (CI checks it is fresh).
 * The privacy placeholder is filled from the live copy. Terms are written in content/lex-help/terms.md WITHOUT
 * prices (Chief ruling): the terms module is never imported here, and stripPrices is a second line of defence.
 * Retrieval: simple keyword scoring with a boost for the user's current screen. Product help only.
 */
import { LEX_MATTERS_PRIVACY_COPY } from "./lex-upload-copy";
import { LEX_HELP_DOCS } from "./lex-help-content.generated";

export type HelpSection = { id: string; title: string; routes: string[]; keywords: string[]; body: string };

function fill(body: string): string {
  return body
    .replaceAll("{{LEX_MATTERS_PRIVACY_COPY}}", LEX_MATTERS_PRIVACY_COPY);
}
/** What the assistant says about price. No figures are given to the model. */
export const PRICE_ANSWER = "Pricing is set after the trial, and you'll see the full price, GST and terms before you pay anything.";
/** Price questions get PRICE_ANSWER without a model call. */
export const PRICE_QUESTION = /\b(price|pricing|priced|cost|costs|how much|fee|fees|gst|per month|a month|monthly|subscription (price|cost)|founding (price|rate)|discount|cheap|expensive|\$)/i;
/** A question about what Lex costs (not about tax, duty or a client's money). */
export function isPriceQuestion(q: string): boolean {
  return PRICE_QUESTION.test(q) && /\b(lex|it|plan|subscription|seat|seats|trial|you|saabai|founding)\b/i.test(q) && !/\b(tax|duty|stamp|beneficiar|capital gains|cgt|client|tenant|landlord|deposit|bond|damages|compensation|settlement|estate)\b/i.test(q);
}
const PRICE_RE = /\$\s?\d|\bAUD\b|\bGST not applicable\b|\d[\d,.]*\s*(?:dollars|a month|per month)\b/i;
/** Drops every sentence that carries a price figure, so the assistant can't see or quote one. */
export function stripPrices(text: string): string {
  return text.split(/(?<=[.!?])\s+/).filter((x) => !PRICE_RE.test(x)).join(" ");
}
export const LEX_HELP_SECTIONS: HelpSection[] = LEX_HELP_DOCS.map((d) => ({
  ...d, body: stripPrices(fill(d.body)),
}));

const STOP = new Set("a an the and or to of in on for is it i my me how do does can what where when why with this that be you your lex".split(" "));
const words = (s: string) => s.toLowerCase().match(/[a-z0-9]+/g)?.filter((w) => w.length > 2 && !STOP.has(w)) ?? [];
const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, "");

/** Top sections for a question and screen. "overview" is always included. */
export function retrieveHelp(question: string, route: string | null, k = 4): HelpSection[] {
  const q = new Set(words(question).map(stem));
  const scored = LEX_HELP_SECTIONS.map((s) => {
    const title = new Set(words(s.title).map(stem));
    const kw = new Set(s.keywords.map((w) => stem(w.toLowerCase())));
    const body = new Set(words(s.body).map(stem));
    let score = 0;
    for (const w of q) score += (title.has(w) ? 3 : 0) + (kw.has(w) ? 2 : 0) + (body.has(w) ? 1 : 0);
    if (route && s.routes.some((r) => route === r || route.startsWith(r + "/"))) score += 2;
    return { s, score };
  }).sort((a, b) => b.score - a.score);
  const top = scored.filter((x) => x.score > 0).slice(0, k).map((x) => x.s);
  const overview = LEX_HELP_SECTIONS.find((s) => s.id === "overview");
  if (overview && !top.includes(overview)) top.push(overview);
  return top;
}

export function helpKnowledgeText(sections: HelpSection[] = LEX_HELP_SECTIONS): string {
  return sections.map((s) => `## ${s.title}\n${s.body}`).join("\n\n");
}

/** Current Lex screen from a client-sent path: Lex paths only, no query string. */
export function cleanRoute(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const p = raw.split(/[?#]/)[0].slice(0, 120);
  return /^\/lex(\/[a-z0-9\-/]*)?$/i.test(p) ? p.replace(/\/[a-z0-9]{16,}/gi, "/:id") : null;
}
