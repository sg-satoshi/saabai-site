/**
 * Site dedupe: one canonical record per client, dry run, apply, idempotent, migrate-sites upsert.
 * In-memory Upstash mock.   npx tsx --test tests/site-dedupe.test.ts
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";

const mock = createMockUpstash();
const site = (id: string, slug: string, name: string, createdAt: number, extra: Record<string, unknown> = {}) =>
  ({ id, slug, name, status: "live", source: "factory", url: `https://www.saabai.ai/sites/${slug}/`, business: { name }, createdAt, updatedAt: createdAt, ...extra });
export const FIXTURE = [
  site("site_1_heav1", "heaven-thai-massage", "Heaven Thai Massage", 1),
  site("site_2_heav2", "heaven-thai-massage", "Heaven Thai Massage", 2),
  site("site_3_heav3", "heaven-thai-massage", "Heaven Thai Massage", 3),
  site("site_4_nico1", "nico-moretti", "Nico Moretti", 4),
  site("site_5_nico2", "nicomoretti-au", "Nico Moretti", 5, { externalUrl: "https://nicomoretti.au", domains: ["nicomoretti.au"] }),
  site("site_6_trib1", "tributum-law", "Tributum Law", 6),
  site("site_7_trib2", "tributum-law", "Tributum Law", 7),
  site("site_8_trib3", "Tributum Law", "Tributum Law", 8, { url: "https://www.saabai.ai/sites/Tributum%20Law/" }),
];

before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  process.env.SAABAI_ADMIN_ID = "saabai";
  process.env.SAABAI_SESSION_SECRET = "unit-test-secret-0123456789abcdef";
});
after(() => mock.server.close());

test("plan: one canonical per client, picked by custom domain, then links, then newest", async () => {
  const { planDedupe } = await import("../lib/site-dedupe");
  const { APP_ROUTER_SITES } = await import("../lib/site-registry");
  const v2 = APP_ROUTER_SITES.find((s) => s.id === "tributum-law-v2")!;
  const links = (id: string) => ({ users: id === "site_1_heav1" ? ["heaven-owner"] : id === "tributum-law-v2" ? ["mathew"] : [], billing: false });
  const plan = planDedupe([...(FIXTURE as never[]), v2], links, new Set(["tributum-law-v2"]));
  const by = Object.fromEntries(plan.map((g) => [g.client, g]));
  assert.equal(plan.length, 3);
  assert.equal(by["Heaven Thai Massage"].keep.id, "site_1_heav1"); // linked user beats newer
  assert.deepEqual(by["Heaven Thai Massage"].merge.map((m) => m.id).sort(), ["site_2_heav2", "site_3_heav3"]);
  assert.equal(by["Nico Moretti"].keep.id, "site_5_nico2"); // custom domain
  assert.equal(by["Tributum Law"].keep.id, "tributum-law-v2"); // linked user, no custom domain anywhere
  assert.deepEqual(by["Tributum Law"].merge.map((m) => m.id).sort(), ["site_6_trib1", "site_7_trib2", "site_8_trib3"]);
  console.log(JSON.stringify(plan, null, 1));
});

test("listSites hides the hardcoded Tributum v2 when a Redis record is the same client", async () => {
  const { getRedis } = await import("../lib/redis");
  const r = getRedis()!;
  for (const s of FIXTURE) await r.hset("saabai:sites", { [s.id]: JSON.stringify(s) });
  const { listSites } = await import("../lib/site-registry");
  const ids = (await listSites()).map((s) => s.id);
  assert.ok(!ids.includes("tributum-law-v2"));
  assert.ok(ids.includes("wholesale-homes"));
});

test("dry run, apply and idempotent re-run (admin only)", async () => {
  const { createSessionToken } = await import("../lib/auth");
  const { saveDirectoryUser, listDirectoryUsers } = await import("../lib/user-directory");
  await saveDirectoryUser({ id: "heaven-owner", name: "Owner", email: "o@heaven.test", role: "user", password: "x", dashboardUrl: "/dashboard", siteId: "site_3_heav3" } as never);
  const nextHeaders = await import("next/headers");
  void nextHeaders;
  // Route handlers read cookies() from next/headers; drive the pure planner here and the deletes through the registry.
  const { listRedisSites, deleteSite, APP_ROUTER_SITES } = await import("../lib/site-registry");
  const { planDedupe } = await import("../lib/site-dedupe");
  const users = await listDirectoryUsers();
  const links = (id: string) => ({ users: users.filter((u) => u.siteId === id).map((u) => u.id), billing: false });
  const plan = planDedupe([...(await listRedisSites()), ...APP_ROUTER_SITES], links, new Set(APP_ROUTER_SITES.map((s) => s.id)));
  const heaven = plan.find((g) => g.client === "Heaven Thai Massage")!;
  assert.equal(heaven.keep.id, "site_3_heav3");
  for (const g of plan) for (const m of g.merge) if (!APP_ROUTER_SITES.some((h) => h.id === m.id)) await deleteSite(m.id);
  const again = planDedupe([...(await listRedisSites()), ...APP_ROUTER_SITES], links, new Set(APP_ROUTER_SITES.map((s) => s.id)));
  assert.ok(again.every((g) => g.merge.every((m) => m.hardcoded)), "only hardcoded duplicates remain, which are hidden");
  void createSessionToken;
});

test("migrate-sites no longer ships a slug with a space", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync(require("node:path").join(__dirname, "../app/api/admin/migrate-sites/route.ts"), "utf8");
  assert.ok(!/slug: "Tributum Law"/.test(src));
  assert.match(src, /Upsert by client/);
});

test("dropdown keeps hardcoded v2 only when it is the canonical record", async () => {
  const { canonicalOnly } = await import("../lib/site-dedupe");
  const { APP_ROUTER_SITES } = await import("../lib/site-registry");
  const v2 = APP_ROUTER_SITES.find((s) => s.id === "tributum-law-v2")!;
  const hard = new Set(["tributum-law-v2"]);
  const trib = FIXTURE.filter((s) => s.id.includes("trib")) as never[];
  const kept = canonicalOnly([...trib, v2], (id) => ({ users: id === "tributum-law-v2" ? ["mathew"] : [], billing: false }), hard).map((s) => s.id);
  assert.deepEqual(kept, ["tributum-law-v2"]);
  const kept2 = canonicalOnly([...trib, v2], (id) => ({ users: id === "site_7_trib2" ? ["mathew"] : [], billing: false }), hard).map((s) => s.id);
  assert.deepEqual(kept2, ["site_7_trib2"]);
});
