/**
 * Production QA fixes: review JSON parsing, dash filter, ATO mirror, narration, compare dividers, draft date.
 *   npx tsx --test tests/lex-qa-fixes.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { noDashes, noDashesTransform } from "../lib/no-dashes";
import { ReviewReportSchema, parseReviewOutput, normaliseReview } from "../lib/lex-review-parse";
import { austliiMirrorUrl, fetchSourceText, SOURCE_BROWSER_UA } from "../lib/lex-sources";
import { brisbaneLongDate, cleanLexOutput, dropNarrationTransform, stripLeadingNarration } from "../lib/lex-output";
import { CONFIDENCE_TIMEOUT_MS } from "../lib/lex-answer-meta";
import { getLexConfig } from "../lib/lex-config";

const TR = "https://www.ato.gov.au/law/view/document?docid=TXR/TR20224/NAT/ATO/00001";
const MIRROR = "https://www.austlii.edu.au/au/other/rulings/ato/ATOTR/2022/TR20224.html";

test("dash filter rewrites em dashes and the spaced double hyphen prompts were teaching", () => {
  assert.equal(noDashes("CITATIONS -- NON-NEGOTIABLE"), "CITATIONS, NON-NEGOTIABLE");
  assert.equal(noDashes("DRAFT -- Please review and verify"), "DRAFT, Please review and verify");
  assert.equal(noDashes("Yeah — that's the point"), "Yeah, that's the point");
  assert.equal(noDashes("9 -- 5"), "9-5");
  assert.equal(noDashes("A well-known rule."), "A well-known rule.");
  assert.ok(!/[\u2012-\u2015]| -- /.test(noDashes("Cap -- missing — indemnity")));
});

test("spaced double hyphen split across stream chunks is still rewritten", async () => {
  const parts = [
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", text: "DRAFT -- " },
    { type: "text-delta", id: "t1", text: "Please review" },
    { type: "text-end", id: "t1" },
  ];
  const ts = (noDashesTransform() as unknown as (o: unknown) => TransformStream)({ tools: {}, stopStream: () => {} });
  const out: { type: string; text?: string }[] = [];
  const w = ts.writable.getWriter();
  const reader = ts.readable.getReader();
  const done = (async () => { for (;;) { const r = await reader.read(); if (r.done) break; out.push(r.value); } })();
  for (const p of parts) await w.write(p);
  await w.close();
  await done;
  assert.equal(out.filter((p) => p.type === "text-delta").map((p) => p.text).join(""), "DRAFT, Please review");
});

test("review schema has no length limits, and fenced or prefaced JSON still parses", () => {
  const json = JSON.stringify(z.toJSONSchema(ReviewReportSchema));
  assert.ok(!/"maxItems"|"minItems"|"maxLength"|"minLength"/.test(json), json.slice(0, 400));
  const sample = {
    documentType: "NDA",
    direction: "incoming",
    jurisdiction: "QLD",
    overallScore: 140,
    riskLevel: "medium",
    summary: "One issue — the indemnity",
    findings: [{ severity: "critical", axis: "risk", clauseRef: "cl 4", title: "Cap -- missing", issue: "Uncapped — exposure", recommendation: "Cap it" }],
    missingClauses: [],
    legislationConflicts: [],
    recommendedActions: ["Check s 18 of the ACL"],
    wordCount: 10,
    clauseCount: 2,
  };
  const fenced = "Review complete.\n```json\n" + JSON.stringify(sample) + "\n```\nLet me know.";
  const report = normaliseReview(parseReviewOutput(fenced));
  assert.equal(report.documentType, "NDA");
  assert.equal(report.overallScore, 100);
  assert.equal(report.findings[0].id, "f1");
  assert.equal(report.findings[0].title, "Cap, missing");
  assert.equal(report.summary, "One issue, the indemnity");
  assert.ok(!/[\u2012-\u2015]| -- /.test(JSON.stringify(report)));
  assert.throws(() => parseReviewOutput("no object here"));
});

test("ATO ruling pages that 403 do not fall back to AustLII (AustLII access paused), browser user agent kept", async () => {
  assert.equal(austliiMirrorUrl(TR), MIRROR); // helper kept for when AustLII gives permission
  assert.match(SOURCE_BROWSER_UA, /Chrome\/\d/);
  assert.ok(!/SaabaiLex|compatible;/i.test(SOURCE_BROWSER_UA));
  const calls: string[] = [];
  const fetcher = async (url: string) => {
    calls.push(url);
    return new Response("blocked", { status: 403, headers: { "content-type": "text/html" } });
  };
  const got = await fetchSourceText(TR, fetcher);
  assert.deepEqual(calls, [TR], "no AustLII request");
  assert.equal(got.ok, false);
});

test("narration before a tool call is dropped; the answer step is kept", async () => {
  assert.equal(
    stripLeadingNarration("Good. I have enough to draft this.\n\n1. Parties\nThe trustee is appointed."),
    "1. Parties\nThe trustee is appointed.",
  );
  assert.equal(
    stripLeadingNarration("Let me run all searches for the Act.\n\nSection 109D deems the loan a dividend."),
    "Section 109D deems the loan a dividend.",
  );
  assert.equal(stripLeadingNarration("Good faith is required under the clause."), "Good faith is required under the clause.");

  const parts = [
    { type: "start-step" },
    { type: "text-start", id: "n1" },
    { type: "text-delta", id: "n1", text: "Let me run all searches now." },
    { type: "text-end", id: "n1" },
    { type: "tool-call", toolCallId: "c1", toolName: "searchAustLII" },
    { type: "finish-step" },
    { type: "start-step" },
    { type: "text-start", id: "a1" },
    { type: "text-delta", id: "a1", text: "Good. I have enough.\n\nDRAFT: Deed: 19 October 2026\n\n1. The trustee holds the fund." },
    { type: "text-end", id: "a1" },
    { type: "finish-step" },
  ];
  const ts = (dropNarrationTransform() as unknown as (o: unknown) => TransformStream)({ tools: {}, stopStream: () => {} });
  const out: { type: string; text?: string }[] = [];
  const w = ts.writable.getWriter();
  const reader = ts.readable.getReader();
  const done = (async () => { for (;;) { const r = await reader.read(); if (r.done) break; out.push(r.value); } })();
  for (const p of parts) await w.write(p);
  await w.close();
  await done;
  const text = out.filter((p) => p.type === "text-delta").map((p) => p.text).join("");
  assert.ok(!/Let me run|I have enough/.test(text), text);
  assert.match(text, /DRAFT: Deed/);
  assert.ok(out.some((p) => p.type === "tool-call"));
});

test("compare dividers are removed and the draft is dated in Brisbane", () => {
  const cleaned = cleanLexOutput("KEY DIFFERENCES\n════════════════\nThe indemnity is uncapped -- a real risk.\n\n═══\nRECOMMENDATION\n---\nPrefer document A.");
  assert.ok(!/[══]| -- /.test(cleaned), cleaned);
  assert.ok(!/^---$/m.test(cleaned), cleaned);
  assert.match(cleaned, /KEY DIFFERENCES/);
  assert.match(cleaned, /uncapped, a real risk/);
  assert.equal(brisbaneLongDate(new Date("2026-10-19T00:30:00Z")), "19 October 2026");
  assert.equal(brisbaneLongDate(new Date("2026-10-19T14:30:00Z")), "20 October 2026");
});

test("routes: review uses generateObject at 8000 tokens, confidence waits, prompts have no double hyphen", () => {
  const review = readFileSync("app/api/lex-review/route.ts", "utf8");
  assert.match(review, /generateObject(<[^(]*>)?\(/);
  assert.match(review, /maxOutputTokens:\s*8000/);
  assert.ok(!/JSON\.parse\(text\)/.test(review));
  const draft = readFileSync("app/api/lex-draft/route.ts", "utf8");
  assert.match(draft, /Australia\/Brisbane|brisbaneLongDate/);
  assert.match(draft, /dropNarrationTransform\(\)/);
  assert.ok(!draft.includes("DRAFT --"));
  assert.ok(!/[\u2014]/.test(draft));
  const research = readFileSync("app/api/lex-research/route.ts", "utf8");
  assert.match(research, /dropNarrationTransform\(\)/);
  assert.match(research, /maxDuration = 180/);
  assert.ok(CONFIDENCE_TIMEOUT_MS >= 45_000);
  const compare = readFileSync("app/api/lex-compare/route.ts", "utf8");
  assert.match(compare, /cleanLexOutput/);
  assert.match(compare, /box-drawing|divider/i);
  const internal = getLexConfig().systemPrompt;
  const external = getLexConfig("lex-external").systemPrompt;
  assert.ok(!internal.includes(" -- ") && !external.includes(" -- "));
  assert.ok(!/[\u2012-\u2015]/.test(internal + external));
  assert.match(internal, /Do not narrate your process/);
});
