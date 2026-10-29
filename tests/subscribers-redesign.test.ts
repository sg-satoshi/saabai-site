import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { audienceCounts, canReceiveMarketing, emailStatus, SEGMENTS } from "../lib/subscriber-rules";
import { listForAdmin, markUnsubscribed, MAX_MARK } from "../lib/subscriber-admin";
import { broadcastRecipients } from "../lib/broadcast";
import { buildBroadcastHtml, previewForRecipient, previewForTest } from "../lib/broadcast-template";
import { hasValue } from "../lib/personalise";
import type { Subscriber } from "../lib/subscribers";

const read = (p: string) => readFileSync(p, "utf8");
const sub = (email: string, extra: Partial<Subscriber> = {}): Subscriber => ({
  email, firstName: "", industry: "", source: "/", subscribedAt: "2026-10-01T00:00:00.000Z", status: "active", ...extra,
});

// Fixture: 3 can email, 2 not opted in (one "no", one older with no flag), 2 unsubscribed (status, suppression list).
const FIX = [
  sub("a@example.com", { marketingConsent: "yes", firstName: "Ann", industry: "Law / Legal", country: "Australia" }),
  sub("b@example.com", { marketingConsent: "yes", industry: "Other", country: "New Zealand", offer: "score_link" }),
  sub("c@example.com", { marketingConsent: "yes", subscribedAt: new Date(Date.now() - 2 * 86400000).toISOString() }),
  sub("d@example.com", { marketingConsent: "no" }),
  sub("e@example.com"),
  sub("f@example.com", { marketingConsent: "yes", status: "unsubscribed" }),
  sub("G@Example.com", { marketingConsent: "yes" }),
];
const SUPPRESSED = new Set(["g@example.com"]);

test("emailStatus: unsubscribed wins, then consent", () => {
  assert.equal(emailStatus({ status: "active", marketingConsent: "yes" }, false), "can_email");
  assert.equal(emailStatus({ status: "active", marketingConsent: "yes" }, true), "unsubscribed");
  assert.equal(emailStatus({ status: "unsubscribed", marketingConsent: "yes" }, false), "unsubscribed");
  assert.equal(emailStatus({ status: "active", marketingConsent: "no" }, false), "not_opted_in");
  assert.equal(emailStatus({ status: "active" }, false), "not_opted_in");
  assert.equal(canReceiveMarketing({ status: "active", marketingConsent: "yes" }), true);
});

test("page counts equal what the broadcast route actually sends", async () => {
  const { subscribers, suppressionError } = await listForAdmin(FIX, async (emails) => {
    assert.equal(emails.length, FIX.length, "one batched suppression read");
    return SUPPRESSED;
  });
  assert.equal(suppressionError, false);
  const c = audienceCounts(subscribers);
  assert.deepEqual(c, { total: 7, canEmail: 3, notOptedIn: 2, unsubscribed: 2, leftOut: 4 });
  assert.deepEqual(subscribers.filter((s) => s.canEmail).map((s) => s.email), ["a@example.com", "b@example.com", "c@example.com"]);
  const { recipients } = await broadcastRecipients(FIX.map((s) => s.email), FIX, async (e) => SUPPRESSED.has(e.toLowerCase()));
  assert.equal(recipients.length, c.canEmail, "same number as the server sends to");
});

test("a failed suppression read is flagged, not hidden", async () => {
  const r = await listForAdmin(FIX, async () => { throw new Error("db down"); });
  assert.equal(r.suppressionError, true);
});

test("fixed segments filter as labelled", () => {
  const now = Date.now();
  const by = (id: string) => FIX.filter((s) => SEGMENTS.find((x) => x.id === id)!.filter(s, now)).map((s) => s.email);
  assert.equal(SEGMENTS[0].id, "all");
  assert.deepEqual(by("law"), ["a@example.com"]);
  assert.deepEqual(by("popup"), ["b@example.com"]);
  assert.deepEqual(by("7d"), ["c@example.com"]);
  assert.deepEqual(by("au"), ["a@example.com"]);
  assert.deepEqual(by("intl"), ["b@example.com"]);
});

test("mark unsubscribed: suppresses, sets status, keeps the record", async () => {
  const suppressed: string[] = [];
  let updated: string[] = [];
  const r = await markUnsubscribed({ action: "unsubscribe", emails: ["a@example.com", " a@example.com ", "b@example.com", "nope"] }, {
    suppress: async (e) => { suppressed.push(e); },
    setUnsubscribed: async (emails) => { updated = emails; return emails; },
  });
  assert.equal(r.status, 200);
  assert.deepEqual(suppressed, ["a@example.com", "b@example.com"]);
  assert.deepEqual(updated, ["a@example.com", "b@example.com"]);
  assert.deepEqual(r.body.marked, ["a@example.com", "b@example.com"]);
});

test("mark unsubscribed: suppression happens even if the status write fails, and bad input is refused", async () => {
  const r = await markUnsubscribed({ action: "unsubscribe", emails: ["a@example.com"] }, {
    suppress: async () => {},
    setUnsubscribed: async () => { throw new Error("redis down"); },
  });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.marked, ["a@example.com"]);
  const deps = { suppress: async () => {}, setUnsubscribed: async (e: string[]) => e };
  assert.equal((await markUnsubscribed({ action: "delete", emails: ["a@example.com"] }, deps)).status, 400);
  assert.equal((await markUnsubscribed({ action: "unsubscribe", emails: [] }, deps)).status, 400);
  assert.equal((await markUnsubscribed({ action: "unsubscribe", emails: Array.from({ length: MAX_MARK + 1 }, (_, i) => `x${i}@example.com`) }, deps)).status, 400);
  const fail = await markUnsubscribed({ action: "unsubscribe", emails: ["a@example.com"] }, { suppress: async () => { throw new Error("x"); }, setUnsubscribed: async (e) => e });
  assert.equal(fail.status, 502);
});

