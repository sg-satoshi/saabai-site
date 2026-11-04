/**
 * Merge tags the SUNDER email sender actually fills in. The worker, test send,
 * "view in browser" and the editor preview all pass only firstName to
 * renderMarketingEmail, so that is the only field offered. The unsubscribe link
 * lives in the locked footer and is not a tag. Rendering is lib/personalise.ts,
 * which strips any unknown tag, so raw {{...}} never reaches a subscriber.
 */
import { MERGE_FIELDS, mergeToken, type MergeField } from "../personalise";

export const SUNDER_MERGE_FIELDS: readonly MergeField[] = MERGE_FIELDS.filter((f) => f.key === "firstName");

export const SUNDER_SAMPLE_VALUES = Object.fromEntries(SUNDER_MERGE_FIELDS.map((f) => [f.key, f.sample]));

export function sunderToken(key: MergeField["key"]): string {
  const f = SUNDER_MERGE_FIELDS.find((x) => x.key === key);
  if (!f) throw new Error(`Not a SUNDER merge field: ${key}`);
  return mergeToken(f);
}

const KNOWN = new Set(SUNDER_MERGE_FIELDS.map((f) => f.key.toLowerCase()));
const TOKEN = /\{\{\s*([A-Za-z][A-Za-z0-9_]{0,30})\s*(?:\|([^{}]{0,80}))?\}\}/g;

/** Tags the sender would drop: unknown fields, or anything with braces that is not a valid tag. */
export function mergeTagIssues(texts: string[]): string[] {
  const out = new Set<string>();
  for (const t of texts) {
    if (!t || !t.includes("{")) continue;
    for (const m of t.matchAll(TOKEN)) if (!KNOWN.has(m[1].toLowerCase())) out.add(m[0]);
    const rest = t.replace(TOKEN, "");
    for (const m of rest.matchAll(/\{\{[^]{0,40}?(\}\}|$)|\{[^{}]{0,40}\}\}/g)) if (m[0].trim()) out.add(m[0].slice(0, 40));
  }
  return [...out];
}

/** Insert a token into a value at the given selection, returning the new value and caret. */
export function insertToken(value: string, token: string, start: number | null, end: number | null): { value: string; caret: number } {
  const s = start ?? value.length;
  const e = end ?? s;
  const next = value.slice(0, s) + token + value.slice(e);
  return { value: next, caret: s + token.length };
}
