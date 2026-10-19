/**
 * Roadmap: validation, merge/promotion, filters, seed-once store, reorder, GitHub fail-soft, access area.
 * In-memory Upstash mock, stubbed fetch, no real services.   npx tsx --test tests/roadmap.test.ts
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";
import { buildView, filterView, prStatus, validateInput, SEED_ITEMS, STATUSES } from "../lib/roadmap-core";
import { createItem, deleteItem, fetchGithubState, loadItems, moveItem, resetGithubCache, updateItem } from "../lib/roadmap";
import { decide, levelFor, sanitizeGrant, type AccessGrant } from "../lib/access";

const mock = createMockUpstash();
before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
});
after(() => mock.server.close());

test("validateInput: required fields, bounds, unknown status", () => {
  assert.equal(validateInput({ title: "x", status: "planned" }).ok, false);
  assert.equal(validateInput({ title: "Good title", status: "nope" }).ok, false);
  assert.equal(validateInput({ title: "Good title", status: "planned", prNumber: "abc" }).ok, false);
  assert.equal(validateInput({ title: "Good title", status: "planned", priority: "urgent" }).ok, false);
  const ok = validateInput({ title: "  Good title ", status: "idea", description: "d".repeat(5000), prNumber: "12", area: "" });
  assert.ok(ok.ok);
  if (ok.ok) { assert.equal(ok.value.title, "Good title"); assert.equal(ok.value.description!.length, 1200); assert.equal(ok.value.prNumber, 12); assert.equal(ok.value.area, "Other"); }
  assert.equal(validateInput({ status: "planned" }, true).ok, true); // partial patch
  assert.equal(validateInput(null).ok, false);
});

test("seed covers the agreed items and statuses are valid", () => {
  const ids = SEED_ITEMS.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const i of SEED_ITEMS) assert.ok(STATUSES.includes(i.status));
  for (const w of ["coupon-reporting", "coupon-subscription-duration", "coupon-auto-apply", "payments-coupon-picker", "admin-roadmap", "role-based-access", "chat-integrations-addon", "stripe-payments-module", "client-logins", "knowledge-builder", "chat-lead-capture", "idea-bulk-codes-partners"]) assert.ok(ids.includes(w), w);
  assert.equal(SEED_ITEMS.find((i) => i.id === "idea-bulk-codes-partners")!.status, "idea");
  assert.equal(SEED_ITEMS.find((i) => i.id === "coupon-reporting")!.status, "planned");
});

test("prStatus and buildView: deployed vs shipped, promotion, unmatched PRs added, unknown deploy", () => {
  assert.equal(prStatus("2026-10-19T01:00:00Z", "2026-10-19T02:00:00Z"), "deployed");
  assert.equal(prStatus("2026-10-19T03:00:00Z", "2026-10-19T02:00:00Z"), "shipped");
  assert.equal(prStatus("2026-10-19T01:00:00Z", null), "shipped");
  const items = [{ ...SEED_ITEMS.find((i) => i.id === "coupon-start-date")! }, { ...SEED_ITEMS.find((i) => i.id === "coupon-reporting")! }];
  const gh = { ok: true, deployedAt: "2026-10-19T05:00:00Z", prs: [
    { number: 146, title: "Coupon start date", mergedAt: "2026-10-19T04:00:00Z", url: "u146" },
    { number: 200, title: "Chat widget fix", mergedAt: "2026-10-19T06:00:00Z", url: "u200" }] };
  const v = buildView(items, gh);
  assert.equal(v.find((i) => i.id === "coupon-start-date")!.status, "deployed"); // promoted
  assert.equal(v.find((i) => i.id === "coupon-reporting")!.status, "planned"); // untouched
  const auto = v.find((i) => i.id === "gh-200")!;
  assert.equal(auto.status, "shipped"); assert.equal(auto.source, "github"); assert.equal(auto.area, "Chatbots");
  assert.equal(v.filter((i) => i.prNumber === 146).length, 1); // no duplicate
  assert.equal(buildView(items, null).find((i) => i.id === "coupon-start-date")!.status, "in_progress"); // fail soft
});

test("filterView: search, status and area", () => {
  const v = buildView(SEED_ITEMS, null);
  assert.ok(filterView(v, { q: "lead capture" }).some((i) => i.id === "chat-lead-capture"));
  assert.ok(filterView(v, { q: "#147" }).some((i) => i.id === "coupon-once-per-customer"));
  assert.ok(filterView(v, { status: "idea" }).every((i) => i.status === "idea"));
  assert.ok(filterView(v, { area: "Coupons" }).every((i) => i.area === "Coupons"));
  assert.equal(filterView(v, { q: "zzzznothing" }).length, 0);
  assert.equal(filterView(v, { status: "all", area: "all" }).length, v.length);
});

test("store: seeds once, create/update/move/delete", async () => {
  const a = await loadItems();
  assert.equal(a!.length, SEED_ITEMS.length);
  await deleteItem("coupon-reporting");
  const b = await loadItems();
  assert.equal(b!.length, SEED_ITEMS.length - 1, "reload must not re-seed");
  const it = await createItem({ title: "New thing", status: "planned", description: "", area: "Admin" }, "tester");
  assert.equal((await loadItems())![0].id, it.id); // top of list
  const up = await updateItem(it.id, { status: "idea", target: "Dec 2026" }, "tester");
  assert.equal(up!.status, "idea"); assert.equal(up!.target, "Dec 2026"); assert.equal(up!.updatedBy, "tester");
  const cleared = await updateItem(it.id, { target: undefined }, "tester");
  assert.equal(cleared!.target, undefined);
  assert.equal(await updateItem("missing", { title: "x" }, "t"), null);
  // reorder within the Ideas group: the new idea is first, so move it down past the seeded idea and back
  const before2 = (await loadItems())!.filter((i) => i.status === "idea").map((i) => i.id);
  await moveItem(it.id, "down");
  const after2 = (await loadItems())!.filter((i) => i.status === "idea").map((i) => i.id);
  assert.deepEqual(after2, [before2[1], before2[0]]);
  assert.equal(await moveItem(it.id, "down"), true); // edge: no-op, no throw
  assert.equal(await moveItem("missing", "up"), false);
  assert.ok(await deleteItem(it.id));
  assert.equal(await deleteItem(it.id), null);
});

test("GitHub: parses merged PRs and deploy state; fails soft on error", async () => {
  const realFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async (url: string) => {
      const u = String(url);
      const j = (b: unknown) => new Response(JSON.stringify(b), { status: 200 });
      if (u.includes("/pulls?")) return j([{ number: 5, title: "A", merged_at: "2026-10-19T01:00:00Z", html_url: "h5" }, { number: 6, title: "B", merged_at: null, html_url: "h6" }]);
      if (u.includes("/deployments?")) return j([{ id: 9, created_at: "2026-10-19T02:00:00Z" }]);
      if (u.includes("/deployments/9/statuses")) return j([{ state: "success" }]);
      return new Response("no", { status: 404 });
    }) as typeof fetch;
    resetGithubCache();
    const s = await fetchGithubState(true);
    assert.equal(s.ok, true); assert.deepEqual(s.prs.map((p) => p.number), [5]); assert.equal(s.deployedAt, "2026-10-19T02:00:00Z");

    globalThis.fetch = (async (url: string) => (String(url).includes("/pulls?") ? new Response("x", { status: 500 }) : new Response("[]"))) as typeof fetch;
    resetGithubCache();
    const bad = await fetchGithubState(true);
    assert.equal(bad.ok, false); assert.deepEqual(bad.prs, []);

    globalThis.fetch = (async () => { throw new Error("network down"); }) as typeof fetch;
    resetGithubCache();
    assert.equal((await fetchGithubState(true)).ok, false);

    // deploy lookup failing keeps PRs, deployedAt unknown
    globalThis.fetch = (async (url: string) => {
      const u = String(url);
      if (u.includes("/pulls?")) return new Response(JSON.stringify([{ number: 5, title: "A", merged_at: "2026-10-19T01:00:00Z", html_url: "h5" }]));
      return new Response("no", { status: 403 });
    }) as typeof fetch;
    resetGithubCache();
    const part = await fetchGithubState(true);
    assert.equal(part.ok, true); assert.equal(part.deployedAt, null);
  } finally { globalThis.fetch = realFetch; resetGithubCache(); }
});

test("access: roadmap area. viewer reads only, custom write, ungranted denied, cap and sanitize", () => {
  const viewer: AccessGrant = { role: "viewer", areas: { roadmap: "read" } };
  const editor: AccessGrant = { role: "custom", areas: { roadmap: "write" } };
  const none: AccessGrant = { role: "custom", areas: { coupons: "write" } };
  assert.equal(decide(viewer, "GET", "/saabai-admin/roadmap").allow, true);
  assert.equal(decide(viewer, "GET", "/api/admin/roadmap").allow, true);
  for (const m of ["POST", "PATCH", "DELETE"]) assert.equal(decide(viewer, m, "/api/admin/roadmap").allow, false, m);
  assert.equal(decide(editor, "POST", "/api/admin/roadmap").allow, true);
  assert.equal(decide(none, "GET", "/api/admin/roadmap").allow, false);
  assert.equal(decide({ role: "admin" }, "DELETE", "/api/admin/roadmap").allow, true);
  assert.equal(levelFor({ role: "viewer", areas: { roadmap: "write" } }, "roadmap"), "read"); // viewer capped
  const g = sanitizeGrant({ role: "custom", areas: { roadmap: "write" } });
  assert.equal(g!.areas!.roadmap, "write");
  assert.equal(decide(editor, "GET", "/api/admin/roadmap/../users").allow, false); // dot segments fail closed
});
