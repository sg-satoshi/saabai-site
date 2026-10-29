/** #339: "Send test to hello@saabai.ai" for admin broadcasts. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BROADCAST_TEST_TO,
  BROADCAST_TEST_LIMIT,
  buildBroadcastTestEmail,
  handleBroadcastTest,
  testSubject,
  type BroadcastTestDeps,
} from "../lib/broadcast-test";
import type { BroadcastEmail } from "../lib/broadcast";

const read = (f: string) => readFileSync(f, "utf8");
const unsubUrl = (e: string) => `https://saabai.ai/unsubscribe?e=${encodeURIComponent(e)}&t=tok`;
const unsubHeaders = (e: string) => ({ "List-Unsubscribe": `<${unsubUrl(e)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });

function deps(over: Partial<BroadcastTestDeps> = {}) {
  const sent: BroadcastEmail[] = [];
  const suppressedChecks: string[] = [];
  let slots = 0;
  const d: BroadcastTestDeps = {
    isAdmin: async () => true,
    claimSlot: async () => ++slots <= BROADCAST_TEST_LIMIT,
    isSuppressed: async (e) => { suppressedChecks.push(e); return false; },
    unsubUrl,
    unsubHeaders,
    send: async (m) => { sent.push(m); return { ok: true, id: "re_test_1" }; },
    ...over,
  };
  return { d, sent, suppressedChecks };
}

test("test send always goes to hello@saabai.ai and ignores any recipients passed in", async () => {
  const { d, sent, suppressedChecks } = deps();
  const r = await handleBroadcastTest({
    subject: "Tips for October",
    html: "<html><body><p>Hi {{firstName}}</p></body></html>",
    emails: ["subscriber1@example.com", "subscriber2@example.com"],
    to: ["someone@example.com"],
    email: "x@example.com",
    recipients: [{ email: "y@example.com" }],
  }, d);
  assert.equal(r.status, 200);
  assert.equal(r.body.to, "hello@saabai.ai");
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].to, ["hello@saabai.ai"]);
  assert.equal(BROADCAST_TEST_TO, "hello@saabai.ai");
  assert.deepEqual(suppressedChecks, ["hello@saabai.ai"]);
  const all = JSON.stringify(sent);
  for (const e of ["subscriber1@", "subscriber2@", "someone@", "x@example", "y@example"]) assert.ok(!all.includes(e), e);
});

test("test email uses the production builder: [TEST] subject, sender ID, footer, one-click headers", async () => {
  const { d, sent } = deps();
  await handleBroadcastTest({ subject: "Tips", html: "<html><body><p>Hi {{firstName}}</p></body></html>" }, d);
  const m = sent[0];
  assert.equal(m.subject, "[TEST] Tips");
  assert.equal(m.from, "Shane at Saabai <hello@saabai.ai>");
  assert.ok(m.html.includes("<p>Hi Sam</p>"), "test send uses sample values");
  assert.ok(m.html.includes("ABN 71 889 082 572") && m.html.includes("Merrimac QLD 4226"));
  assert.ok(m.html.includes("Unsubscribe") && m.html.includes("hello%40saabai.ai&amp;t=tok"));
  assert.equal(m.headers["List-Unsubscribe"], "<https://saabai.ai/unsubscribe?e=hello%40saabai.ai&t=tok>");
  assert.equal(m.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.equal(testSubject("[test] Hello"), "[TEST] Hello", "no double prefix");
  const direct = buildBroadcastTestEmail({ subject: "S", html: "<p>x</p>" }, { unsubUrl, unsubHeaders });
  assert.deepEqual(direct.to, ["hello@saabai.ai"]);
});

test("test path needs an admin, is rate limited and fails closed", async () => {
  const notAdmin = deps({ isAdmin: async () => false });
  assert.equal((await handleBroadcastTest({ subject: "S", html: "<p>x</p>" }, notAdmin.d)).status, 401);
  assert.equal(notAdmin.sent.length, 0);

  const { d, sent } = deps();
  const codes: number[] = [];
  for (let i = 0; i < BROADCAST_TEST_LIMIT + 2; i++) codes.push((await handleBroadcastTest({ subject: "S", html: "<p>x</p>" }, d)).status);
  assert.deepEqual(codes, [...Array(BROADCAST_TEST_LIMIT).fill(200), 429, 429]);
  assert.equal(sent.length, BROADCAST_TEST_LIMIT);
  assert.ok(BROADCAST_TEST_LIMIT <= 5);

  const down = deps({ claimSlot: async () => null });
  assert.equal((await handleBroadcastTest({ subject: "S", html: "<p>x</p>" }, down.d)).status, 503);
  assert.equal(down.sent.length, 0);

  const supp = deps({ isSuppressed: async () => true });
  assert.equal((await handleBroadcastTest({ subject: "S", html: "<p>x</p>" }, supp.d)).status, 409);
  assert.equal(supp.sent.length, 0);

  const bad = deps();
  assert.equal((await handleBroadcastTest({ subject: "", html: "<p>x</p>" }, bad.d)).status, 400);
  assert.equal((await handleBroadcastTest({ subject: "S" }, bad.d)).status, 400);
  assert.equal((await handleBroadcastTest(null, bad.d)).status, 400);
  assert.equal(bad.sent.length, 0);

  const fail = deps({ send: async () => ({ ok: false, error: "nope" }) });
  assert.equal((await handleBroadcastTest({ subject: "S", html: "<p>x</p>" }, fail.d)).status, 502);
});

test("the test route and helper never touch the subscriber list", () => {
  const lib = read("lib/broadcast-test.ts");
  const route = read("app/api/subscribers/broadcast/test/route.ts");
  for (const src of [lib, route]) {
    assert.ok(!/getSubscribers|lib\/subscribers|subscriber:|broadcastRecipients|\.emails\b/.test(src), "no subscriber list access");
    assert.ok(!/[\u2013\u2014]/.test(src), "no dashes");
  }
  assert.ok(!/["']https:\/\/api\.resend\.com\/emails\/batch/.test(route), "single send, not batch");
  assert.match(route, /requireAdminSession/);
  assert.match(route, /redis\.incr\(/);
  assert.match(read("proxy.ts"), /"\/api\/subscribers",/, "admin gate in proxy covers /api/subscribers/broadcast/test");
  const ui = read("app/saabai-admin/subscribers/SubscriberDashboard.tsx");
  assert.match(ui, /fetch\("\/api\/subscribers\/broadcast\/test"/);
  assert.match(ui, /Send test to hello@/);
  // The test button sends only subject and html, never the recipient list.
  const testFn = ui.slice(ui.indexOf("async function sendTest"), ui.indexOf("function buildHtml"));
  assert.ok(!testFn.includes("recipients"), "test send body has no recipients");
});
