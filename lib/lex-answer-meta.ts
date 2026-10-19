/**
 * After a research answer has streamed: check its citations against the sources the
 * server actually saw, then ask the model for per-conclusion confidence as
 * schema-checked JSON (generateObject + zod), and tighten it with deterministic rules.
 */
import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import { noDashes } from "./no-dashes";
import {
  SourceRegistry, verifyCitations, buildMeta, renderMarkers, pinpointLabel,
  type LexAnswerMeta, type LexCitation, type LexConclusion,
} from "./lex-sources";

export const ConclusionsSchema = z.object({
  conclusions: z.array(z.object({
    text: z.string().describe("One conclusion from the answer, in one or two plain sentences"),
    confidence: z.enum(["high", "moderate", "low"]),
    basis: z.string().describe("Why that confidence: settled rule, fact dependent, conflicting authority, no primary source, etc."),
    citeIds: z.array(z.string()).describe("Source ids (S1, S2...) that support it, only from the list given"),
  })).max(8),
  verify: z.array(z.string()).max(8).describe("Specific things the lawyer should check before relying on the answer"),
});

const RANK = { low: 0, moderate: 1, high: 2 } as const;
const cap = (c: LexConclusion["confidence"], max: LexConclusion["confidence"]) => (RANK[c] > RANK[max] ? max : c);

/** Deterministic limits: no checked primary support means it can't be "high"; no support at all means "low". */
export function tightenConclusions(raw: z.infer<typeof ConclusionsSchema>["conclusions"], reg: SourceRegistry, citations: LexCitation[]): LexConclusion[] {
  const status = new Map<string, LexCitation["status"]>();
  for (const c of citations) if (c.id) { const prev = status.get(c.id); if (!prev || c.status === "verified") status.set(c.id, c.status); }
  return raw.map((c) => {
    const ids = [...new Set(c.citeIds.map((x) => x.trim().toUpperCase()))].filter((id) => reg.get(id));
    let confidence = c.confidence;
    let basis = noDashes(c.basis.trim()).slice(0, 400);
    if (!ids.length) { confidence = "low"; basis = `${basis} No source from this search supports it.`.trim(); }
    else {
      const strong = ids.some((id) => { const s = reg.get(id)!; return status.get(id) === "verified" && ["binding", "primary", "commissioner_bound"].includes(s.authority); });
      if (!strong) confidence = cap(confidence, "moderate");
      if (ids.every((id) => ["pinpoint_not_found", "unknown_source"].includes(status.get(id) ?? "not_checked"))) confidence = "low";
    }
    return { text: noDashes(c.text.trim()).slice(0, 500), confidence, basis, citeIds: ids };
  });
}

export async function buildAnswerMeta(model: LanguageModel, answerText: string, reg: SourceRegistry, opts: { timeoutMs?: number } = {}): Promise<LexAnswerMeta> {
  const citations = verifyCitations(answerText, reg);
  const problems = citations.filter((c) => c.status !== "verified").map((c) =>
    c.id ? `[${c.n}${c.pinpoint ? " " + pinpointLabel(c.pinpoint) : ""}] ${c.note}` : `A statement marked as unsupported: check it against a primary source`);
  if (!answerText.trim()) return buildMeta(reg, citations, [], problems);

  const sourceList = reg.list().map((s) => {
    const cs = citations.filter((c) => c.id === s.id).map((c) => c.status);
    return `${s.id} | ${s.typeLabel} | ${s.title} | ${cs.length ? cs.join(",") : "not cited"}`;
  }).join("\n");

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 20000);
    const { object } = await generateObject({
      model,
      schema: ConclusionsSchema,
      abortSignal: ctrl.signal,
      maxOutputTokens: 1200,
      system:
        "You check a legal research answer written for an Australian lawyer. List its main conclusions (at most 8), each with a confidence level and the reason, " +
        "and the specific checks the lawyer should do. high = settled rule supported by a binding or primary source that was read and verified. " +
        "moderate = supported but fact dependent, discretionary, or only by persuasive or unread sources. low = unsupported, contested, or from model knowledge. " +
        "Only use source ids from the list. Plain English, Australian spelling, no em dashes.",
      prompt: `SOURCES (id | type | title | citation check):\n${sourceList || "(none)"}\n\nANSWER:\n${renderMarkers(answerText, citations).slice(0, 12000)}`,
    }).finally(() => clearTimeout(timer));
    const conclusions = tightenConclusions(object.conclusions, reg, citations);
    const verify = [...new Set([...problems, ...object.verify.map((v) => noDashes(v.trim()).slice(0, 300))])].slice(0, 10);
    return buildMeta(reg, citations, conclusions, verify);
  } catch (err) {
    console.error("[lex-answer-meta]", err instanceof Error ? err.name : err);
    return buildMeta(reg, citations, [], [...problems, "The confidence check could not run for this answer. Treat every conclusion as unchecked."]);
  }
}
