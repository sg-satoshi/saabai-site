import test from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, deepEscape, isValidEmail, sanitizeLead, isInternalCall, claimVisitorEmail, ipLimited, safeLogLine } from "../lib/leads-guard";

test("escapeHtml neutralises tags and quotes", () => {
  assert.equal(escapeHtml(`<img src=x onerror="a()">&'`), "&lt;img src=x onerror=&quot;a()&quot;&gt;&amp;&#39;");
  assert.deepEqual(deepEscape({ a: ["<b>"], n: 1 }), { a: ["&lt;b&gt;"], n: 1 });
});

test("email validation", () => {
  for (const e of ["a@b.co", "first.last+x@sub.example.com.au"]) assert.ok(isValidEmail(e), e);
  for (const e of ["", "a@b", "a b@c.com", "a@b.c", '"><script>@x.com', "a@@b.com", "a..b@c.com", 5, null]) assert.equal(isValidEmail(e as unknown), false, String(e));
});

test("source whitelist: mia_qualified only for internal calls", () => {
  assert.equal(sanitizeLead({ source: "mia_qualified" }, false).ok, false);
  assert.equal(sanitizeLead({ source: "mia_qualified" }, true).ok, true);
  assert.equal(sanitizeLead({ source: "evil" }, true).ok, false);
  const d = sanitizeLead({ email: "x@y.com" }, false);
  assert.ok(d.ok && d.lead.source === "chat_widget");
});

test("sanitizeLead escapes, clips, and ignores client timestamp", () => {
  const r = sanitizeLead({
    source: "chat_ended", email: "Vis@Example.com", name: "<script>x</script>".padEnd(900, "a"),
    timestamp: "1999-01-01", conversation: [{ role: "system", content: "<b>hi</b>" }, { role: "user", content: "" }],
    calculatorResults: { annualCost: "NaN", teamMembers: 4 },
  }, false);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.lead.email, "vis@example.com");
  assert.ok(String(r.lead.name).startsWith("&lt;script&gt;"));
  assert.ok(String(r.lead.name).length < 1100);
  assert.notEqual(r.lead.timestamp, "1999-01-01");
  assert.deepEqual(r.lead.conversation, [{ role: "user", content: "&lt;b&gt;hi&lt;/b&gt;" }]);
  assert.equal((r.lead.calculatorResults as Record<string, unknown>).annualCost, undefined);
  assert.equal((r.lead.calculatorResults as Record<string, unknown>).teamMembers, 4);
});

test("sanitizeLead rejects bad email and non-objects", () => {
  assert.equal(sanitizeLead({ email: "nope" }, false).ok, false);
  assert.equal(sanitizeLead(null, false).ok, false);
  assert.equal(sanitizeLead([], false).ok, false);
});

test("internal token check", () => {
  const prev = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "s3cret";
  assert.equal(isInternalCall(new Request("http://x", { headers: { "x-internal-token": "s3cret" } })), true);
  assert.equal(isInternalCall(new Request("http://x", { headers: { "x-internal-token": "wrong!" } })), false);
  assert.equal(isInternalCall(new Request("http://x")), false);
  delete process.env.CRON_SECRET;
  assert.equal(isInternalCall(new Request("http://x", { headers: { "x-internal-token": "" } })), false);
  if (prev) process.env.CRON_SECRET = prev;
});

test("per-recipient and per-IP limits (in-memory fallback)", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  assert.equal(await claimVisitorEmail("t1@example.com"), true);
  assert.equal(await claimVisitorEmail("T1@example.com"), false);
  let limited = false;
  for (let i = 0; i < 10; i++) limited = await ipLimited("9.9.9.9");
  assert.equal(limited, true);
});

test("log line has no PII", () => {
  const l = safeLogLine({ source: "chat_ended", email: "a@b.com", conversation: [1, 2], qualification_score: 3 });
  assert.ok(!l.includes("a@b.com"));
  assert.match(l, /msgs=2/);
});
