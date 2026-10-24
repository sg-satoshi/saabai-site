import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { claimLeadAlert, leadAlertCheck, leadFingerprint, sanitizeLead, type CleanLead } from "../lib/leads-guard";

delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

function clean(raw: unknown, internal = false): CleanLead {
  const r = sanitizeLead(raw, internal);
  assert.ok(r.ok, "sanitizeLead should accept");
  return (r as { ok: true; lead: CleanLead }).lead;
}

test("empty body is not alertable (the 'New Lead via Mia: undefined' case)", () => {
  const r = leadAlertCheck(clean({}));
  assert.deepEqual(r, { ok: false, error: "Email required" });
});

test("chat_widget and calculator leads need a valid email", () => {
  assert.equal(leadAlertCheck(clean({ source: "chat_widget", name: "Sam" })).ok, false);
  assert.equal(leadAlertCheck(clean({ source: "calculator_page", calculatorResults: { annualCost: 9 } })).ok, false);
  assert.equal(leadAlertCheck(clean({ source: "calculator_homepage", email: "" })).ok, false);
  assert.equal(leadAlertCheck(clean({ source: "chat_widget", email: "sam@example.com", name: "Sam" })).ok, true);
  assert.equal(leadAlertCheck(clean({ source: "calculator_page", email: "sam@example.com" })).ok, true);
});

test("transcripts need an email or at least one visitor message", () => {
  for (const source of ["chat_closed", "chat_ended", "chat_ended_short", "pete_ended"]) {
    assert.equal(leadAlertCheck(clean({ source })).ok, false, source);
    assert.equal(leadAlertCheck(clean({ source, conversation: [{ role: "assistant", content: "Hi" }] })).ok, false, source);
    assert.equal(leadAlertCheck(clean({ source, conversation: [{ role: "user", content: "hello" }] })).ok, true, source);
    assert.equal(leadAlertCheck(clean({ source, email: "a@b.co" })).ok, true, source);
  }
});

test("server-only hot lead needs a conversation or a qualification summary", () => {
  assert.equal(leadAlertCheck(clean({ source: "mia_qualified" }, true)).ok, false);
  assert.equal(leadAlertCheck(clean({ source: "mia_qualified", qualification_summary: "Law firm, 12 staff" }, true)).ok, true);
});

test("fingerprint: same contact lead matches, different lead differs, no PII in output", () => {
  const a = leadFingerprint(clean({ source: "chat_widget", email: "Sam@Example.com", conversation: [{ role: "user", content: "hi" }] }));
  const b = leadFingerprint(clean({ source: "chat_widget", email: "sam@example.com", conversation: [{ role: "user", content: "hi" }, { role: "user", content: "more" }] }));
  const c = leadFingerprint(clean({ source: "chat_widget", email: "other@example.com" }));
  const d = leadFingerprint(clean({ source: "chat_ended", email: "sam@example.com" }));
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.notEqual(a, d);
  assert.match(a, /^[0-9a-f]{32}$/);
  const t1 = leadFingerprint(clean({ source: "chat_closed", conversation: [{ role: "user", content: "one" }] }));
  const t2 = leadFingerprint(clean({ source: "chat_closed", conversation: [{ role: "user", content: "two" }] }));
  assert.notEqual(t1, t2);
});

test("claimLeadAlert dedupes within the window (in-memory fallback)", async () => {
  const fp = leadFingerprint(clean({ source: "chat_widget", email: "dedupe@example.com" }));
  assert.equal(await claimLeadAlert(fp), true);
  assert.equal(await claimLeadAlert(fp), false);
  const other = leadFingerprint(clean({ source: "chat_widget", email: "dedupe2@example.com" }));
  assert.equal(await claimLeadAlert(other), true);
  const short = leadFingerprint(clean({ source: "chat_widget", email: "ttl@example.com" }));
  assert.equal(await claimLeadAlert(short, 0.05), true);
  await new Promise((r) => setTimeout(r, 80));
  assert.equal(await claimLeadAlert(short, 0.05), true, "claim frees up after the window");
});

test("route rejects before any email, and dedupes before sending", () => {
  const src = readFileSync("app/api/leads/route.ts", "utf8");
  const gate = src.indexOf("leadAlertCheck(checked.lead)");
  const dedupe = src.indexOf("claimLeadAlert(leadFingerprint(checked.lead))");
  const firstSend = src.indexOf("resend.emails.send(");
  const visitorClaim = src.indexOf("claimVisitorEmail(lead.email)");
  assert.ok(gate > 0 && dedupe > gate, "gate then dedupe");
  assert.ok(dedupe < visitorClaim && dedupe < firstSend, "both run before any send");
  assert.match(src, /status: 400/);
  assert.ok(!src.includes('timeZone: "Australia/Sydney"'), "operator emails use Brisbane time");
});

test("POST handler: empty body is a 400, real lead is accepted once", async () => {
  delete process.env.RESEND_API_KEY; // never send real mail from tests
  delete process.env.LEAD_WEBHOOK_URL;
  const { POST } = await import("../app/api/leads/route");
  const post = (body: unknown, ip: string) =>
    POST(new Request("http://x/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }));

  const empty = await post({}, "10.0.0.1");
  assert.equal(empty.status, 400);
  assert.equal((await empty.json()).error, "Email required");

  const noEmail = await post({ source: "chat_widget", name: "Sam", conversation: [] }, "10.0.0.2");
  assert.equal(noEmail.status, 400);

  const real = { source: "chat_widget", name: "Sam", email: "sam.real@example.com", conversation: [{ role: "user", content: "We need help" }] };
  const first = await post(real, "10.0.0.3");
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), { ok: true });
  const second = await post(real, "10.0.0.3");
  assert.equal(second.status, 200);
  assert.deepEqual(await second.json(), { ok: true, deduped: true });
});
