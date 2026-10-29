/**
 * Supporting documents for Lex Draft Documents: what Lex reads from each uploaded file, how facts from
 * several files are merged, and how they prefill the document type's checklist.
 *
 * Generic across every document type: a "profile" lists the fields to look for. The Trust Distribution
 * Resolution has a hand-tuned trust deed profile; every other type uses its checklist lines, or its
 * required elements, as the fields. Each field comes back as { value, source (file, clause, page, quote),
 * confidence, verify, why }, so a later step-by-step assistant can reuse the same result.
 *
 * Merge rules (pure, tested in tests/lex-trust-deed.test.ts):
 *  - Each field has preferred sources (e.g. the ACN prefers an ASIC extract, the family trust election prefers the election form).
 *  - A deed of variation that amends a deed field overrides the original deed and any earlier variation (latest date wins).
 *  - Variations are listed from every file. Values from files that disagree, with no variation explaining it, are marked Verify.
 *  - Anything the model was not sure of, or that has no clause or page, is marked Verify.
 */
import { z } from "zod";

export const DOC_KINDS = ["deed", "variation", "family-trust-election", "asic-extract", "minutes", "agreement", "amendment", "correspondence", "other"] as const;
export type DocKind = (typeof DOC_KINDS)[number];
export const DOC_KIND_LABELS: Record<DocKind, string> = {
  deed: "Trust deed",
  variation: "Deed of variation",
  "family-trust-election": "Family trust election",
  "asic-extract": "ASIC company extract",
  minutes: "Prior resolution or minutes",
  agreement: "Agreement or main document",
  amendment: "Amendment or variation",
  correspondence: "Letter, email or notes",
  other: "Other document",
};

export const DEED_FIELDS = [
  { key: "trustName", label: "Trust name" },
  { key: "deedDate", label: "Deed date" },
  { key: "settlementState", label: "State the trust was settled in" },
  { key: "governingLaw", label: "Governing law clause" },
  { key: "vestingDate", label: "Vesting date" },
  { key: "clauseIncomeDefinition", label: "Clause: income definition" },
  { key: "clauseAppointIncome", label: "Clause: power to appoint income" },
  { key: "clauseDetermineIncome", label: "Clause: power to determine income or classes" },
  { key: "clauseStreaming", label: "Clause: streaming power" },
  { key: "clauseDefaultBeneficiaries", label: "Clause: default beneficiaries" },
  { key: "clauseResolutionDeadline", label: "Clause: resolution deadline" },
  { key: "clauseExcludedPersons", label: "Clause: excluded persons" },
  { key: "trusteeName", label: "Trustee name" },
  { key: "trusteeAcn", label: "Trustee ACN" },
  { key: "trusteeDirectors", label: "Trustee directors" },
  { key: "beneficiaryClasses", label: "Beneficiary classes" },
  { key: "namedBeneficiaries", label: "Named or primary beneficiaries" },
  { key: "defaultBeneficiaries", label: "Default beneficiaries" },
  { key: "incomeDefinition", label: "Deed defines income as" },
  { key: "capitalGainsInIncome", label: "Capital gains form part of income" },
  { key: "familyTrustElection", label: "Family trust election" },
] as const;
export type DeedFieldKey = (typeof DEED_FIELDS)[number]["key"];

/** One field Lex looks for. key is stable (used in the model output and by any later guided assistant). */
export type FieldSpec = { key: string; label: string; hint?: string };
export type ExtractProfile = {
  id: string;
  /** Upload button label. */
  uploadLabel: string;
  fields: FieldSpec[];
  /** Fields only the governing document or an amendment can set (e.g. deed terms). */
  governingTerms?: Set<string>;
  /** Preferred source kinds per field, best first. */
  prefer?: Record<string, DocKind[]>;
  /** Extra system guidance for this kind of document set. */
  guidance?: string;
};

/** Fields only a deed or variation can set (the governing terms). */
const DEED_TERMS = new Set<string>([
  "deedDate", "settlementState", "governingLaw", "vestingDate", "clauseIncomeDefinition", "clauseAppointIncome", "clauseDetermineIncome",
  "clauseStreaming", "clauseDefaultBeneficiaries", "clauseResolutionDeadline", "clauseExcludedPersons", "beneficiaryClasses",
  "namedBeneficiaries", "defaultBeneficiaries", "incomeDefinition", "capitalGainsInIncome",
]);

