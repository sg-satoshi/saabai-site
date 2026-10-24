/**
 * Doc review and send-for-review for Lex firm users, with a per-firm daily cap.
 * In-memory Upstash mock, no AI calls.   npx tsx --test tests/lex-review-access.test.ts
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { NextRequest } from "next/server";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";

const mock = createMockUpstash();

before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  process.env.SAABAI_ADMIN_ID = "saabai";
  process.env.SAABAI_SESSION_SECRET = "unit-test-secret-0123456789abcdef";
  process.env.PORTAL_SESSION_SECRET = "portal-test-secret-portal-test-secret";
  process.env.LEX_PORTAL_ALLOWED_EMAILS = "partner@tributum.test,solo@gmail.com,b@tributum.test";
  delete process.env.LEX_REVIEW_DAILY_CAP;
  mock.seed({
    hashes: {
      "saabai:users": {
        "lexuser@firm2.test": JSON.stringify({ id: "lexuser", name: "Lex User", email: "lexuser@firm2.test", password: "x", role: "user", dashboardUrl: "/dashboard", products: ["lex"], approvedAt: "", createdAt: "" }),
        "rexuser@shop.test": JSON.stringify({ id: "rexuser", name: "Rex User", email: "rexuser@shop.test", password: "x", role: "user", dashboardUrl: "/dashboard", products: ["rex"], approvedAt: "", createdAt: "" }),
      },
    },
  });
});
after(() => new Promise<void>((r) => mock.server.close(() => r())));

type Who = null | { saabai: string } | { portal: string };
async function cookieFor(who: Who): Promise<Record<string, string>> {
  const { createSessionToken, COOKIE_NAME } = await import("../lib/auth");
  const { signSession } = await import("../lib/portal-session");
  if (who && "saabai" in who) return { cookie: `${COOKIE_NAME}=${await createSessionToken(who.saabai)}` };
  if (who && "portal" in who) return { cookie: `portal_session=${signSession(who.portal)}` };
  return {};
}
async function viaProxy(who: Who, path: string, method = "POST") {
  const { proxy } = await import("../proxy");
  return (await proxy(new NextRequest(`http://localhost${path}`, { method, headers: { host: "localhost", ...(await cookieFor(who)) } })))!;
}
async function req(who: Who) {
  return new Request("http://localhost/api/lex-review", { method: "POST", headers: await cookieFor(who) });
}
const passes = (r: Response) => r.status === 200 && !r.headers.get("location");
const MAY_1 = new Date("2026-10-19T03:00:00Z"); // 1 PM Brisbane

test("proxy: review and submit open to signed-in users, closed to logged out; the queue stays admin-only", async () => {
  for (const p of ["/api/lex-review", "/api/lex-review-submit"]) {
    assert.equal((await viaProxy(null, p)).status, 401, p);
    assert.ok(passes(await viaProxy({ portal: "partner@tributum.test" }, p)), `portal ${p}`);
    assert.ok(passes(await viaProxy({ saabai: "lexuser" }, p)), `lex user ${p}`);
    assert.ok(passes(await viaProxy({ saabai: "saabai" }, p)), `admin ${p}`);
  }
  assert.equal((await viaProxy({ portal: "partner@tributum.test" }, "/api/lex-review-queue", "GET")).status, 403);
  assert.equal((await viaProxy({ saabai: "lexuser" }, "/api/lex-review-queue", "GET")).status, 403);
  assert.equal((await viaProxy({ portal: "partner@tributum.test" }, "/api/lex-settings", "GET")).status, 403);
  assert.equal((await viaProxy({ portal: "partner@tributum.test" }, "/api/admin/lex-review-caps", "GET")).status, 403);
});

test("who counts as a firm user", async () => {
  const { resolveReviewActor, firmKeyForEmail } = await import("../lib/lex-review-access");
  assert.deepEqual(await resolveReviewActor(await req({ portal: "partner@tributum.test" })), { kind: "firm", email: "partner@tributum.test", firm: "tributum.test" });
  assert.deepEqual(await resolveReviewActor(await req({ saabai: "lexuser" })), { kind: "firm", email: "lexuser@firm2.test", firm: "firm2.test" });
  assert.equal((await resolveReviewActor(await req({ saabai: "saabai" })))?.kind, "admin");
  assert.equal(await resolveReviewActor(await req({ saabai: "rexuser" })), null, "client without Lex");
  assert.equal(await resolveReviewActor(await req({ portal: "stranger@nowhere.test" })), null, "unknown portal email");
  assert.equal(await resolveReviewActor(await req(null)), null);
  assert.equal(firmKeyForEmail("Solo@Gmail.com"), "solo@gmail.com", "free mail is per person");
  assert.equal(firmKeyForEmail("a@Tributum.test"), "tributum.test");
});

test("cap: 20 a day per firm, shared by the firm's users, clear message on the 21st, refund on failure", async () => {
  const { gateReview } = await import("../lib/lex-review-access");
  for (let i = 0; i < 19; i++) assert.ok((await gateReview(await req({ portal: "partner@tributum.test" }), "review", MAY_1)).ok, `#${i + 1}`);
  const twentieth = await gateReview(await req({ portal: "b@tributum.test" }), "review", MAY_1);
  assert.ok(twentieth.ok, "a colleague uses the 20th");
  const over = await gateReview(await req({ portal: "partner@tributum.test" }), "review", MAY_1);
  assert.ok(!over.ok);
  if (!over.ok) {
    assert.equal(over.response.status, 429);
    const body = await over.response.json();
    assert.match(body.message, /used all 20 document reviews for today/);
    assert.match(body.message, /midnight Brisbane time/);
    assert.equal(body.error, body.message, "older Lex pages show `error`");
    assert.ok(!/[\u2012-\u2015]/.test(body.message));
  }
  if (twentieth.ok) await twentieth.refund();
  assert.ok((await gateReview(await req({ portal: "partner@tributum.test" }), "review", MAY_1)).ok, "refunded slot is usable");
  // another firm, the next Brisbane day, and send-for-review all have their own allowance
  assert.ok((await gateReview(await req({ saabai: "lexuser" }), "review", MAY_1)).ok);
  assert.ok((await gateReview(await req({ portal: "partner@tributum.test" }), "review", new Date("2026-10-19T14:00:00Z"))).ok, "midnight Brisbane is 14:00 UTC");
  assert.ok((await gateReview(await req({ portal: "partner@tributum.test" }), "submit", MAY_1)).ok);
  // admins are never capped
  for (let i = 0; i < 25; i++) assert.ok((await gateReview(await req({ saabai: "saabai" }), "review", MAY_1)).ok);
});

test("caps are configurable: env default and per-firm override (0 turns it off)", async () => {
  const { gateReview, capForFirm, CAPS_KEY } = await import("../lib/lex-review-access");
  const { getRedis } = await import("../lib/redis");
  process.env.LEX_REVIEW_DAILY_CAP = "3";
  assert.equal(await capForFirm("other.test"), 3);
  await getRedis()!.hset(CAPS_KEY, { "solo@gmail.com": 1 });
  assert.ok((await gateReview(await req({ portal: "solo@gmail.com" }), "review", MAY_1)).ok);
  const blocked = await gateReview(await req({ portal: "solo@gmail.com" }), "review", MAY_1);
  assert.ok(!blocked.ok && blocked.response.status === 429);
  await getRedis()!.hset(CAPS_KEY, { "firm2.test": 0 });
  const off = await gateReview(await req({ saabai: "lexuser" }), "review", MAY_1);
  assert.ok(!off.ok);
  if (!off.ok) assert.match((await off.response.json()).message, /turned off for your firm/);
  delete process.env.LEX_REVIEW_DAILY_CAP;
});

test("non-Lex accounts get a clear 403 from the route", async () => {
  const { gateReview } = await import("../lib/lex-review-access");
  const g = await gateReview(await req({ saabai: "rexuser" }), "review", MAY_1);
  assert.ok(!g.ok);
  if (!g.ok) {
    assert.equal(g.response.status, 403);
    assert.match((await g.response.json()).message, /Lex firm accounts/);
  }
});
