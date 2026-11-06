/**
 * Lex in-app feedback: validation, masking, screenshots, triage, per-firm counts, CSV export, wiring.
 * In-memory Upstash mock, no email.   npx tsx --test tests/lex-feedback.test.ts
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";

const mock = createMockUpstash();
before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  delete process.env.RESEND_API_KEY;
});
after(() => new Promise<void>((r) => mock.server.close(() => r())));
const F = () => import("../lib/lex-feedback");
const ctx = { firm: "smithlaw.test", user: "jane@smithlaw.test", browser: "UA", appVersion: "abc1234" };
const PNG = "data:image/png;base64,iVBORw0KGgo=";

test("validation: type, message length, screenshot type and size", async () => {
  const { validateFeedback, MAX_SHOT_BYTES } = await F();
  assert.equal(validateFeedback({ type: "nope", message: "hello" }).ok, false);
  assert.equal(validateFeedback({ type: "answer_flag", message: "hello" }).ok, false, "flags only via /api/lex-flag");
  assert.equal(validateFeedback({ type: "bug", message: "x" }).ok, false);
  const ok = validateFeedback({ type: "bug", message: "Export button does nothing", page: "/lex", screenshot: PNG });
  assert.ok(ok.ok && ok.value.screenshot === PNG);
  const svg = validateFeedback({ type: "idea", message: "dark mode", screenshot: "data:image/svg+xml;base64,PHN2Zz4=" });
  assert.ok(svg.ok && svg.value.screenshot === null && svg.value.screenshotRejected);
  const big = validateFeedback({ type: "idea", message: "dark mode", screenshot: "data:image/png;base64," + "A".repeat(MAX_SHOT_BYTES) });
  assert.ok(big.ok && big.value.screenshot === null);
});

test("masking: emails and phone numbers are removed from the stored message", async () => {
  const { maskFeedbackText } = await F();
  const m = maskFeedbackText("Client john.smith@client.com.au called on 0412 345 678 and +61 7 3123 4567");
  assert.doesNotMatch(m, /john|0412|3123/);
  assert.match(m, /\[email\]/);
  assert.match(m, /\[phone\]/);
});

let id = "";
test("save, list, triage, tags, per-firm counts, screenshot stored separately", async () => {
  const { saveFeedback, listFeedback, updateFeedback, countsByFirm, getScreenshot } = await F();
  const a = await saveFeedback({ type: "bug", message: "Breaks for a@b.co", page: "/lex", screenshot: PNG }, ctx);
  id = a.id;
  assert.equal(a.status, "new");
  assert.equal(a.message, "Breaks for [email]");
  assert.equal(a.hasScreenshot, true);
  assert.equal(await getScreenshot(a.id), PNG);
  await saveFeedback({ type: "idea", message: "Bulk export", page: "/lex", screenshot: null }, { ...ctx, firm: "other.test" });
  assert.equal((await listFeedback()).length, 2);
  assert.equal((await listFeedback({ type: "idea" })).length, 1);
  const u = await updateFeedback(a.id, { status: "planned", tags: ["Export", "export", "<b>ui</b>"] });
  assert.equal(u?.status, "planned");
  assert.deepEqual(u?.tags, ["export", "buib"]);
  await assert.rejects(updateFeedback(a.id, { status: "done" }));
  assert.equal((await listFeedback({ tag: "export" })).length, 1);
  await updateFeedback(a.id, { status: "fixed" });
  const counts = countsByFirm(await listFeedback());
  assert.deepEqual(counts.find((c) => c.firm === "smithlaw.test"), { firm: "smithlaw.test", total: 1, open: 0 });
  assert.equal(await getFeedbackSafe("../x"), null);
});
async function getFeedbackSafe(x: string) { return (await F()).getFeedback(x); }

test("CSV export: header, quoting, no spreadsheet formulas", async () => {
  const { feedbackCsv, saveFeedback, listFeedback } = await F();
  await saveFeedback({ type: "question", message: '=HYPERLINK("x") "quoted"', page: "/lex", screenshot: null }, ctx);
  const csv = feedbackCsv(await listFeedback());
  assert.match(csv.split("\n")[0], /^id,createdAt,type,status,tags/);
  assert.match(csv, /"'=HYPERLINK\(""x""\) ""quoted"""/);
});

test("admin alert line has type, firm, page and link, never the message", async () => {
  const { feedbackAlertLine, getFeedback } = await F();
  const it = (await getFeedback(id))!;
  const line = feedbackAlertLine(it);
  assert.match(line, /bug from smithlaw\.test on \/lex/);
  assert.doesNotMatch(line, /Breaks/);
});

test("wiring: button on every Lex screen, server-side context, lexAlert reused, admin gated, flags filed", () => {
  assert.match(readFileSync("app/lex/layout.tsx", "utf8"), /<FeedbackButton \/>/);
  const btn = readFileSync("app/lex/_components/FeedbackButton.tsx", "utf8");
  assert.match(btn, /Report an issue \/ Suggest a feature/);
  assert.match(btn, /don&apos;t include client names/);
  const route = readFileSync("app/api/lex-feedback/route.ts", "utf8");
  assert.match(route, /resolveReviewActor\(req\)/);
  assert.match(route, /alertFeedback\(item, lexAlert\)/);
  assert.doesNotMatch(route, /sendBrandedEmail|resend/i);
  const admin = readFileSync("app/api/admin/lex-feedback/route.ts", "utf8");
  assert.match(admin, /isAdminSession/);
  assert.match(readFileSync("app/api/lex-flag/route.ts", "utf8"), /source: "flag"/);
  assert.match(readFileSync("app/saabai-admin/AdminSidebar.tsx", "utf8"), /\/saabai-admin\/lex-feedback/);
});

test("retention: items get a 12-month TTL, screenshots 90 days; trimmed items are deleted", async () => {
  const { saveFeedback, FEEDBACK_RETENTION_DAYS } = await F();
  const { getRedis } = await import("../lib/redis");
  const r = getRedis()!;
  const it = await saveFeedback({ type: "bug", message: "ttl check", page: "/lex", screenshot: PNG }, ctx);
  const t = Number(await r.ttl(`lex:feedback:${it.id}`));
  assert.ok(t > (FEEDBACK_RETENTION_DAYS - 1) * 86400 && t <= FEEDBACK_RETENTION_DAYS * 86400, `item ttl ${t}`);
  assert.ok(Number(await r.ttl(`lex:feedback:shot:${it.id}`)) <= 90 * 86400);
  const src = readFileSync("lib/lex-feedback.ts", "utf8");
  assert.match(src, /lrange\("lex:feedback:ids", MAX_ITEMS, -1\)[\s\S]*r\.del\(`lex:feedback:\$\{old\}`/);
});

test("page is restricted to a path, and the alert shows only that", async () => {
  const { cleanPage, validateFeedback, feedbackAlertLine } = await F();
  assert.equal(cleanPage("/lex/matters?client=Jane%20Smith#x"), "/lex/matters");
  assert.equal(cleanPage("Jane Smith v Bloggs"), "/lex");
  const v = validateFeedback({ type: "bug", message: "hello there", page: "https://x.test/lex?q=secret" });
  assert.ok(v.ok && v.value.page === "/lex");
  assert.doesNotMatch(feedbackAlertLine({ id: "fb_x", type: "bug", firm: "f", page: "/lex?name=Jane" } as never), /Jane/);
});

test("10.7 sweep: firm's feedback (incl. flag copies) counted in dry_run, deleted in live", async () => {
  const { saveFeedback, deleteFirmFeedback, getFeedback, listFeedback } = await F();
  const a = await saveFeedback({ type: "bug", message: "gone firm bug", page: "/lex", screenshot: null }, { ...ctx, firm: "gone.test", user: "x@gone.test" });
  const b = await saveFeedback({ type: "answer_flag", message: "flag note", page: "/lex", screenshot: null }, { ...ctx, firm: "gone.test", user: "y@gone.test", source: "flag" });
  const keep = await saveFeedback({ type: "idea", message: "kept", page: "/lex", screenshot: null }, { ...ctx, firm: "stays.test" });
  assert.equal(await deleteFirmFeedback(["gone.test"], [], true), 2);
  assert.ok(await getFeedback(a.id), "dry_run deletes nothing");
  assert.equal(await deleteFirmFeedback(["gone.test"], [], false), 2);
  assert.equal(await getFeedback(a.id), null);
  assert.equal(await getFeedback(b.id), null);
  assert.ok(await getFeedback(keep.id));
  assert.ok(!(await listFeedback()).some((x) => x.firm === "gone.test"));
  const sub = readFileSync("lib/lex-subscription.ts", "utf8");
  assert.match(sub, /deleteFirmFeedback\(firmKeys, people, true\)/);
  assert.match(sub, /deleteFirmFeedback\(firmKeys, people, false\)/);
});

test("alerts: first 5 an hour sent, the rest queued and sent as one digest", async () => {
  const { saveFeedback, alertFeedback, flushFeedbackDigest } = await F();
  const sent: string[] = [];
  const send = async (l: string) => { sent.push(l); };
  const hour = new Date("2026-11-02T03:10:00Z");
  const out: string[] = [];
  for (let i = 0; i < 7; i++) out.push(await alertFeedback(await saveFeedback({ type: "bug", message: `bug ${i} here`, page: "/lex", screenshot: null }, ctx), send, hour));
  assert.deepEqual(out, ["sent", "sent", "sent", "sent", "sent", "queued", "queued"]);
  assert.equal(sent.length, 5);
  assert.equal(await flushFeedbackDigest(send), 2);
  assert.match(sent[5], /^2 more Lex feedback items/);
  assert.doesNotMatch(sent[5], /bug 5 here/);
  assert.equal(await flushFeedbackDigest(send), 0);
  assert.match(readFileSync("app/api/cron/lex-grace/route.ts", "utf8"), /flushFeedbackDigest\(lexAlert\)/);
  assert.match(readFileSync("app/saabai-admin/lex-feedback/LexFeedbackClient.tsx", "utf8"), /get\("id"\)/);
});