/** Preferred source kinds per field, best first. A field not listed uses the default order. */
const PREFER: Record<string, DocKind[]> = {
  trusteeAcn: ["asic-extract", "variation", "deed", "family-trust-election", "minutes"],
  trusteeDirectors: ["asic-extract", "minutes", "variation", "deed"],
  trusteeName: ["variation", "asic-extract", "deed", "family-trust-election", "minutes"],
  familyTrustElection: ["family-trust-election", "minutes", "variation", "deed"],
  trustName: ["variation", "deed", "family-trust-election", "minutes", "asic-extract"],
};
const DEFAULT_ORDER: DocKind[] = ["variation", "amendment", "deed", "agreement", "family-trust-election", "asic-extract", "minutes", "correspondence", "other"];

// ── Model output ────────────────────────────────────────────────────────────

const FieldSchema = z.object({
  key: z.string(),
  value: z.string(),
  clause: z.string().nullish(),
  page: z.number().int().nullish(),
  quote: z.string().nullish(),
  sure: z.boolean(),
  /** For a variation or amendment: true when this file amends or replaces this term. */
  amends: z.boolean().nullish(),
});
export const FileFactsSchema = z.object({
  kind: z.enum(DOC_KINDS),
  documentDate: z.string().nullish(),
  title: z.string().nullish(),
  fields: z.array(FieldSchema),
  notes: z.array(z.string()).nullish(),
});
export type FileFacts = z.infer<typeof FileFactsSchema>;

const TRUST_GUIDANCE = [
  "The files are for an Australian discretionary trust: a trust deed, deeds of variation, a family trust election (ATO form), an ASIC company extract for the trustee, or prior trustee resolutions or minutes.",
  "For a deed of variation set amends=true only for terms it changes or replaces. A variation does not restate unchanged terms.",
  "Clause fields: value is the clause number and a few words. incomeDefinition: accounting income, net income under s95, or trustee may determine, as written. capitalGainsInIncome: yes, no, or trustee may determine, with the reason. familyTrustElection: whether made, specified individual, income year.",
].join("\n");

export const TRUST_DEED_PROFILE: ExtractProfile = {
  id: "trust-deed",
  uploadLabel: "Upload Trust Deed or supporting documents",
  fields: DEED_FIELDS.map((f) => ({ key: f.key, label: f.label })),
  governingTerms: DEED_TERMS,
  prefer: PREFER,
  guidance: TRUST_GUIDANCE,
};

const GENERIC_FIELDS: FieldSpec[] = [
  { key: "parties", label: "Parties (names, ABN or ACN, roles)" },
  { key: "addresses", label: "Addresses for notices" },
  { key: "keyDates", label: "Key dates (commencement, term, deadlines)" },
  { key: "money", label: "Amounts, fees or consideration" },
  { key: "keyTerms", label: "Key terms already agreed" },
  { key: "governingLaw", label: "Governing law and jurisdiction" },
];

/** Stable key from a checklist label. */
export function fieldKey(label: string): string {
  const w = label.toLowerCase().replace(/\(.*?\)/g, " ").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean).slice(0, 6);
  return w.map((x, i) => (i ? x[0].toUpperCase() + x.slice(1) : x)).join("") || "field";
}

/** Fields from a checklist template: each "Label: ..." line (indented sub-lines are skipped). */
export function fieldsFromTemplate(template: string): FieldSpec[] {
  const out: FieldSpec[] = [];
  for (const line of template.split("\n")) {
    if (/^\s/.test(line)) continue;
    const m = line.match(/^([^:?]+[:?])\s*(.*)$/);
    if (!m) continue;
    const label = m[1].replace(/[:?]$/, "").trim();
    const key = fieldKey(label);
    if (!out.some((f) => f.key === key)) out.push({ key, label, ...(m[2].trim() ? { hint: m[2].trim() } : {}) });
  }
  return out;
}

type DocTypeLike = { id: string; name: string; category: string; partiesTemplate?: string; requiredElements?: string[] };

