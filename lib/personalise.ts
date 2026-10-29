/**
 * Personalisation tokens for admin broadcasts (#341).
 * Syntax: {{field}} or {{field|fallback}}. Only fields that really exist on the Subscriber
 * record are offered. Email, IP, consent, source and dates are deliberately not offered.
 * Blank values use the token's fallback, else the field's default, so "Hi ," never happens.
 * Unknown tokens are replaced by their fallback (or removed), never sent as raw braces.
 * Safe in the browser and on the server (no Node imports).
 */
import { escapeHtml } from "./html-escape";

export type MergeField = {
  key: "firstName" | "industry" | "city" | "region" | "country";
  label: string;
  /** Used when the subscriber's value is blank and the token has no fallback. */
  fallback: string;
  /** Used for the hello@ test send and the preview when no recipient is selected. */
  sample: string;
};

export const MERGE_FIELDS: readonly MergeField[] = [
  { key: "firstName", label: "First name", fallback: "there", sample: "Sam" },
  { key: "industry", label: "Industry", fallback: "your industry", sample: "Professional services" },
  { key: "city", label: "City", fallback: "your area", sample: "Gold Coast" },
  { key: "region", label: "State or region", fallback: "your state", sample: "Queensland" },
  { key: "country", label: "Country", fallback: "Australia", sample: "Australia" },
];

const FIELD = new Map(MERGE_FIELDS.map((f) => [f.key.toLowerCase(), f]));
export type MergeValues = Partial<Record<MergeField["key"], string | null | undefined>>;

/** The token an "Insert field" control adds, fallback included. */
export function mergeToken(f: Pick<MergeField, "key" | "fallback">): string {
  return `{{${f.key}|${f.fallback}}}`;
}

export const SAMPLE_VALUES: MergeValues = Object.fromEntries(MERGE_FIELDS.map((f) => [f.key, f.sample]));

// {{ name }} or {{ name | fallback }}. The fallback cannot contain braces.
const TOKEN = /\{\{\s*([A-Za-z][A-Za-z0-9_]{0,30})\s*(?:\|([^{}]{0,80}))?\}\}/g;
// Anything still looking like a token after substitution (malformed or nested) is removed.
const LEFTOVER = /\{\{[^{}]{0,120}\}\}/g;

function decodeBasic(s: string): string {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"")
    .replace(/&#39;|&#x27;|&apos;/g, "'").replace(/&amp;/g, "&");
}

function clean(v: unknown): string {
  return String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function resolve(key: string, fallback: string | undefined, values: MergeValues): string {
  const f = FIELD.get(key.toLowerCase());
  const fb = fallback !== undefined ? clean(decodeBasic(fallback)) : undefined;
  if (!f) return fb ?? "";
  const v = clean(values[f.key]);
  return v || fb || f.fallback;
}

/** For HTML bodies. Values and fallbacks are HTML-escaped (fallbacks typed in the editor arrive escaped once; they are decoded first so nothing is double-escaped). */
export function personaliseHtml(html: string, values: MergeValues): string {
  return html.replace(TOKEN, (_m, key: string, fb?: string) => escapeHtml(resolve(key, fb, values))).replace(LEFTOVER, "");
}

/** For plain text such as the subject line. No HTML escaping; control characters and line breaks are stripped. */
export function personaliseText(text: string, values: MergeValues): string {
  return text.replace(TOKEN, (_m, key: string, fb?: string) => resolve(key, fb, values)).replace(LEFTOVER, "").replace(/[\r\n]+/g, " ");
}

/** True when the server would print this value rather than the fallback (same clean() rule, so "Other" counts). */
export function hasValue(v: unknown): boolean {
  return clean(v) !== "";
}

export function valuesFor(sub: Partial<Record<MergeField["key"], string | null | undefined>>): MergeValues {
  const out: MergeValues = {};
  for (const f of MERGE_FIELDS) out[f.key] = sub[f.key] ?? "";
  return out;
}
