/**
 * Document compare daily cap for Lex firm users.
 * In-memory Upstash mock, no AI calls.   npx tsx --test tests/lex-compare-access.test.ts
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
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
  delete process.env.LEX_COMPARE_DAILY_CAP;
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
async function req(who: Who) {
  return new Request("http://localhost/api/lex-compare", { method: "POST", headers: await cookieFor(who) });
}
const MAY_1 = new Date("2026-10-19T03:00:00Z"); // 1 PM Brisbane

test("compare cap: 20 a day per firm, own counter separate from reviews, clear message, refund on failure", async () => {
  const { gateCompare, gateReview } = await import("../lib/lex-review-access");
  for (let i = 0; i < 19; i++) assert.ok((await gateCompare(await req({ portal: "partner@tributum.test" }), MAY_1)).ok, `#${i + 1}`);
  const twentieth = await gateCompare(await req({ portal: "b@tributum.test" }), MAY_1);
  assert.ok(twentieth.ok, "a colleague uses the 20th");
  const over = await gateCompare(await req({ portal: "partner@tributum.test" }), MAY_1);
  assert.ok(!over.ok);
  if (!over.ok) {
    assert.equal(over.response.status, 429);
    const body = await over.response.json();
    assert.match(body.message, /used all 20 document compares for today/);
    assert.match(body.message, /midnight Brisbane time/);
    assert.equal(body.error, body.message, "UI shows `error` or `message`");
    assert.ok(!/[\u2012-\u2015]/.test(body.message), "no em dashes");
  }
  // reviews still have their own allowance
  assert.ok((await gateReview(await req({ portal: "partner@tributum.test" }), "review", MAY_1)).ok, "compare does not spend a review");
  if (twentieth.ok) await twentieth.refund();
  assert.ok((await gateCompare(await req({ portal: "partner@tributum.test" }), MAY_1)).ok, "refunded slot is usable");
  assert.ok((await gateCompare(await req({ saabai: "lexuser" }), MAY_1)).ok, "another firm");
  assert.ok((await gateCompare(await req({ portal: "partner@tributum.test" }), new Date("2026-10-19T14:00:00Z"))).ok, "midnight Brisbane is 14:00 UTC");
  for (let i = 0; i < 25; i++) assert.ok((await gateCompare(await req({ saabai: "saabai" }), MAY_1)).ok, "admins uncapped");
});

test("compare caps are configurable: env default and per-firm override (0 turns it off)", async () => {
  const { gateCompare, compareCapForFirm, COMPARE_CAPS_KEY } = await import("../lib/lex-review-access");
  const { getRedis } = await import("../lib/redis");
  process.env.LEX_COMPARE_DAILY_CAP = "2";
  assert.equal(await compareCapForFirm("other.test"), 2);
  await getRedis()!.hset(COMPARE_CAPS_KEY, { "solo@gmail.com": 1 });
  assert.ok((await gateCompare(await req({ portal: "solo@gmail.com" }), MAY_1)).ok);
  const blocked = await gateCompare(await req({ portal: "solo@gmail.com" }), MAY_1);
  assert.ok(!blocked.ok && blocked.response.status === 429);
  await getRedis()!.hset(COMPARE_CAPS_KEY, { "firm2.test": 0 });
  const off = await gateCompare(await req({ saabai: "lexuser" }), MAY_1);
  assert.ok(!off.ok);
  if (!off.ok) assert.match((await off.response.json()).message, /turned off for your firm/);
  delete process.env.LEX_COMPARE_DAILY_CAP;
});

test("non-Lex accounts get a clear 403 from compare", async () => {
  const { gateCompare } = await import("../lib/lex-review-access");
  const g = await gateCompare(await req({ saabai: "rexuser" }), MAY_1);
  assert.ok(!g.ok);
  if (!g.ok) {
    assert.equal(g.response.status, 403);
    assert.match((await g.response.json()).message, /Lex firm accounts/);
  }
});
