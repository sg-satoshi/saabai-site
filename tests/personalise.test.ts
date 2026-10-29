import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MERGE_FIELDS, SAMPLE_VALUES, mergeToken, personaliseHtml, personaliseText, valuesFor } from "../lib/personalise";
import { broadcastEmail } from "../lib/broadcast";
import { buildBroadcastTestEmail, BROADCAST_TEST_TO } from "../lib/broadcast-test";
import { broadcastResult, NONE_SENT_MSG } from "../lib/broadcast-result";

const deps = {
  unsubUrl: (e: string) => `https://saabai.ai/api/unsubscribe?e=${encodeURIComponent(e)}&t=x`,
  unsubHeaders: () => ({ "List-Unsubscribe": "<https://saabai.ai/u>" }),
};

test("only real, non-sensitive Subscriber fields are offered, each with a fallback and sample", () => {
  const keys = MERGE_FIELDS.map((f) => f.key);
  assert.deepEqual(keys, ["firstName", "industry", "city", "region", "country"]);
  for (const banned of ["email", "ip", "countryCode", "source", "offer", "marketingConsent", "consentAt", "subscribedAt", "status"]) {
    assert.ok(!keys.includes(banned as never), `${banned} must not be offered`);
  }
  const src = readFileSync("lib/subscribers.ts", "utf8");
  for (const f of MERGE_FIELDS) {
    assert.match(src, new RegExp(`\\b${f.key}\\??:\\s*string`), `${f.key} exists on Subscriber`);
    assert.ok(f.fallback.trim() && f.sample.trim());
    assert.equal(mergeToken(f), `{{${f.key}|${f.fallback}}}`);
  }
});

test("values fill in, blanks use the token fallback, then the default", () => {
  assert.equal(personaliseHtml("Hi {{firstName}},", { firstName: "Jo" }), "Hi Jo,");
  assert.equal(personaliseHtml("Hi {{firstName}},", { firstName: "" }), "Hi there,");
  assert.equal(personaliseHtml("Hi {{firstName}},", {}), "Hi there,");
  assert.equal(personaliseHtml("Hi {{firstName}},", { firstName: "   " }), "Hi there,");
  assert.equal(personaliseHtml("Hi {{ firstName | mate }},", { firstName: "" }), "Hi mate,");
  assert.equal(personaliseHtml("Hi {{firstName|mate}},", { firstName: "Jo" }), "Hi Jo,");
  assert.equal(personaliseHtml("In {{city}}, {{region}}", {}), "In your area, your state");
  assert.equal(personaliseHtml("{{industry}} in {{country}}", { industry: "Law", country: "Australia" }), "Law in Australia");
  // An empty fallback after the | still never leaves a bare comma.
  assert.equal(personaliseHtml("Hi {{firstName|}},", {}), "Hi there,");
});

test("values and fallbacks are HTML-escaped, without double-escaping editor input", () => {
  assert.equal(personaliseHtml("<p>Hi {{firstName}}</p>", { firstName: "<script>x</script>" }), "<p>Hi &lt;script&gt;x&lt;/script&gt;</p>");
  assert.equal(personaliseHtml("Hi {{industry}}", { industry: `Tom & "Jerry's"` }), "Hi Tom &amp; &quot;Jerry&#39;s&quot;");
  // The editor escapes the body before tokens are replaced; a fallback typed as "R&D" arrives as "R&amp;D".
  assert.equal(personaliseHtml("{{industry|R&amp;D}}", {}), "R&amp;D");
  assert.equal(personaliseHtml("{{industry|&lt;b&gt;}}", {}), "&lt;b&gt;");
});

test("unknown or malformed tokens are harmless: replaced by their fallback or removed", () => {
  assert.equal(personaliseHtml("A{{ip}}B", { firstName: "Jo" }), "AB");
  assert.equal(personaliseHtml("A{{email|you}}B", {}), "AyouB");
  assert.equal(personaliseHtml("A{{ not a token }}B", {}), "AB");
  assert.equal(personaliseHtml("A{{firstName}B", { firstName: "Jo" }), "A{{firstName}B", "unbalanced braces are left as typed text");
  assert.ok(!personaliseHtml("{{constructor}}{{__proto__}}{{toString}}", {}).includes("function"));
});

test("subject is plain text: no escaping, no line breaks", () => {
  assert.equal(personaliseText("{{firstName|there}}, quick one", { firstName: "Jo & Al" }), "Jo & Al, quick one");
  assert.equal(personaliseText("Hi {{firstName}}", { firstName: "Jo\r\nBcc: x@y.z" }), "Hi Jo Bcc: x@y.z");
  assert.ok(!/[\r\n]/.test(personaliseText("a\r\nb{{city}}", {})));
});

