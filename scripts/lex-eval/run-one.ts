/**
 * Runs one eval question through the same prompt, tools and step limit as /api/lex-research
 * and scores it. Used by scripts/lex-eval/cli.ts and by a preview-only test route.
 * Needs ANTHROPIC_API_KEY / OPENAI_API_KEY and SERPER_API_KEY in the environment.
 */
import { generateText, stepCountIs } from "ai";
import { modelFromSpec } from "../../lib/chat-config";
import { getLexConfig } from "../../lib/lex-config";
import { buildLexResearchTools, LEX_RESEARCH_MAX_STEPS } from "../../lib/lex-research-tools";
import type { EvalQuestion } from "./questions";

/** US$ per million tokens (input, output). Update if list prices change. */
export const PRICES: Record<string, { in: number; out: number }> = {
  "anthropic:claude-sonnet-4-6": { in: 3, out: 15 },
  "openai:gpt-4o": { in: 2.5, out: 10 },
};

export type EvalResult = {
  id: string; model: string; ms: number; ok: boolean; error?: string;
  inputTokens: number; outputTokens: number; costUsd: number; steps: number; toolCalls: number;
  expectHit: string[]; expectMiss: string[]; wrongHit: string[]; accuracy: number;
  citations: number; urls: number; groundedUrls: number; ungroundedUrls: string[];
  emDashes: number; markdown: number; chars: number; text: string;
};

const CITE_RE = /\[(19|20)\d{2}\]\s+[A-Z][A-Za-z]*\s+\d+|\b(TR|TD|PCG|LCR|PS LA|TA)\s?\d{4}\/\d+|\bs(?:ection|s)?\.?\s?\d+[A-Z]*(?:-\d+)?(?:\(\d+\))?|\(\d{4}\)\s+\d+\s+CLR\s+\d+/g;
const URL_RE = /https?:\/\/[^\s)\]>,"']+/g;

export function scoreAnswer(q: EvalQuestion, text: string, toolUrls: Set<string>) {
  const expectHit = q.expect.filter((e) => new RegExp(e.re, "i").test(text)).map((e) => e.label);
  const expectMiss = q.expect.filter((e) => !new RegExp(e.re, "i").test(text)).map((e) => e.label);
  const wrongHit = (q.wrong ?? []).filter((w) => new RegExp(w.re, "i").test(text)).map((w) => w.label);
  const urls = [...new Set((text.match(URL_RE) ?? []).map((u) => u.replace(/[.;:]+$/, "")))];
  const norm = (u: string) => u.replace(/^https?:\/\/(www\d?\.)?/, "").replace(/[#?].*$/, "").replace(/\/$/, "");
  const known = new Set([...toolUrls].map(norm));
  const ungroundedUrls = urls.filter((u) => !known.has(norm(u)));
  const accuracy = Math.max(0, expectHit.length / q.expect.length - 0.5 * wrongHit.length);
  return {
    expectHit, expectMiss, wrongHit, accuracy,
    citations: (text.match(CITE_RE) ?? []).length,
    urls: urls.length, groundedUrls: urls.length - ungroundedUrls.length, ungroundedUrls,
    emDashes: (text.match(/[\u2014\u2013]/g) ?? []).length,
    markdown: (text.match(/\*\*|^#+\s/gm) ?? []).length,
  };
}

export async function runOne(spec: string, q: EvalQuestion): Promise<EvalResult> {
  const config = getLexConfig("lex-internal");
  const t0 = Date.now();
  try {
    const r = await generateText({
      model: modelFromSpec(spec, "eval"),
      system: config.systemPrompt,
      messages: [{ role: "user", content: q.q }],
      tools: buildLexResearchTools(config),
      stopWhen: stepCountIs(LEX_RESEARCH_MAX_STEPS),
    });
    const ms = Date.now() - t0;
    const toolUrls = new Set<string>();
    let toolCalls = 0;
    for (const step of r.steps) {
      toolCalls += step.toolCalls.length;
      for (const tr of step.toolResults) {
        const out = (tr as { output?: { results?: { url?: string }[] } }).output;
        for (const x of out?.results ?? []) if (x.url) toolUrls.add(x.url);
      }
    }
    const inputTokens = r.totalUsage.inputTokens ?? 0;
    const outputTokens = r.totalUsage.outputTokens ?? 0;
    const p = PRICES[spec] ?? { in: 0, out: 0 };
    const costUsd = (inputTokens * p.in + outputTokens * p.out) / 1e6;
    return { id: q.id, model: spec, ms, ok: true, inputTokens, outputTokens, costUsd, steps: r.steps.length, toolCalls, chars: r.text.length, text: r.text, ...scoreAnswer(q, r.text, toolUrls) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { id: q.id, model: spec, ms: Date.now() - t0, ok: false, error: msg.replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-***").slice(0, 300), inputTokens: 0, outputTokens: 0, costUsd: 0, steps: 0, toolCalls: 0, expectHit: [], expectMiss: q.expect.map((e) => e.label), wrongHit: [], accuracy: 0, citations: 0, urls: 0, groundedUrls: 0, ungroundedUrls: [], emDashes: 0, markdown: 0, chars: 0, text: "" };
  }
}
