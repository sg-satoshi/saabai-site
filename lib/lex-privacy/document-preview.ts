/**
 * Privacy preview for an uploaded document. Runs the same masking the Lex routes use
 * (patterns, the matter's known parties and the open-source name model) over the extracted
 * text, without calling any model, so the firm sees how many details will be masked before
 * Lex reads the file. Returns counts by type only, never the values or the masked text.
 */
import { LexMasker } from "./mask";
import { detectNames } from "./ner";
import type { MatterParty } from "./parties";
import type { DocumentPrivacy } from "./document-privacy-text";

export type { DocumentPrivacy };


export async function previewDocumentMasking(text: string, parties?: MatterParty[] | null, opts?: { budgetMs?: number }): Promise<DocumentPrivacy> {
  if (!text || !text.trim()) return { masked: 0, types: {}, ner: "skipped" };
  try {
    const masker = new LexMasker();
    if (parties?.length) masker.addParties(parties);
    let ner: DocumentPrivacy["ner"] = "skipped";
    try {
      const r = await detectNames([text], { budgetMs: opts?.budgetMs });
      ner = r.status;
      if (r.parties.length) masker.addParties(r.parties, "ner");
    } catch {
      ner = "failed";
    }
    masker.mask(text);
    const types: Record<string, number> = {};
    for (const token of Object.keys(masker.map)) {
      const type = token.replace(/^\{\{/, "").replace(/_\d+\}\}$/, "");
      types[type] = (types[type] ?? 0) + 1;
    }
    return { masked: Object.keys(masker.map).length, types, ner };
  } catch {
    return { masked: 0, types: {}, ner: "skipped", error: true };
  }
}

