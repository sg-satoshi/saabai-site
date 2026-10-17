import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { QUESTIONS, scoreAnswers } from "../lib/blueprint";
import { buildScorePdf, pdfSafe } from "../lib/score-pdf";
import { buildConsentRecord, cleanPageUrl, SCORE_CONSENT_WORDING } from "../lib/score-consent";
import { buildVisitorEmail, type MailSender, type ScoreMail } from "../lib/score-email";

const answersFor = (pick: (i: number, n: number) => number) => Object.fromEntries(QUESTIONS.map((q, i) => [q.id, Math.min(q.options.length - 1, pick(i, q.options.length))]));

test("PDF renders one A4 page for low, mid and high scores", async () => {
  for (const pick of [() => 0, (i: number) => i % 3, (_: number, n: number) => n - 1]) {
    const r = scoreAnswers(answersFor(pick));
    const bytes = await buildScorePdf({ result: r });
    assert.equal(Buffer.from(bytes.slice(0, 5)).toString(), "%PDF-");
    const doc = await PDFDocument.load(bytes);
    assert.equal(doc.getPageCount(), 1);
    assert.ok(Math.abs(doc.getPage(0).getWidth() - 595.28) < 1);
  }
});
test("pdfSafe strips characters the standard fonts cannot encode", () => {
  assert.equal(pdfSafe("a \u2014 b \u2192 c \u2713 \u201cq\u201d"), "a - b -> c  \"q\"");
});
test("consent record uses server wording, sanitised page URL, ticked only when true", () => {
  const now = new Date("2026-10-17T00:00:00Z");
  const c = buildConsentRecord({ accepted: true, pageUrl: "https://www.saabai.ai/score?x=1#h" }, now);
  assert.deepEqual(c, { accepted: true, wording: SCORE_CONSENT_WORDING, at: now.toISOString(), pageUrl: "https://www.saabai.ai/score", form: "score_result_pdf" });
  assert.equal(buildConsentRecord({ accepted: "yes", pageUrl: undefined }, now).accepted, false);
  assert.equal(cleanPageUrl("https://evil.com/score"), "https://www.saabai.ai/score");
  assert.equal(cleanPageUrl("javascript:alert(1)"), "https://www.saabai.ai/score");
  assert.equal(SCORE_CONSENT_WORDING, "Yes, email me my PDF results and the occasional Saabai update.");
});
test("visitor email: PDF attached when requested, plain otherwise; mocked sender only", async () => {
  const r = scoreAnswers(answersFor((i) => i % 3));
  const sent: ScoreMail[] = [];
  const fake: MailSender = async (m) => { sent.push(m); return {}; };
  const withPdf = await buildVisitorEmail({ from: "t@example.test", email: "a@example.test", result: r, withPdf: true });
  await fake(withPdf);
  assert.equal(sent[0].attachments?.[0].filename, "Saabai-AI-Readiness-Report.pdf");
  assert.equal(sent[0].attachments![0].content.subarray(0, 5).toString(), "%PDF-");
  assert.match(sent[0].html, /attached as a PDF/);
  const plain = await buildVisitorEmail({ from: "t@example.test", email: "a@example.test", result: r, withPdf: false });
  assert.equal(plain.attachments, undefined);
  assert.match(plain.subject, /^Your AI Readiness Score: \d+\/100$/);
});