/** Which fields to look for, for a Draft Documents type (or custom / blank). */
export function profileFor(doc?: DocTypeLike): ExtractProfile {
  if (doc?.id === "trust-distribution-resolution") return TRUST_DEED_PROFILE;
  const uploadLabel = doc?.category === "trust" ? "Upload Trust Deed or supporting documents" : "Upload supporting documents";
  if (doc?.partiesTemplate) return { id: doc.id, uploadLabel, fields: fieldsFromTemplate(doc.partiesTemplate) };
  if (doc?.requiredElements?.length) {
    const fields = doc.requiredElements.slice(0, 24).map((e, i) => ({ key: `e${i + 1}`, label: e.split(/[:(]/)[0].trim().slice(0, 80), hint: e }));
    return { id: doc.id, uploadLabel, fields: [...GENERIC_FIELDS.slice(0, 1), ...fields] };
  }
  return { id: doc?.id ?? "custom", uploadLabel, fields: GENERIC_FIELDS };
}

export function extractSystem(profile: ExtractProfile): string {
  return [
    "You read Australian legal documents and pull out facts exactly as written. You never guess.",
    "Return kind (deed, variation, family-trust-election, asic-extract, minutes, agreement, amendment, correspondence, other), documentDate (the date the document was made, as written, DD Month YYYY if possible), a short title, and fields.",
    "Only include a field when this document actually states it. Use only the field keys listed. For each: value as written (short), clause number as written (e.g. 'cl 1.1(k)' or 'Schedule item 3'), page from the nearest preceding [Page N] marker when present, a short quote of the supporting words, and sure=true only when the words are clear and unambiguous.",
    "An amending document (variation, amendment) sets amends=true only for terms it changes or replaces.",
    profile.guidance ?? "",
    "Fields (key: what to find):",
    ...profile.fields.map((f) => `- ${f.key}: ${f.label}${f.hint && f.hint !== f.label ? ` (${f.hint})` : ""}`),
    "Never include tax file numbers. Placeholders like {{PERSON_1}} are masked names: copy them exactly.",
    "No em dashes. Use a comma, colon or full stop.",
  ].filter(Boolean).join("\n");
}

// ── Merge ───────────────────────────────────────────────────────────────────

export type Source = { file: string; kind: DocKind; clause?: string; page?: number; quote?: string; documentDate?: string };
export type Confidence = "high" | "medium" | "low" | "none";
export type MergedField = {
  key: string;
  label: string;
  value: string;
  verify: boolean;
  /** high: sure, cited and uncontested. medium: one doubt. low: several. none: not found. */
  confidence: Confidence;
  why?: string;
  source?: Source;
  /** Earlier values this one replaced (e.g. the original deed term a variation changed). */
  replaced?: Array<{ value: string; source: Source }>;
  /** Set when the user changed the value by hand. */
  edited?: boolean;
};
export type FileResult = { file: string; kind?: DocKind; documentDate?: string; title?: string; error?: "scanned" | "unreadable" | "unsupported" | "too-large" | "empty";
  /** Distinct details masked in this file before the model read it, by type (counts only). */
  privacy?: { masked: number; types: Record<string, number> } };
export type MergedDeed = {
  profile: string; fields: MergedField[]; variations: Array<{ file: string; date?: string; title?: string }>; files: FileResult[] };

/** Parses "1 March 2019", "01/03/2019", "2019-03-01". Returns ms or NaN. */
export function parseDocDate(s?: string | null): number {
  if (!s) return NaN;
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  m = t.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1]);
  m = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:day\s+of\s+)?([A-Za-z]+),?\s+(\d{4})/);
  if (m) {
    const mi = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(m[2].slice(0, 3).toLowerCase());
    if (mi >= 0) return Date.UTC(+m[3], mi, +m[1]);
  }
  return NaN;
}

const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");

const GOVERNING = new Set<DocKind>(["deed", "agreement"]);
const AMENDING = new Set<DocKind>(["variation", "amendment"]);

type Cand = { value: string; sure: boolean; amends: boolean; source: Source; date: number; order: number };

