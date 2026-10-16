/**
 * AI-suggested variants, pure logic (prompt, parsing, guardrails). No network, no storage, safe for tests.
 * Suggestions are only proposals. Nothing here can change what visitors see: a human approves in the dashboard,
 * and approval goes through the same audited add_variant path as a manual edit.
 */
import type { Experiment } from "./core";
import type { Analysis } from "./stats";

export const SUGGEST_COUNT = 3;
export const MAX_PENDING = 9;
export const SUGGEST_COOLDOWN_MS = 60_000;
export const MAX_COMBINED = 100;

export type Suggestion = { text: string; emphasis: string; rationale: string };

const norm = (s: string) => s.toLowerCase().replace(/[\u00a0\s]+/g, " ").replace(/[^\p{L}\p{N} ]/gu, "").trim();
export const combined = (t: string, e: string) => [t, e].filter(Boolean).join(" ");

/** Words and claims we never let through without a human writing them. */
const BANNED = /\b(guarantee[ds]?|best|#1|number one|no\.? ?1|proven|revolutionary|game.?chang\w*|10x|\d+x|free|instant\w*|risk.?free|unlimited|cutting.?edge|unlock\w*|supercharge\w*|transform\w*|skyrocket\w*|secret|hack|effortless\w*|automagic\w*|dominate|crush)\b/i;

/** Returns why a suggestion is not allowed, or null when it passes. */
export function checkSuggestion(s: Suggestion, existingCopy: string[]): string | null {
  const text = s.text.trim(), emphasis = s.emphasis.trim();
  if (!text) return "empty";
  if (text.length > 90 || emphasis.length > 90 || combined(text, emphasis).length > MAX_COMBINED) return "too long";
  const all = combined(text, emphasis);
  if (/[\u2013\u2014]/.test(all)) return "long dash";
  if (/!/.test(all)) return "exclamation";
  if (/https?:|www\.|@/i.test(all)) return "link";
  if (/\p{Extended_Pictographic}/u.test(all)) return "emoji";
  const digits = all.match(/\d+/g) ?? [];
  if (digits.some((d) => d !== "48")) return "number we cannot back up";
  if (/\b48\b/.test(all) && !/48[\u00a0 ]hours/i.test(all)) return "48 must mean 48 hours";
  if (BANNED.test(all)) return "claim we cannot back up";
  if (existingCopy.some((c) => norm(c) === norm(all))) return "duplicate";
  return null;
}

/** Tidies, applies the guardrails and drops duplicates inside the batch. */
export function cleanSuggestions(raw: unknown, existingCopy: string[], max = SUGGEST_COUNT): { ok: Suggestion[]; dropped: { text: string; why: string }[] } {
  const arr = Array.isArray(raw) ? raw : [];
  const ok: Suggestion[] = [];
  const dropped: { text: string; why: string }[] = [];
  const seen = [...existingCopy];
  for (const r of arr) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const tidy = (x: unknown) => (typeof x === "string" ? x.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim() : "");
    // Keep "48 hours" together like the live headline does.
    const nb = (x: string) => x.replace(/\b48 hours/gi, "48\u00a0hours");
    const s: Suggestion = { text: nb(tidy(o.text)), emphasis: nb(tidy(o.emphasis)), rationale: tidy(o.why ?? o.rationale).slice(0, 280) };
    const why = checkSuggestion(s, seen);
    if (why) { dropped.push({ text: s.text, why }); continue; }
    if (ok.length >= max) continue;
    ok.push(s);
    seen.push(combined(s.text, s.emphasis));
  }
  return { ok, dropped };
}

export const SUGGEST_SYSTEM = `You write headline variants for saabai.ai, an Australian business that gives small businesses a clear plan for where AI will save them time, delivered in 48 hours.
Voice: plain, direct, Australian English, like a sensible tradie explaining things. Short words. No hype, no buzzwords, no emoji, no exclamation marks, no question marks needed.
Hard rules:
- Never use em dashes or en dashes. Use a comma or full stop.
- Only claim what the current headlines already claim: a clear plan for where AI fits in the business, ready in 48 hours. Do not invent prices, savings, percentages, customer numbers, awards, guarantees, reviews, or results.
- The only number allowed is "48 hours". No other digits.
- Avoid: best, free, guaranteed, proven, instant, unlock, transform, revolutionary, game changing, supercharge, effortless.
- Each headline must be meaningfully different from the others and from the existing ones (different angle, not a reword). Angles to try: the owner's time, the cost of guessing, a clear next step, fear of wasting money on the wrong tool, plain English with no jargon.
- "text" is the first part. "emphasis" is an optional second part shown in a highlight colour that finishes the sentence. Together they read as one headline of 100 characters or fewer. Each part 90 characters or fewer.
Reply with JSON only, no markdown fence: an array of exactly 3 objects {"text": string, "emphasis": string, "why": string}. "why" is one plain sentence on the angle being tested.`;

/** Facts the model sees. Numbers come from our own analysis, never invented. */
export function buildSuggestPrompt(exp: Experiment, analysis: Analysis, daysRunning: number, rejected: string[]): string {
  const byId = new Map(analysis.variants.map((v) => [v.id, v]));
  const lines = exp.variants.map((v) => {
    const r = byId.get(v.id);
    const stat = r ? `${r.impressions} views, ${r.converters} enquiries or calls${r.impressions ? ` (${(r.rate * 100).toFixed(1)}%)` : ""}` : "no data";
    const tag = [v.id === exp.defaultVariantId ? "control" : "", v.active ? "" : "paused"].filter(Boolean).join(", ");
    return `- ${v.id.toUpperCase()}${tag ? ` (${tag})` : ""}: "${combined(v.text, v.emphasis ?? "")}" | ${stat}`;
  });
  return [
    `Experiment: ${exp.name ?? exp.id} (${exp.slot} on ${exp.path}). Day ${daysRunning} of testing.`,
    `Current variants and results so far:`,
    ...lines,
    `Verdict so far: ${analysis.verdict.headline} ${analysis.verdict.detail}`,
    analysis.verdict.kind !== "winner" ? "No result is proven yet, so the numbers are early and noisy. Treat them as a weak hint only." : "",
    rejected.length ? `The owner rejected these before, so do not repeat their style:\n${rejected.map((r) => `- "${r}"`).join("\n")}` : "",
    `Write 3 new headline variants.`,
  ].filter(Boolean).join("\n");
}

/** Pulls the JSON array out of a model reply, tolerating a stray fence or preamble. */
export function parseModelJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = t.indexOf("["), end = t.lastIndexOf("]");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(t.slice(start, end + 1)); } catch { return null; }
}
