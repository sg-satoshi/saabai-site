/**
 * Draft Documents form model. The checklist text (the "Parties" input sent to /api/lex-draft) stays the
 * single source of truth: each top-level "Label: answer" line is one field, indented lines below it belong
 * to that field. Prefilled answers carry their source as "(from file, cl x, p n)" and doubts as
 * "[VERIFY: why]". The form, the checklist rail and the review gate are all generated from this, so they
 * can never drift apart.
 *
 * Gating (decided 29 Oct): Lex does not draft while any answer is still marked Verify. The user confirms
 * or corrects each one first.
 */

export type FormGroupId = "trust" | "deed" | "trustee" | "beneficiaries" | "streaming" | "signing" | "details";
export const GROUP_LABELS: Record<FormGroupId, string> = {
  trust: "Trust", deed: "Deed", trustee: "Trustee", beneficiaries: "Beneficiaries", streaming: "Streaming", signing: "Signing", details: "Details",
};

export type FieldStatus = "verify" | "confirmed" | "entered" | "needs";

export type FormField = {
  key: string;
  label: string;
  group: FormGroupId;
  optional: boolean;
  /** Answer without source and Verify tags. */
  value: string;
  /** Raw answer as written in the checklist (tags included). */
  raw: string;
  /** Template answer (often the choices, e.g. "yes / no"). */
  hint: string;
  /** Set when the template offers a short list of choices. */
  options?: string[];
  sources: string[];
  verifyReasons: string[];
  /** Field spans several lines (e.g. the beneficiaries list). */
  multiline: boolean;
  status: FieldStatus;
  filled: boolean;
};

const TRUST_GROUPS: Array<[RegExp, FormGroupId]> = [
  [/^(Trust name|State the trust was settled|Vesting date)/, "trust"],
  [/^(Trust deed date|Deed clause numbers|Deed defines income|Do capital gains form part)/, "deed"],
  [/^(Trustee type|Trustee name|Directors or individual trustees)/, "trustee"],
  [/^(Capital gains to stream|Franked distributions to stream)/, "streaming"],
  [/^(Financial year ending|If a past year|Date, time and place|How entitlements|Company beneficiaries)/, "signing"],
  [/^(Beneficiar|Any former spouse|Fallback beneficiary|Family trust election|Named or primary|Default beneficiaries)/, "beneficiaries"],
];
const OPTIONAL = /^(Capital gains to stream|Franked distributions to stream|If a past year|Company beneficiaries|Beneficiary classes under the deed|Named or primary beneficiaries under the deed|Default beneficiaries under the deed)/;

export const TRUST_GROUP_ORDER: FormGroupId[] = ["trust", "deed", "trustee", "beneficiaries", "streaming", "signing"];

function groupFor(label: string, trust: boolean): FormGroupId {
  if (!trust) return "details";
  for (const [re, g] of TRUST_GROUPS) if (re.test(label)) return g;
  return "beneficiaries";
}

type Line = { label: string; sep: string; answer: string; sub: string[] };

/** Splits checklist text into labelled lines. Text before the first label line is kept as a preamble. */
function splitLines(text: string): { pre: string[]; lines: Line[] } {
  const pre: string[] = [];
  const lines: Line[] = [];
  for (const l of text.split("\n")) {
    const m = !/^\s/.test(l) ? l.match(/^([^:?]{2,240}?)([:?])\s?(.*)$/) : null;
    if (m) lines.push({ label: m[1].trim(), sep: m[2], answer: m[3], sub: [] });
    else if (lines.length) lines[lines.length - 1].sub.push(l);
    else pre.push(l);
  }
  return { pre, lines };
}

function joinLines(pre: string[], lines: Line[]): string {
  const out = [...pre];
  for (const l of lines) out.push(`${l.label}${l.sep}${l.answer ? " " + l.answer : ""}`, ...l.sub);
  return out.join("\n");
}

const SOURCE_RE = /\s*\(from ([^()]*(?:\([^()]*\)[^()]*)*)\)/g;
const VERIFY_RE = /\s*\[VERIFY:?\s*([^\]]*)\]/gi;

