/**
 * AI-suggested variants, pure logic (prompt, parsing, guardrails). No network, no storage, safe for tests.
 * Suggestions are only proposals. Nothing here can change what visitors see: a human approves in the dashboard,
 * and approval goes through the same audited add_variant path as a manual edit.
 */
import { KIND_RULES, kindOf, type Experiment, type SlotKind } from "./core";
import type { Analysis } from "./stats";

/** Kinds the AI may propose copy for. Prices and images are always written by a human. */
export const AI_KINDS: SlotKind[] = ["headline", "button", "text", "link", "placeholder"];
export const SUGGEST_COUNT = 3;
export const MAX_PENDING = 9;
export const SUGGEST_COOLDOWN_MS = 60_000;
export const MAX_COMBINED = 100;

export type Suggestion = { text: string; emphasis: string; rationale: string };

const norm = (s: string) => s.toLowerCase().replace(/[\u00a0\s]+/g, " ").replace(/[^\p{L}\p{N} ]/gu, "").trim();
export const combined = (t: string, e: string) => [t, e].filter(Boolean).join(" ");

/** Words and claims we never let through without a human writing them. */
const BANNED = /\b(guarantee[ds]?|best|#1|number one|no\.? ?1|proven|revolutionary|game.?chang\w*|10x|\d+x|free|instant\w*|risk.?free|unlimited|cutting.?edge|unlock\w*|supercharge\w*|transform\w*|skyrocket\w*|secret|hack|effortless\w*|automagic\w*|dominate|crush)\b/i;

/** Buttons may say "free" (the quiz is free, the page says so) but make no other claim. */
const BANNED_BUTTON = /\b(guarantee[ds]?|best|#1|number one|no\.? ?1|proven|revolutionary|game.?chang\w*|10x|\d+x|instant\w*|risk.?free|unlimited|cutting.?edge|unlock\w*|supercharge\w*|transform\w*|skyrocket\w*|secret|hack|effortless\w*|automagic\w*|dominate|crush|now|today|hurry|limited|exclusive|save)\b/i;

/** Returns why a suggestion is not allowed, or null when it passes. */
export function checkSuggestion(s: Suggestion, existingCopy: string[], kind: SlotKind = "headline"): string | null {
  const text = s.text.trim(), emphasis = s.emphasis.trim();
  const rules = KIND_RULES[kind];
  if (!text) return "empty";
  if (emphasis && !rules.emphasis) return "no highlighted part allowed";
  if (text.length > rules.maxText || emphasis.length > rules.maxEmphasis || combined(text, emphasis).length > rules.maxCombined) return "too long";
  const all = combined(text, emphasis);
  if (/[\u2013\u2014]/.test(all)) return "long dash";
  if (/!/.test(all)) return "exclamation";
  if (/https?:|www\.|@/i.test(all)) return "link";
  if (/\p{Extended_Pictographic}/u.test(all)) return "emoji";
  const digits = all.match(/\d+/g) ?? [];
  if (!AI_KINDS.includes(kind)) return "no AI suggestions for this type";
  if (kind === "text" || kind === "link" || kind === "placeholder") {
    // Only numbers already in the live copy can be reused, and no claims we cannot back up.
    const known = new Set(existingCopy.join(" ").match(/\d+/g) ?? []);
    if (digits.some((d) => !known.has(d))) return "number we cannot back up";
    if (BANNED_BUTTON.test(all)) return "claim we cannot back up";
  } else if (kind === "button") {
    // The only numbers a button can back up are the ones on the page: the 3 minute quiz.
    if (digits.some((d) => d !== "3") || (digits.length && !/\b3[\u00a0 ]min/i.test(all))) return "number we cannot back up";
    if (BANNED_BUTTON.test(all)) return "claim we cannot back up";
  } else {
    if (digits.some((d) => d !== "48")) return "number we cannot back up";
    if (/\b48\b/.test(all) && !/48[\u00a0 ]hours/i.test(all)) return "48 must mean 48 hours";
    if (BANNED.test(all)) return "claim we cannot back up";
    if (/48[\u00a0 ]hours/i.test(all)) return "in 48 hours is not a claim we can make";
  }
  if (existingCopy.some((c) => norm(c) === norm(all))) return "duplicate";
  return null;
}

/** Tidies, applies the guardrails and drops duplicates inside the batch. */
export function cleanSuggestions(raw: unknown, existingCopy: string[], max = SUGGEST_COUNT, kind: SlotKind = "headline"): { ok: Suggestion[]; dropped: { text: string; why: string }[] } {
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
    const s: Suggestion = { text: nb(tidy(o.text)), emphasis: kind !== "headline" ? "" : nb(tidy(o.emphasis)), rationale: tidy(o.why ?? o.rationale).slice(0, 280) };
    const why = checkSuggestion(s, seen, kind);
    if (why) { dropped.push({ text: s.text, why }); continue; }
    if (ok.length >= max) continue;
    ok.push(s);
    seen.push(combined(s.text, s.emphasis));
  }
  return { ok, dropped };
}

export const SUGGEST_SYSTEM_BUTTON = `You write button label variants for the main button on the saabai.ai homepage. The button opens a free 3 minute quiz that gives the visitor an AI score out of 100 and leads into the Saabai Blueprint, a clear plan for where AI will save a small business time. Do not mention a delivery time.
Voice: plain, direct, Australian English, like a sensible tradie. Short words. No hype, no buzzwords, no emoji, no exclamation marks, no urgency tricks.
Hard rules:
- Never use em dashes or en dashes.
- 40 characters or fewer. No arrow or symbols, the page adds the arrow.
- Only describe what the button does: start the free quiz and get a score. Do not promise savings, prices, percentages, results, guarantees or reviews.
- The only number allowed is "3 minute" (the quiz length). No other digits.
- Avoid: best, guaranteed, proven, instant, unlock, transform, revolutionary, now, today, save.
- Each label must be meaningfully different from the others and from the existing ones (different angle, not a reword). Angles: the quiz itself, the score, finding out where AI fits, a low-effort first step.
Reply with JSON only, no markdown fence: an array of exactly 3 objects {"text": string, "why": string}. "why" is one plain sentence on the angle being tested.`;

export const suggestSystemGeneric = (noun: string, maxText: number) => `You write ${noun} variants for a page on saabai.ai, an Australian business that gives small businesses a clear plan for where AI will save them time. Do not mention a delivery time, and do not write "in 48 hours".
Voice: plain, direct, Australian English, like a sensible tradie. Short words. No hype, no buzzwords, no emoji, no exclamation marks.
Hard rules:
- Never use em dashes or en dashes.
- ${maxText} characters or fewer. Keep the same job as the current copy (same meaning and same facts), only change the angle or wording.
- Do not invent prices, savings, percentages, customer numbers, awards, guarantees, reviews or results. Only reuse numbers already in the current copy.
- Avoid: best, guaranteed, proven, instant, unlock, transform, revolutionary, now, today, save.
- Each option must be meaningfully different from the others and from the existing ones.
Reply with JSON only, no markdown fence: an array of exactly 3 objects {"text": string, "why": string}. "why" is one plain sentence on the angle being tested.`;

export const suggestSystem = (kind: SlotKind) => (kind === "button" ? SUGGEST_SYSTEM_BUTTON : kind === "headline" ? SUGGEST_SYSTEM : suggestSystemGeneric(KIND_RULES[kind].noun, KIND_RULES[kind].maxText));

export const SUGGEST_SYSTEM = `You write headline variants for saabai.ai, an Australian business that gives small businesses a clear plan for where AI will save them time. Do not write "in 48 hours" or any 48 hours delivery promise. Starter delivery stays on the Blueprint page.
Voice: plain, direct, Australian English, like a sensible tradie explaining things. Short words. No hype, no buzzwords, no emoji, no exclamation marks, no question marks needed.
Hard rules:
- Never use em dashes or en dashes. Use a comma or full stop.
- Only claim a clear plan for where AI fits in the business. Do not invent prices, savings, percentages, customer numbers, awards, guarantees, reviews, results, or a delivery time.
- No digits.
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
    `Write 3 new ${KIND_RULES[kindOf(exp)].noun} variants.`,
  ].filter(Boolean).join("\n");
}

/** Pulls the JSON array out of a model reply, tolerating a stray fence or preamble. */
export function parseModelJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = t.indexOf("["), end = t.lastIndexOf("]");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(t.slice(start, end + 1)); } catch { return null; }
}
