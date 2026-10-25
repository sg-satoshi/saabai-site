/**
 * Lex matters: firm-wide by email domain, create, update, attach items, proxy gating.
 * In-memory Upstash mock, no AI calls.   npx tsx --test tests/lex-matters.test.ts
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
  process.env.LEX_PORTAL_ALLOWED_EMAILS = "partner@tributumlaw.test,assoc@tributumlaw.test,other@elsewhere.test";
});
after(() => mock.server.close());

const as = async (email: string, url: string, init: RequestInit = {}) => {
  const { signSession } = await import("../lib/portal-session");
  return new Request(`http://localhost${url}`, { ...init, headers: { "Content-Type": "application/json", cookie: `portal_session=${signSession(email)}` } });
};

test("matter prefix from the firm domain", async () => {
  const { matterPrefix } = await import("../lib/lex-matters");
  assert.equal(matterPrefix("tributumlaw.com"), "TL");
  assert.equal(matterPrefix("smithlegal.com.au"), "SL");
  assert.equal(matterPrefix("acme.com"), "AC");
});

test("colleagues on one domain share matters and items; another firm sees none", async () => {
  const list = await import("../app/api/lex-matters/route");
  const one = await import("../app/api/lex-matters/[id]/route");
  const items = await import("../app/api/lex-matters/[id]/items/route");

  const bad = await list.POST(await as("partner@tributumlaw.test", "/api/lex-matters", { method: "POST", body: JSON.stringify({ name: "x", area: "Astrology" }) }));
  assert.equal(bad.status, 400);

  const c = await list.POST(await as("partner@tributumlaw.test", "/api/lex-matters", { method: "POST",
    body: JSON.stringify({ name: "Harbour Holdings \u2014 objection", client: "Harbour Holdings Pty Ltd", area: "Tax", deadline: "2026-10-28", deadlineLabel: "Lodge objection" }) }));
  assert.equal(c.status, 201);
  const { matter } = await c.json();
  assert.match(matter.id, /^TL-\d{4}-0001$/);
  assert.ok(!matter.name.includes("\u2014"), "no em dashes stored");

  const ctx = { params: Promise.resolve({ id: matter.id }) };
  const put = await items.POST(await as("assoc@tributumlaw.test", `/api/lex-matters/${matter.id}/items`, { method: "POST",
    body: JSON.stringify({ ref: "research:t_1", kind: "research", title: "Div 7A", data: { messages: [{ role: "user", content: "q" }] } }) }), ctx);
  assert.equal(put.status, 200);

  const seen = await (await list.GET(await as("assoc@tributumlaw.test", "/api/lex-matters"))).json();
  assert.equal(seen.matters.length, 1);
  assert.equal(seen.matters[0].itemCount, 1);
  const detail = await (await one.GET(await as("partner@tributumlaw.test", `/api/lex-matters/${matter.id}`), ctx)).json();
  assert.equal(detail.items[0].by, "assoc@tributumlaw.test");

  const other = await (await list.GET(await as("other@elsewhere.test", "/api/lex-matters"))).json();
  assert.equal(other.matters.length, 0);
  assert.equal((await one.GET(await as("other@elsewhere.test", `/api/lex-matters/${matter.id}`), ctx)).status, 404);

  const upd = await one.PATCH(await as("partner@tributumlaw.test", `/api/lex-matters/${matter.id}`, { method: "PATCH", body: JSON.stringify({ status: "closed" }) }), ctx);
  assert.equal((await upd.json()).matter.status, "closed");
});

test("logged out gets 401 from the route and the proxy", async () => {
  const list = await import("../app/api/lex-matters/route");
  assert.equal((await list.GET(new Request("http://localhost/api/lex-matters"))).status, 401);
  const { proxy } = await import("../proxy");
  const r = await proxy(new NextRequest("http://localhost/api/lex-matters", { headers: { host: "localhost" } }));
  assert.ok(r && [401, 403, 307].includes(r.status), String(r?.status));
});
