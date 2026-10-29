/** Client-safe: the shape and wording of an uploaded document's privacy preview. No model code here. */

export type DocumentPrivacy = {
  /** Distinct details that will be replaced by placeholders. */
  masked: number;
  /** Counts per placeholder type, e.g. { PERSON: 3, TFN: 1 }. */
  types: Record<string, number>;
  /** Name model state for this scan. */
  ner: "on" | "off" | "unavailable" | "failed" | "partial" | "skipped";
  /** True when masking itself failed: the document will still be refused by the routes (fail closed). */
  error?: boolean;
};

const LABELS: Record<string, [string, string]> = {
  PERSON: ["name", "names"], PARTY: ["party name", "party names"], COMPANY: ["business", "businesses"],
  ORG: ["business", "businesses"], TRUST: ["trust", "trusts"], PLACE: ["place", "places"],
  EMAIL: ["email", "emails"], PHONE: ["phone number", "phone numbers"], ADDRESS: ["address", "addresses"],
  POSTCODE: ["locality", "localities"], TFN: ["TFN", "TFNs"], ABN: ["ABN", "ABNs"], ACN: ["ACN", "ACNs"],
  MEDICARE: ["Medicare number", "Medicare numbers"], BSB: ["BSB", "BSBs"], ACCOUNT: ["account number", "account numbers"],
  ID: ["ID number", "ID numbers"], URL: ["link", "links"], AMOUNT: ["amount", "amounts"],
};

/** Plain words for the UI, e.g. "4 details masked before Lex reads it: 3 names, 1 TFN". */
export function describeDocumentPrivacy(p: DocumentPrivacy | null | undefined): string {
  if (!p) return "";
  if (p.error) return "Privacy check could not run on this file, so Lex will not send it.";
  if (!p.masked) return "No personal details found to mask.";
  const parts = Object.entries(p.types)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([t, n]) => {
      const [one, many] = LABELS[t] ?? [t.toLowerCase(), `${t.toLowerCase()} items`];
      return `${n} ${n === 1 ? one : many}`;
    });
  return `${p.masked} ${p.masked === 1 ? "detail" : "details"} masked before Lex reads it: ${parts.join(", ")}`;
}

/**
 * Per-file counts from already masked text: distinct placeholders by type. Types and counts only, never
 * the values, so it is safe to return to the browser.
 */
export function privacyFromMasked(masked: string): { masked: number; types: Record<string, number> } {
  const seen = new Set<string>();
  const types: Record<string, number> = {};
  for (const m of masked.matchAll(/\{\{([A-Z]+)_\d+\}\}/g)) {
    if (seen.has(m[0])) continue;
    seen.add(m[0]);
    types[m[1]] = (types[m[1]] ?? 0) + 1;
  }
  return { masked: seen.size, types };
}