export function mergeFacts(files: Array<{ file: string; facts: FileFacts }>, profile: ExtractProfile = TRUST_DEED_PROFILE): MergedDeed {
  const known = new Set(profile.fields.map((f) => f.key));
  const terms = profile.governingTerms ?? new Set<string>();
  const byKey = new Map<string, Cand[]>();
  files.forEach(({ file, facts }, order) => {
    const date = parseDocDate(facts.documentDate);
    for (const f of facts.fields) {
      const value = String(f.value ?? "").trim();
      if (!value || !known.has(f.key)) continue;
      // Only a deed or variation sets the deed's terms; a mention elsewhere is a hint, kept only if nothing better exists.
      const list = byKey.get(f.key) ?? [];
      list.push({
        value, sure: !!f.sure, amends: (facts.kind === "variation" || facts.kind === "amendment") && !!f.amends, date, order,
        source: { file, kind: facts.kind, clause: f.clause ?? undefined, page: f.page ?? undefined, quote: f.quote ?? undefined, documentDate: facts.documentDate ?? undefined },
      });
      byKey.set(f.key, list);
    }
  });

  const fields: MergedField[] = profile.fields.map(({ key, label }) => {
    const cands = byKey.get(key) ?? [];
    if (!cands.length) return { key, label, value: "", verify: true, confidence: "none", why: "Not found in the uploaded files." };
    const prefer = profile.prefer?.[key] ?? DEFAULT_ORDER;
    const rank = (c: Cand) => (prefer.indexOf(c.source.kind) < 0 ? 99 : prefer.indexOf(c.source.kind));
    const later = (a: Cand, b: Cand) => (Number.isNaN(a.date) || Number.isNaN(b.date) ? a.order - b.order : a.date - b.date);

    // Variations that amend this term: the latest one wins over the deed and earlier variations.
    const amending = cands.filter((c) => c.amends).sort(later);
    let pick: Cand;
    let replaced: Cand[] = [];
    if (amending.length) {
      pick = amending[amending.length - 1];
      replaced = cands.filter((c) => c !== pick && (GOVERNING.has(c.source.kind) || c.amends));
    } else {
      const gov = (c: Cand) => GOVERNING.has(c.source.kind) || AMENDING.has(c.source.kind);
      const pool = terms.has(key) && cands.some(gov) ? cands.filter(gov) : cands;
      pick = [...pool].sort((a, b) => rank(a) - rank(b) || later(b, a))[0];
    }
    const reasons: string[] = [];
    if (!pick.sure) reasons.push("Lex was not sure of the wording");
    if (!pick.source.clause && !pick.source.page && pick.source.kind !== "asic-extract") reasons.push("no clause or page found");
    const rivals = cands.filter((c) => c !== pick && !replaced.includes(c) && norm(c.value) !== norm(pick.value));
    if (rivals.length) reasons.push(`files disagree (${rivals.map((r) => r.source.file).join(", ")} says "${rivals[0].value}")`);
    if (amending.length > 1 && amending.some((a) => Number.isNaN(a.date))) reasons.push("variation dates unclear, check which is latest");
    return {
      key, label, value: pick.value, verify: reasons.length > 0, confidence: reasons.length === 0 ? "high" : reasons.length === 1 ? "medium" : "low", ...(reasons.length ? { why: capitalise(reasons.join("; ")) } : {}),
      source: pick.source,
      ...(replaced.length ? { replaced: replaced.map((r) => ({ value: r.value, source: r.source })) } : {}),
    };
  });

  const variations = files
    .filter((f) => AMENDING.has(f.facts.kind))
    .map((f) => ({ file: f.file, date: f.facts.documentDate ?? undefined, title: f.facts.title ?? undefined }))
    .sort((a, b) => (parseDocDate(a.date) || 0) - (parseDocDate(b.date) || 0));
  return { profile: profile.id, fields, variations, files: files.map((f) => ({ file: f.file, kind: f.facts.kind, documentDate: f.facts.documentDate ?? undefined, title: f.facts.title ?? undefined })) };
}

