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
  assert.match(route, /lexAlert\(/);
  assert.doesNotMatch(route, /sendBrandedEmail|resend/i);
  const admin = readFileSync("app/api/admin/lex-feedback/route.ts", "utf8");
  assert.match(admin, /isAdminSession/);
  assert.match(readFileSync("app/api/lex-flag/route.ts", "utf8"), /source: "flag"/);
  assert.match(readFileSync("app/saabai-admin/AdminSidebar.tsx", "utf8"), /\/saabai-admin\/lex-feedback/);
});