test("broadcastEmail personalises each recipient's body and subject from their own record", () => {
  const msg = { subject: "{{firstName|there}}, news for {{industry}}", html: "<p>Hi {{firstName|there}} in {{city}}</p>", fromName: "Shane" };
  const a = broadcastEmail({ email: "a@x.com", firstName: "Ann", industry: "Law", city: "Brisbane" }, msg, deps);
  const b = broadcastEmail({ email: "b@x.com", firstName: "", industry: "", city: "" }, msg, deps);
  assert.equal(a.subject, "Ann, news for Law");
  assert.ok(a.html.includes("<p>Hi Ann in Brisbane</p>"));
  assert.equal(b.subject, "there, news for your industry");
  assert.ok(b.html.includes("<p>Hi there in your area</p>"));
  assert.ok(!/\{\{/.test(a.html + b.html + a.subject + b.subject));
  assert.deepEqual(valuesFor({ firstName: "Z" }), { firstName: "Z", industry: "", city: "", region: "", country: "" });
});

test("test send still only targets hello@ and uses sample values, never a subscriber", () => {
  const m = buildBroadcastTestEmail({ subject: "Hi {{firstName|there}}", html: "<p>{{firstName}} {{city}} {{ip}}</p>" }, deps);
  assert.deepEqual(m.to, [BROADCAST_TEST_TO]);
  assert.equal(BROADCAST_TEST_TO, "hello@saabai.ai");
  assert.equal(m.subject, `[TEST] Hi ${SAMPLE_VALUES.firstName}`);
  assert.ok(m.html.includes(`<p>${SAMPLE_VALUES.firstName} ${SAMPLE_VALUES.city} </p>`));
  const lib = readFileSync("lib/broadcast-test.ts", "utf8");
  const route = readFileSync("app/api/subscribers/broadcast/test/route.ts", "utf8");
  for (const src of [lib, route]) assert.doesNotMatch(src, /getSubscribers|lib\/subscribers"|broadcastRecipients/);
});

test("zero-recipient and failure results read clearly", () => {
  assert.deepEqual(broadcastResult(false, { error: "No subscribers in the selection have opted in to marketing email (unsubscribed people are excluded)", suppressed: 2 }), { kind: "none", msg: NONE_SENT_MSG });
  assert.equal(NONE_SENT_MSG, "No opted-in subscribers in this selection, so nothing was sent.");
  assert.equal(broadcastResult(true, { ok: true, sent: 0, failed: 0, total: 0 }).kind, "none");
  assert.deepEqual(broadcastResult(true, { ok: true, sent: 3, failed: 0, total: 3, suppressed: 1 }), { kind: "ok", msg: "Sent to 3 subscribers. 1 unsubscribed or not opted in was skipped." });
  assert.equal(broadcastResult(true, { ok: true, sent: 2, failed: 1, total: 3, suppressed: 0 }).kind, "error");
  assert.equal(broadcastResult(false, { error: "Unauthorized" }).msg, "Nothing was sent: Unauthorized");
  assert.equal(broadcastResult(false, null).kind, "error");
});

// Updated for the #345 redesign: the modal became the full-screen composer (Composer.tsx), the
// test button and Review and send sit in its header above the subject, and the selection bar
// emails only the people who can be emailed.
test("admin panel: composer on top, insert-field chips, test button in header, selection toolbar", () => {
  const ui = readFileSync("app/saabai-admin/subscribers/SubscriberDashboard.tsx", "utf8");
  const comp = readFileSync("app/saabai-admin/subscribers/Composer.tsx", "utf8");
  assert.match(comp, /Insert personalisation field/);
  assert.match(comp, /MERGE_FIELDS\.map/);
  assert.match(comp, /role="dialog"/);
  assert.match(comp, /aria-modal="true"/);
  const head = comp.slice(comp.indexOf('className="s-shead"'));
  assert.ok(head.indexOf("{!mobile && testBtn}") < head.indexOf("{write}"), "test button sits above the form");
  assert.match(comp, /Send test to \$\{BROADCAST_TEST_TO\}/);
  assert.doesNotMatch(comp, /Use \{"\{\{firstName\}\}"\} for personalisation/);
  assert.match(ui, /role="toolbar" aria-label="Selected subscribers"/);
  assert.match(ui, /Email \{selCounts\.canEmail\}/);
  assert.match(read345("lib/broadcast-template.ts"), /broadcastEmail\(/);
  for (const src of [ui, comp]) assert.doesNotMatch(src, /—/, "no em dashes");
});
const read345 = (p: string) => readFileSync(p, "utf8");