function capitalise(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** "deed.pdf, cl 12.3, p 4" */
export function sourceLabel(s?: Source): string {
  if (!s) return "";
  return [s.file, s.clause, s.page ? `p ${s.page}` : ""].filter(Boolean).join(", ");
}

// ── Checklist prefill ───────────────────────────────────────────────────────

function cell(f: MergedField | undefined): string {
  if (!f || !f.value) return "[VERIFY: not found in the uploaded files]";
  const src = sourceLabel(f.source);
  return `${f.value}${src ? ` (from ${src})` : ""}${f.verify ? ` [VERIFY: ${f.why ?? "check against the deed"}]` : ""}`;
}

/**
 * Fills the deed lines of the checklist from the reviewed fields and leaves every other line (the year,
 * the decision, the shares) for the user. Lines are matched by their label so template edits stay safe.
 */
export function prefillChecklist(template: string, deed: MergedDeed): string {
  const f = (k: DeedFieldKey) => deed.fields.find((x) => x.key === k);
  if (deed.profile !== TRUST_DEED_PROFILE.id) return prefillGeneric(template, deed);
  const clauses = ([
    ["income definition", "clauseIncomeDefinition"], ["power to appoint income", "clauseAppointIncome"], ["power to determine income or classes", "clauseDetermineIncome"],
    ["streaming power", "clauseStreaming"], ["default beneficiaries", "clauseDefaultBeneficiaries"], ["resolution deadline", "clauseResolutionDeadline"], ["excluded persons", "clauseExcludedPersons"],
  ] as const).map(([l, k]) => `${l}: ${cell(f(k))}`).join("; ");
  const variations = deed.variations.length ? deed.variations.map((v) => `${v.date ?? "date not found [VERIFY]"} (${v.file})`).join(", ") : "none found in the uploaded files";
  const fills: Array<[RegExp, string]> = [
    [/^Trust name:.*$/m, `Trust name: ${cell(f("trustName"))}`],
    [/^Trust deed date and any deeds of variation \(dates\):.*$/m, `Trust deed date and any deeds of variation (dates): ${cell(f("deedDate"))}. Variations: ${variations}`],
    [/^State the trust was settled in, and governing law clause in the deed:.*$/m, `State the trust was settled in, and governing law clause in the deed: ${cell(f("settlementState"))}; governing law: ${cell(f("governingLaw"))}`],
    [/^Vesting date under the deed:.*$/m, `Vesting date under the deed: ${cell(f("vestingDate"))}`],
    [/^Deed clause numbers \(.*\):.*$/m, `Deed clause numbers: ${clauses}`],
    [/^Trustee name\(s\) \(and ACN if a company\):.*$/m, `Trustee name(s) (and ACN if a company): ${cell(f("trusteeName"))}, ACN ${cell(f("trusteeAcn"))}${f("trusteeDirectors")?.value ? `; directors: ${cell(f("trusteeDirectors"))}` : ""}`],
    [/^Deed defines income as:.*$/m, `Deed defines income as: ${cell(f("incomeDefinition"))}`],
    [/^Do capital gains form part of income under the deed\?.*$/m, `Do capital gains form part of income under the deed? ${cell(f("capitalGainsInIncome"))}`],
    [/^Family trust election in place\?.*$/m, `Family trust election in place? ${cell(f("familyTrustElection"))}. Interposed entity elections: `],
  ];
  let out = template;
  for (const [re, line] of fills) out = out.replace(re, line);
  const extra = [
    `Beneficiary classes under the deed: ${cell(f("beneficiaryClasses"))}`,
    `Named or primary beneficiaries under the deed: ${cell(f("namedBeneficiaries"))}`,
    `Default beneficiaries under the deed: ${cell(f("defaultBeneficiaries"))}`,
  ].join("\n");
  return out.replace(/^(Beneficiaries and shares of the whole.*)$/m, `${extra}\n$1`);
}

/** Any other type: fills matching "Label:" lines, and adds the rest under a heading. */
function prefillGeneric(template: string, deed: MergedDeed): string {
  let out = template;
  const rest: string[] = [];
  for (const fld of deed.fields) {
    if (!fld.value) continue;
    const re = new RegExp(`^${fld.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[:?].*$`, "m");
    const line = `${fld.label}: ${cell(fld)}`;
    if (out && re.test(out)) out = out.replace(re, line);
    else rest.push(line);
  }
  if (!rest.length) return out;
  return `${out.trim() ? out.trimEnd() + "\n\n" : ""}From the uploaded documents (check each line):\n${rest.join("\n")}`;
}

/** Draft Documents prep state kept per user (see lib/lex-draft-progress.ts). */
export type PrepState = { extracted: MergedDeed | null; manual: string[] };

// ── Limits ──────────────────────────────────────────────────────────────────

export const DEED_LIMITS = { maxFiles: 8, maxFileBytes: 10 * 1024 * 1024, maxTotalBytes: 30 * 1024 * 1024, maxCharsPerFile: 60_000 } as const;