export function parseAnswer(raw: string): { value: string; sources: string[]; verifyReasons: string[] } {
  const sources: string[] = [];
  const verifyReasons: string[] = [];
  let value = raw.replace(VERIFY_RE, (_, why: string) => { verifyReasons.push(why.trim() || "check this answer"); return ""; });
  value = value.replace(SOURCE_RE, (_, s: string) => { if (!sources.includes(s.trim())) sources.push(s.trim()); return ""; });
  return { value: value.replace(/\s+([,.;])/g, "$1").replace(/\s{2,}/g, " ").trim(), sources, verifyReasons };
}

function optionsOf(hint: string): string[] | undefined {
  if (!hint.includes(" / ") || /[:]/.test(hint)) return undefined;
  const opts = hint.split(" / ").map((s) => s.trim()).filter(Boolean);
  return opts.length >= 2 && opts.length <= 4 && opts.every((o) => o.length <= 40) ? opts : undefined;
}

function isFilled(value: string, sub: string[], hint: string, templateSub: string[]): boolean {
  const subAns = sub.map((s) => s.replace(/^\s*\d+\.\s*/, "").trim()).filter(Boolean);
  if (subAns.length && sub.join("\n") !== templateSub.join("\n")) return true;
  if (!value) return false;
  return !/^\d+\.?$/.test(value);
}

/** Builds the form from the checklist text and its template. */
export function parseForm(parties: string, template: string, trust: boolean): FormField[] {
  const t = splitLines(template);
  const { lines } = splitLines(parties.trim() ? parties : template);
  const seen = new Map<string, number>();
  return lines.map((l) => {
    const n = (seen.get(l.label) ?? 0) + 1; seen.set(l.label, n);
    const tl = t.lines.find((x) => x.label === l.label);
    const hint = tl?.answer ?? "";
    const raw = [l.answer, ...l.sub].join("\n");
    const a = parseAnswer(l.answer);
    const subParsed = l.sub.map(parseAnswer);
    const sources = [...a.sources, ...subParsed.flatMap((s) => s.sources)];
    const verifyReasons = [...a.verifyReasons, ...subParsed.flatMap((s) => s.verifyReasons)];
    const options = optionsOf(hint);
    const value = l.sub.length ? [a.value, ...l.sub.map((s, i) => s.replace(/\S.*$/, subParsed[i].value))].filter((x, i) => i > 0 || x).join("\n") : a.value;
    const blankDefault = !!hint.trim() && a.value === hint.trim() && !/^(none|30 June)/i.test(hint.trim());
    const filled = isFilled(blankDefault ? "" : a.value, l.sub, hint, tl?.sub ?? []);
    const status: FieldStatus = verifyReasons.length ? "verify" : !filled ? "needs" : sources.length ? "confirmed" : "entered";
    return {
      key: n > 1 ? `${l.label}#${n}` : l.label, label: l.label, group: groupFor(l.label, trust), optional: OPTIONAL.test(l.label),
      value: blankDefault ? "" : value, raw, hint, options, sources: [...new Set(sources)], verifyReasons, multiline: l.sub.length > 0, status, filled,
    };
  });
}

function findLine(lines: Line[], key: string): Line | undefined {
  const [label, nth] = key.split("#");
  return lines.filter((l) => l.label === label)[(Number(nth) || 1) - 1];
}

/** Sets a field's answer. Keeps its sources; keeps Verify unless confirm is true (confirm clears it). */
export function setAnswer(parties: string, template: string, key: string, value: string, opts: { confirm?: boolean } = {}): string {
  const { pre, lines } = splitLines(parties.trim() ? parties : template);
  const l = findLine(lines, key);
  if (!l) return parties;
  const cur = parseAnswer([l.answer, ...l.sub].join(" "));
  const src = cur.sources.map((s) => ` (from ${s})`).join("");
  const ver = opts.confirm ? "" : cur.verifyReasons.map((r) => ` [VERIFY: ${r}]`).join("");
  const listOnly = l.sub.length > 0 && !parseAnswer(l.answer).value;
  const parts = value.split("\n");
  const first = listOnly ? "" : parts.shift() ?? "";
  l.answer = `${first.trim()}${src}${ver}`.trim();
  if (l.sub.length || parts.length) l.sub = parts.map((r) => (/^\s/.test(r) ? r : `  ${r}`));
  return joinLines(pre, lines);
}