test("the PATCH route is admin-checked and keeps records; setSubscribersUnsubscribed never deletes", () => {
  const route = read("app/api/subscribers/route.ts");
  assert.match(route, /export async function PATCH/);
  assert.match(route, /requireAdminSession\(\)/);
  assert.match(route, /suppress\(email, "email"/);
  const lib = read("lib/subscribers.ts");
  const fn = lib.slice(lib.indexOf("export async function setSubscribersUnsubscribed"));
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  assert.match(body, /status: "unsubscribed"/);
  assert.doesNotMatch(body, /\.del\(|srem|deleteSubscribers/);
});

test("the admin UI never calls the hard-delete route", () => {
  for (const f of ["SubscriberDashboard.tsx", "Composer.tsx", "ui.tsx"]) {
    const src = read(`app/saabai-admin/subscribers/${f}`);
    assert.doesNotMatch(src, /method:\s*"DELETE"/, `${f} has no DELETE`);
    assert.doesNotMatch(src, /deleteSelected|Delete \{|>Delete</, `${f} offers no Delete`);
  }
  const ui = read("app/saabai-admin/subscribers/SubscriberDashboard.tsx");
  assert.match(ui, /method: "PATCH"[^\n]*action: "unsubscribe"/);
  assert.match(ui, /Mark unsubscribed/);
  assert.match(ui, /records and consent history are kept/);
});

test("IP is only in the row detail, not the table", () => {
  const ui = read("app/saabai-admin/subscribers/SubscriberDashboard.tsx");
  const table = ui.slice(ui.indexOf("<th>Subscriber</th>"), ui.indexOf("</table>", ui.indexOf("<th>Subscriber</th>")));
  assert.doesNotMatch(table, /\.ip\b|IP/);
  const drawer = ui.slice(ui.indexOf('className="s-drawer"'));
  assert.match(drawer, /IP address/);
});

test("email layout has no second footer and the preview is the server's builder", () => {
  const html = buildBroadcastHtml("Hi {{firstName|there}},\n<b>x</b>");
  assert.doesNotMatch(html, /receiving this as a Saabai subscriber/i);
  assert.doesNotMatch(html, /#00bfa5/i);
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/, "message text is escaped");
  const p = previewForRecipient({ email: "a@example.com", firstName: "Ann", city: "" }, "Hi {{firstName|there}}", "Hello {{firstName|there}} in {{city|your area}}");
  assert.equal(p.subject, "Hi Ann");
  assert.match(p.html, /Hello Ann in your area/);
  assert.equal((p.html.match(/Unsubscribe/gi) || []).length >= 1, true, "server footer present");
  assert.equal((p.html.match(/ABN/g) || []).length, 1, "exactly one footer");
  const t = previewForTest("News", "Hi {{firstName|there}}");
  assert.equal(t.to[0], "hello@saabai.ai");
  assert.match(t.subject, /^\[TEST\] /);
  assert.match(t.html, /Hi Sam/);
});

test("fill counts use the server's clean() rule", () => {
  assert.equal(hasValue("Other"), true);
  assert.equal(hasValue("  "), false);
  assert.equal(hasValue(undefined), false);
});

test("composer: test send carries only subject and html, send goes to the broadcast route, no-test warns but does not block", () => {
  const c = read("app/saabai-admin/subscribers/Composer.tsx");
  const testFn = c.slice(c.indexOf("async function sendTest"), c.indexOf("async function send()"));
  assert.match(testFn, /fetch\("\/api\/subscribers\/broadcast\/test"/);
  assert.doesNotMatch(testFn, /recipients|emails/);
  assert.match(c, /fetch\("\/api\/subscribers\/broadcast",/);
  assert.match(c, /No test sent yet\. You can still send/);
  assert.match(c, /MERGE_FIELDS\.map/);
  assert.match(c, /previewForRecipient\(/);
  assert.match(c, /sandbox=""/);
});

test("new UI copy has no em or en dashes and no old footer line", () => {
  for (const f of ["app/saabai-admin/subscribers/SubscriberDashboard.tsx", "app/saabai-admin/subscribers/Composer.tsx", "app/saabai-admin/subscribers/ui.tsx", "lib/broadcast-template.ts", "lib/subscriber-rules.ts", "lib/subscriber-admin.ts"]) {
    const src = read(f);
    assert.ok(!/[\u2013\u2014]/.test(src), `${f} has no dashes`);
    assert.doesNotMatch(src, /receiving this as a Saabai subscriber/i);
  }
});

test("admin-wide buttons: navy primary, teal focus ring, no lift or shrink, quiet and confirm danger", () => {
  const css = read("app/saabai-admin/admin.css");
  assert.match(css, /\.btn\.pri\{background:var\(--navy-900\)/);
  assert.match(css, /\.btn:focus-visible\{outline:2px solid #0e7482;outline-offset:2px\}/);
  assert.doesNotMatch(css, /\.btn[^{]*:hover[^{]*\{[^}]*translateY/);
  assert.doesNotMatch(css, /\.btn[^{]*:active[^{]*\{[^}]*scale\(/);
  assert.match(css, /\.btn\.dq\{/);
  assert.match(css, /\.btn\.ds\{background:#b42318/);
  assert.doesNotMatch(css, /\.btn[^{]*\{[^}]*#1f4dc5/);
  const btn = read("app/saabai-admin/ui/Button.tsx");
  assert.match(btn, /"dq" \| "ds"/);
  assert.match(read("app/saabai-admin/ui/Feedback.tsx"), /danger \? "ds" : "pri"/);
});
