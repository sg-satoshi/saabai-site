import { test } from "node:test";
import assert from "node:assert/strict";
import { SUNDER_MERGE_FIELDS, insertToken, mergeTagIssues, sunderToken } from "../lib/email/merge-tags";
import { renderMarketingEmail } from "../lib/email/message";
import { documentHtml, newBlock } from "../lib/email/blocks";
import { SUNDER_IDENTITY } from "../lib/email/constants";

const base = { fromName: "SUNDER", identity: SUNDER_IDENTITY, unsubUrl: "https://saabai.ai/email/u" };

test("only fields the sender fills are offered", () => {
  assert.deepEqual(SUNDER_MERGE_FIELDS.map((f) => f.key), ["firstName"]);
  assert.equal(sunderToken("firstName"), "{{firstName|there}}");
});

test("subject, html and text render the tag with value, fallback and escaping", () => {
  const b = newBlock("text");
  if (b.kind !== "text") throw new Error();
  b.text = "Hi {{firstName|mate}}, ready?";
  const html = documentHtml({ preheader: "For {{firstName}}", blocks: [b] });
  const r = renderMarketingEmail({ ...base, subject: "{{firstName|there}}, it's here", html, values: { firstName: "<Jo>" } });
  assert.equal(r.subject, "<Jo>, it's here");
  assert.ok(r.html.includes("Hi &lt;Jo&gt;, ready?"));
  assert.ok(r.text.includes("Hi <Jo>, ready?"));
  const blank = renderMarketingEmail({ ...base, subject: "Hi {{firstName}}", html, values: { firstName: "" } });
  assert.equal(blank.subject, "Hi there");
  assert.ok(blank.html.includes("Hi mate, ready?"));
});

test("unknown or broken tags are flagged in the editor and never sent raw", () => {
  assert.deepEqual(mergeTagIssues(["Hi {{firstName|there}}", "plain"]), []);
  assert.deepEqual(mergeTagIssues(["Hi {{first_name}}", "{{email}}"]), ["{{first_name}}", "{{email}}"]);
  assert.equal(mergeTagIssues(["Hi {{firstName"]).length, 1);
  assert.equal(mergeTagIssues(["Hi {firstName}}"]).length, 1);
  const r = renderMarketingEmail({ ...base, subject: "A {{first_name}} B", html: "<p>{{email}} x {{ nope }}</p>", values: { firstName: "Jo" } });
  for (const s of [r.subject, r.html, r.text]) assert.ok(!/\{\{[^}]*\}\}/.test(s), s);
});

test("insertToken puts the tag at the caret or replaces the selection", () => {
  assert.deepEqual(insertToken("Hi ,", "{{firstName|there}}", 3, 3), { value: "Hi {{firstName|there}},", caret: 22 });
  assert.deepEqual(insertToken("Hi X!", "T", 3, 4), { value: "Hi T!", caret: 4 });
  assert.equal(insertToken("Hi", "T", null, null).value, "HiT");
});