/** Clears Verify on a field without changing the answer (the user checked the source). */
export function confirmField(parties: string, template: string, key: string): string {
  const f = parseForm(parties, template, true).find((x) => x.key === key);
  return f ? setAnswer(parties, template, key, f.value, { confirm: true }) : parties;
}

export function verifyItems(fields: FormField[]): FormField[] {
  return fields.filter((f) => f.status === "verify");
}

/** Draft stays disabled until every Verify is resolved. */
export function draftGate(fields: FormField[]): { ok: boolean; reason: string; open: FormField[] } {
  const open = verifyItems(fields);
  if (!open.length) return { ok: true, reason: "", open };
  return { ok: false, reason: `Verify the ${open.length === 1 ? "answer" : `${open.length} answers`} above to draft.`, open };
}

export function formProgress(fields: FormField[]) {
  const req = fields.filter((f) => !f.optional);
  return { required: req.length, filled: req.filter((f) => f.filled).length, verify: verifyItems(fields).length };
}

/** Group ids in display order, only those that have fields. */
export function groupsOf(fields: FormField[]): FormGroupId[] {
  const order: FormGroupId[] = [...TRUST_GROUP_ORDER, "details"];
  return order.filter((g) => fields.some((f) => f.group === g));
}

/** One field's answer for the review summary: no hint or default text, no empty "label:" pieces, no bare list markers. */
export function summaryValue(f: FormField): string {
  if (!f.filled || !f.value.trim()) return "";
  const hint = f.hint.trim();
  if (hint && f.value.trim() === hint) return "";
  const hintParens = hint.match(/\([^()]*\)/g) ?? [];
  const parts: string[] = [];
  for (const line of f.value.split("\n")) {
    let l = line.replace(/^\s*\d+[.)]\s*/, "").trim();
    for (const h of hintParens) l = l.split(h).join("");
    // Leftover template choices in a partly answered line: "yes (specified individual: ) / no".
    if (hint.includes(" / ")) l = l.replace(/\s*\/\s*(?:yes|no|not sure)\b/gi, "").replace(/^(?:yes|no|not sure)\s*\/\s*/i, "");
    l = l.replace(/\s*\([^()]*:\s*\)/g, "");
    for (const piece of l.split(/;|\.\s+/)) {
      const p = piece.replace(/\s{2,}/g, " ").trim();
      if (!p || /^[^:]*:\s*$/.test(p) || /^\d+[.)]?$/.test(p)) continue;
      parts.push(p.replace(/[\s,;]+$/, ""));
    }
  }
  return parts.join("; ");
}

/** Review summary for a group of fields. */
export function groupSummary(fields: FormField[]): string {
  return fields.map(summaryValue).filter(Boolean).join(". ");
}

/**
 * Server side of the Verify gate for checklist document types. Returns a plain message when the
 * checklist still has an unresolved Verify, else null. Types without a checklist template are not gated.
 */
export function serverVerifyGate(parties: unknown, template: string | undefined, trust: boolean): string | null {
  if (typeof parties !== "string" || !parties.trim()) return null;
  if (!template) return VERIFY_MARK.test(parties) ? verifyMessage(1) : null;
  const open = draftGate(parseForm(parties, template, trust)).open.length;
  if (VERIFY_MARK.test(parties) || open) return verifyMessage(Math.max(open, 1));
  return null;
}

/** Any "[VERIFY" marker, any case or spacing. Blocks drafting for every document type. */
export const VERIFY_MARK = /\[\s*verify/i;

function verifyMessage(n: number): string {
  return `Lex cannot draft yet. ${n === 1 ? "One answer still needs" : `${n} answers still need`} verifying. Confirm or correct ${n === 1 ? "it" : "them"} in the form, then draft again.`;
}
