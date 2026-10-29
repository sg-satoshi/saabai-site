/**
 * "What you'll need" per Draft Documents type: the documents and facts to have ready before starting.
 * Items tick themselves when a matching file is uploaded, a matching field is extracted, or a matching
 * checklist line is filled in. The user can also tick an item by hand. Missing items never block drafting:
 * Lex marks them Verify.
 */
import type { DocKind, MergedDeed } from "./lex-doc-extract";

export type Need = {
  id: string;
  label: string;
  /** Ticks when a file of one of these kinds is uploaded. */
  kinds?: DocKind[];
  /** Ticks when any of these extracted fields has a value. */
  fields?: string[];
  /** Ticks when a checklist line starting with one of these labels has an answer. */
  lines?: string[];
  optional?: boolean;
};

const TRUST_RESOLUTION: Need[] = [
  { id: "deed", label: "Trust deed (the original, signed)", kinds: ["deed"], fields: ["deedDate", "clauseAppointIncome"] },
  { id: "variations", label: "Any deeds of variation", kinds: ["variation"], optional: true },
  { id: "fte", label: "Family trust election form, if one was made", kinds: ["family-trust-election"], fields: ["familyTrustElection"], lines: ["Family trust election in place?"], optional: true },
  { id: "asic", label: "ASIC company extract for a company trustee", kinds: ["asic-extract"], fields: ["trusteeAcn"], lines: ["Trustee name(s)"] },
  { id: "minutes", label: "Last year's resolution or minutes", kinds: ["minutes"], optional: true },
  { id: "beneficiaries", label: "Who gets what share this year", lines: ["  1."] },
  { id: "income", label: "Income figures and any capital gains or franked dividends", lines: ["Capital gains to stream", "Franked distributions to stream"] },
  { id: "when", label: "Date, time and place the decision was made, and who was there", lines: ["Date, time and place"] },
];

const BY_CATEGORY: Record<string, Need[]> = {
  trust: [
    { id: "deed", label: "Trust deed and any variations", kinds: ["deed", "variation"] },
    { id: "trustee", label: "Trustee details (ASIC extract for a company)", kinds: ["asic-extract"] },
    { id: "people", label: "Settlor, appointor and beneficiary names" },
  ],
  "family-law": [
    { id: "people", label: "Full names, dates of birth and addresses of both parties" },
    { id: "assets", label: "List of assets, debts and super with values" },
    { id: "orders", label: "Any existing orders or agreements", kinds: ["agreement"], optional: true },
  ],
  commercial: [
    { id: "parties", label: "Each party's name, ABN or ACN and address", fields: ["parties"] },
    { id: "terms", label: "Agreed terms (price, term, deliverables)", fields: ["keyTerms", "money"] },
    { id: "prior", label: "Any existing agreement or term sheet", kinds: ["agreement", "amendment"], optional: true },
  ],
  employment: [
    { id: "parties", label: "Employer and employee names and addresses", fields: ["parties"] },
    { id: "role", label: "Role, start date, pay and award or agreement", fields: ["keyDates", "money"] },
    { id: "prior", label: "Any offer letter or earlier contract", kinds: ["agreement", "correspondence"], optional: true },
  ],
  property: [
    { id: "parties", label: "Parties and the property address and title details", fields: ["parties"] },
    { id: "terms", label: "Price or rent, dates and special conditions", fields: ["money", "keyDates"] },
    { id: "prior", label: "Title search, contract or lease to build from", kinds: ["agreement"], optional: true },
  ],
};

export function needsFor(typeId: string, category?: string): Need[] {
  if (typeId === "trust-distribution-resolution") return TRUST_RESOLUTION;
  return BY_CATEGORY[category ?? ""] ?? [
    { id: "parties", label: "Names and details of everyone involved", fields: ["parties"] },
    { id: "facts", label: "The key facts, dates and amounts", fields: ["keyDates", "money", "keyTerms"] },
    { id: "docs", label: "Any document you are building from", kinds: ["agreement"], optional: true },
  ];
}

/** True when a checklist line starting with the label has a real answer (not the template's options). */
function lineFilled(text: string, label: string, template?: string): boolean {
  const lines = text.split("\n");
  const tLine = template?.split("\n").find((l) => l.startsWith(label));
  return lines.some((l) => {
    if (!l.startsWith(label)) return false;
    const ans = l.slice(label.length).replace(/^[^:?]*[:?]/, "").trim();
    const tAns = tLine ? tLine.slice(label.length).replace(/^[^:?]*[:?]/, "").trim() : "";
    return !!ans && ans !== tAns && !/^\d+\.?$/.test(ans);
  });
}

export function needDone(n: Need, s: { extracted?: MergedDeed | null; parties: string; template?: string; manual?: string[] }): boolean {
  if (s.manual?.includes(n.id)) return true;
  if (n.kinds && s.extracted?.files.some((f) => f.kind && n.kinds!.includes(f.kind))) return true;
  if (n.fields && s.extracted?.fields.some((f) => n.fields!.includes(f.key) && !!f.value)) return true;
  if (n.lines && n.lines.some((l) => lineFilled(s.parties, l, s.template))) return true;
  return false;
}
