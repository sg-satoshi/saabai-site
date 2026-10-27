/** Bulk FAQ import: paste format, CSV, limits, duplicates, and the server save check. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LIMITS, validateContent, type Faq } from "../lib/chatbot/core";
import {
  FAQ_PASTE_EXAMPLE,
  appendFaqs,
  faqsToAppend,
  parseFaqImport,
  reviewFaqImport,
  type FaqImportCandidate,
} from "../lib/chatbot/faq-import";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (f: string) => readFileSync(ROOT + f, "utf8");

function candidates(text: string, format: "auto" | "paste" | "csv" = "auto", skip: number[] = []): { parsed: ReturnType<typeof parseFaqImport>; rows: FaqImportCandidate[] } {
  const parsed = parseFaqImport(text, format);
  const rows = parsed.rows.map((r, i) => ({ ...r, skip: skip.includes(i) }));
  return { parsed, rows };
}

function reviewed(text: string, existing: Faq[] = [], format: "auto" | "paste" | "csv" = "auto", skip: number[] = []) {
  const { parsed, rows } = candidates(text, format, skip);
  return { parsed, review: reviewFaqImport(rows, existing), add: faqsToAppend(reviewFaqImport(rows, existing)) };
}

test("paste example: two pairs, blank line between them, then the server accepts the append", () => {
  const { parsed, review, add } = reviewed(FAQ_PASTE_EXAMPLE, [{ q: "Existing?", a: "Already saved" }]);
  assert.equal(parsed.format, "paste");
  assert.equal(parsed.notices.length, 0);
  assert.deepEqual(add, [
    { q: "What are your opening hours?", a: "Monday to Friday, 9am to 5pm." },
    { q: "Do you travel to the Gold Coast?", a: "Yes. The call-out fee is $99." },
  ]);
  assert.equal(review.every((r) => r.ready), true);
  const merged = appendFaqs([{ q: "Existing?", a: "Already saved" }], add);
  assert.equal(merged[0].q, "Existing?");
  const saved = validateContent({ faqs: merged });
  assert.equal(saved.ok, true);
  if (saved.ok) assert.deepEqual(saved.value.knowledge?.faqs, merged);
});

test("paste: pairs without a blank line, Question/Answer labels, and a multi-line answer", () => {
  const text = [
    "Question: First?",
    "Answer: One.",
    "Q: Second?",
    "A: Line one.",
    "Line two.",
    "",
    "Q: Third?",
    "A: Three.",
  ].join("\n");
  const { add } = reviewed(text);
  assert.deepEqual(add, [
    { q: "First?", a: "One." },
    { q: "Second?", a: "Line one.\nLine two." },
    { q: "Third?", a: "Three." },
  ]);
});

test("paste: a missing answer is not ready and uses the server message", () => {
  const { parsed, review } = reviewed("Q: Only a question\n\nNot a pair\n");
  assert.equal(review.length, 1);
  assert.equal(review[0].ready, false);
  assert.equal(review[0].a, "");
  const server = validateContent({ faqs: [{ q: "Only a question", a: "" }] });
  assert.equal(server.ok, false);
  if (!server.ok) assert.equal(review[0].messages[0], server.errors.faq0);
  assert.ok(parsed.notices.some((n) => n.line === 3));
});

test("length limits match the server, including the exact boundary", () => {
  const qOk = "q".repeat(LIMITS.q);
  const aOk = "a".repeat(LIMITS.a);
  const fine = reviewed(`Q: ${qOk}\nA: ${aOk}`);
  assert.equal(fine.review[0].ready, true);
  assert.equal(validateContent({ faqs: fine.add }).ok, true);

  const qBad = "q".repeat(LIMITS.q + 1);
  const tooQ = reviewed(`Q: ${qBad}\nA: ok`);
  const serverQ = validateContent({ faqs: [{ q: qBad, a: "ok" }] });
  assert.equal(tooQ.review[0].ready, false);
  assert.equal(serverQ.ok, false);
  if (!serverQ.ok) assert.equal(tooQ.review[0].messages[0], serverQ.errors.faq0);

  const aBad = "a".repeat(LIMITS.a + 1);
  const tooA = reviewed(`Q: ok\nA: ${aBad}`);
  const serverA = validateContent({ faqs: [{ q: "ok", a: aBad }] });
  assert.equal(tooA.review[0].ready, false);
  assert.equal(serverA.ok, false);
  if (!serverA.ok) assert.ok(tooA.review[0].messages.includes(serverA.errors.faq0));

  const both = reviewed(`Q: ${qBad}\nA: ${aBad}`);
  assert.equal(both.review[0].ready, false);
  assert.equal(both.review[0].messages.length, 2);
  assert.equal(validateContent({ faqs: [{ q: qBad, a: aBad }] }).ok, false);
});

test("a control character the server strips does not count toward the limit", () => {
  const q = `${"q".repeat(LIMITS.q)}\u0001`;
  const { add } = reviewed(`Q: ${q}\nA: ok`);
  assert.equal(add.length, 1);
  assert.equal(add[0].q, "q".repeat(LIMITS.q));
  assert.equal(validateContent({ faqs: add }).ok, true);
});

test("exact duplicates are skipped; a different case is kept; skipping the first copy keeps the second", () => {
  const existing = [{ q: "Hours?", a: "9 to 5" }];
  const text = "Q: Hours?\nA: 9 to 5\n\nQ: hours?\nA: 9 to 5\n\nQ: Hours? \nA:  9 to 5";
  const { review, add } = reviewed(text, existing);
  assert.match(review[0].messages.join(" "), /Already in the list/);
  assert.equal(review[1].ready, true);
  assert.match(review[2].messages.join(" "), /Already in the list/);
  assert.deepEqual(add, [{ q: "hours?", a: "9 to 5" }]);

  const dup = "Q: New?\nA: Yes\n\nQ: New?\nA: Yes";
  const both = reviewed(dup);
  assert.equal(both.review[0].ready, true);
  assert.match(both.review[1].messages.join(" "), /another row above/);
  const second = reviewed(dup, [], "auto", [0]);
  assert.equal(second.review[0].ready, false);
  assert.equal(second.review[1].ready, true);
});

test("the 20 question cap uses the server message and frees a space when an earlier row is left out", () => {
  const existing = Array.from({ length: LIMITS.faqs - 1 }, (_, i) => ({ q: `Have ${i}?`, a: "Yes" }));
  const text = "Q: One?\nA: A\n\nQ: Two?\nA: B";
  const { review } = reviewed(text, existing);
  assert.equal(review[0].ready, true);
  assert.equal(review[1].ready, false);
  const server = validateContent({ faqs: Array.from({ length: LIMITS.faqs + 1 }, () => ({ q: "q", a: "a" })) });
  assert.equal(server.ok, false);
  if (!server.ok) assert.ok(review[1].messages.includes(server.errors.faqs));

  const freed = reviewed(text, existing, "auto", [0]);
  assert.equal(freed.review[0].ready, false);
  assert.equal(freed.review[1].ready, true);

  const full = reviewed("Q: More?\nA: No", Array.from({ length: LIMITS.faqs }, (_, i) => ({ q: `Q${i}`, a: "A" })));
  assert.equal(full.add.length, 0);
  assert.equal(validateContent({ faqs: [...full.add, ...Array.from({ length: LIMITS.faqs + 1 }, () => ({ q: "q", a: "a" }))] }).ok, false);
});

test("append keeps every existing row, skips duplicates and over-long rows, and stops at the cap", () => {
  const existing = [{ q: "Keep me", a: "Please" }, { q: "", a: "" }];
  const snapshot = existing.map((f) => ({ ...f }));
  const incoming = [
    { q: "Keep me", a: "Please" },
    { q: "  New?  ", a: " Yes " },
    { q: "q".repeat(LIMITS.q + 1), a: "too long" },
    { q: "", a: "no question" },
  ];
  const merged = appendFaqs(existing, incoming);
  assert.deepEqual(existing, snapshot);
  assert.deepEqual(merged, [
    { q: "Keep me", a: "Please" },
    { q: "", a: "" },
    { q: "New?", a: "Yes" },
  ]);
  const saved = validateContent({ faqs: merged });
  assert.equal(saved.ok, true);
  if (saved.ok) assert.deepEqual(saved.value.knowledge?.faqs, [
    { q: "Keep me", a: "Please" },
    { q: "New?", a: "Yes" },
  ]);
  assert.equal(validateContent({ faqs: [{ q: "q".repeat(LIMITS.q + 1), a: "too long" }] }).ok, false);

  const full = Array.from({ length: LIMITS.faqs }, (_, i) => ({ q: `Q${i}`, a: "A" }));
  assert.equal(appendFaqs(full, [{ q: "Extra?", a: "No" }]).length, LIMITS.faqs);
});

test("CSV: header, quoted commas, BOM, multiline answer, semicolon, and a row to fix", () => {
  const csv = `\uFEFF"question","answer"\r\n"Hours?","Monday, 9 to 5"\r\n"Closed?","We are closed\r\non Sunday"\r\n`;
  const { parsed, add } = reviewed(csv, [], "csv");
  assert.equal(parsed.format, "csv");
  assert.deepEqual(add, [
    { q: "Hours?", a: "Monday, 9 to 5" },
    { q: "Closed?", a: "We are closed\non Sunday" },
  ]);

  const semi = reviewed("question;answer\nFee?;$99\n", [], "csv");
  assert.deepEqual(semi.add, [{ q: "Fee?", a: "$99" }]);

  const broken = reviewed("question,answer\nOnly a question\n", [], "csv");
  assert.equal(broken.review[0].ready, false);
  assert.equal(broken.review[0].q, "Only a question");
  assert.ok(broken.parsed.notices.length > 0);

  const extra = reviewed("question,answer\nFee?,$99, plus GST\n", [], "auto");
  assert.equal(extra.add[0].a, "$99, plus GST");
  assert.match(extra.review[0].warning ?? "", /extra columns/i);
  assert.equal(validateContent({ faqs: extra.add }).ok, true);
});

test("a CSV header wins over a Q: cell, and an empty paste adds nothing", () => {
  const { parsed, add } = reviewed("question,answer\nQ: Hours?,9 to 5\n");
  assert.equal(parsed.format, "csv");
  assert.deepEqual(add, [{ q: "Q: Hours?", a: "9 to 5" }]);
  const empty = parseFaqImport("  \n");
  assert.equal(empty.format, "empty");
  assert.deepEqual(empty.rows, []);
});

test("the editor appends through the importer and still saves with the existing action", () => {
  const editor = read("app/saabai-admin/chatbots/ChatbotEditor.tsx");
  assert.match(editor, /FaqBulkAdd/);
  assert.match(editor, /appendFaqs\(cur\.faqs, rows\)/);
  assert.match(editor, /action: "save_all"/);
  assert.match(read("app/saabai-admin/chatbots/FaqBulkAdd.tsx"), /parseFaqImport/);
  assert.match(read("app/api/admin/chatbots/route.ts"), /validateContent\(b\.content\)/);
});
