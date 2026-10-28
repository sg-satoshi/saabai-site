/**
 * Roadmap: validation, merge/promotion, filters, seed-once store, reorder, GitHub fail-soft, access area.
 * In-memory Upstash mock, stubbed fetch, no real services.   npx tsx --test tests/roadmap.test.ts
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";
import { applyLinkPatches, buildView, classifySearchItems, closesFromBody, filterView, prStatus, refreshStoredSeeds, validateInput, RM_AREAS, SEED_ITEMS, SEED_STAMP, STATUSES, WORKSTREAM_LABEL, type GithubState, type RoadmapItem } from "../lib/roadmap-core";
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
  assert.equal(validateInput({ title: "Good title", status: "planned", issueNumber: 0 }).ok, false);
  assert.equal(validateInput({ title: "Good title", status: "in_review" }).ok, true);
  assert.equal(validateInput({ title: "Good title", status: "blocked" }).ok, true);
  assert.equal(validateInput({ title: "Good title", status: "planned", priority: "urgent" }).ok, false);
  const ok = validateInput({ title: "  Good title ", status: "idea", description: "d".repeat(5000), prNumber: "12", issueNumber: "34", area: "" });
  assert.ok(ok.ok);
  if (ok.ok) { assert.equal(ok.value.title, "Good title"); assert.equal(ok.value.description!.length, 1200); assert.equal(ok.value.prNumber, 12); assert.equal(ok.value.issueNumber, 34); assert.equal(ok.value.area, "Other"); }
  const cleared = validateInput({ prNumber: "", issueNumber: null }, true);
  assert.ok(cleared.ok);
  if (cleared.ok) { assert.equal(cleared.value.prNumber, undefined); assert.equal(cleared.value.issueNumber, undefined); }
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
  // Done work is linked, not hardcoded to shipped or deployed.
  const picker = SEED_ITEMS.find((i) => i.id === "payments-coupon-picker")!;
  assert.equal(picker.prNumber, 154); assert.equal(picker.status, "planned");
  const page = SEED_ITEMS.find((i) => i.id === "admin-roadmap")!;
  assert.equal(page.prNumber, 149); assert.equal(page.status, "in_progress");
  assert.equal(SEED_ITEMS.find((i) => i.id === "chat-followups")!.prNumber, undefined);
  for (const area of ["Saabai site", "SEO toolkit", "Instagram", "LocalCommand", "Lex", "Blueprint", "client sites", "admin"]) {
    assert.ok((RM_AREAS as readonly string[]).includes(area), area);
    assert.ok(SEED_ITEMS.some((i) => i.area === area), area);
  }
  const blob = SEED_ITEMS.map((i) => `${i.title} ${i.description}`).join("\n");
  assert.equal(/Tributum|Rex Plastics|home-based|LeadGen|\u2014/.test(blob), false);
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
  assert.equal(auto.status, "shipped"); assert.equal(auto.source, "github"); assert.equal(auto.area, "client sites");
  assert.equal(v.filter((i) => i.prNumber === 146).length, 1); // no duplicate
  assert.equal(buildView(items, null).find((i) => i.id === "coupon-start-date")!.status, "in_progress"); // fail soft
});

function ghState(partial: Partial<GithubState> & Pick<GithubState, "prs">): GithubState {
  return { ok: true, deployedAt: null, openIssues: [], openPrs: [], linked: [], fetchedAt: "2026-10-26T00:00:00Z", ...partial };
}

test("buildView: linked merged PR stays Done outside a short window, closed issues are not open work", () => {
  const picker = SEED_ITEMS.find((i) => i.id === "payments-coupon-picker")!;
  const page = SEED_ITEMS.find((i) => i.id === "admin-roadmap")!;
  const followups = SEED_ITEMS.find((i) => i.id === "chat-followups")!;
  const linkedIssue: RoadmapItem = { ...followups, id: "linked-issue", issueNumber: 278, prNumber: undefined, status: "in_progress" };
  const gh = ghState({
    deployedAt: "2026-10-26T12:00:00Z",
    prs: [
      { number: 154, title: "Payments coupon picker", mergedAt: "2026-10-19T05:25:44Z", url: "u154" },
      { number: 149, title: "Admin Roadmap page", mergedAt: "2026-10-19T04:04:58Z", url: "u149" },
      { number: 208, title: "Move Christina and Zara onto the shared chat platform", mergedAt: "2026-10-20T05:27:55Z", url: "u208" },
    ],
    openIssues: [
      { number: 280, title: "SEO/AI search audit", url: "i280", labels: ["agent:chief", "status:in-progress"], updatedAt: "2026-10-26T00:00:00Z" },
      { number: 233, title: "Plan: client onboarding flow", url: "i233", labels: ["status:in-review"], updatedAt: "2026-10-26T00:00:00Z" },
    ],
    openPrs: [
      { number: 282, title: "SEO audit fixes", url: "p282", labels: [], updatedAt: "2026-10-26T01:00:00Z", closes: [280] },
      { number: 165, title: "Site copy batch 1", url: "p165", labels: [], updatedAt: "2026-10-26T01:00:00Z", closes: [] },
    ],
    linked: [
      { kind: "issue", number: 278, title: "AI visitors panel", url: "i278", state: "closed", mergedAt: null, labels: ["agent:chief", "status:in-progress"], updatedAt: "2026-10-26T02:00:00Z" },
    ],
  });
  const v = buildView([picker, page, followups, linkedIssue], gh);
  assert.equal(v.find((i) => i.id === "payments-coupon-picker")!.status, "deployed");
  assert.equal(v.find((i) => i.id === "admin-roadmap")!.status, "deployed");
  assert.equal(v.find((i) => i.id === "chat-followups")!.status, "planned");
  assert.equal(v.find((i) => i.id === "gh-208")!.status, "deployed");
  assert.equal(v.find((i) => i.id === "linked-issue")!.status, "shipped"); // closed issue, stale in-progress label ignored
  assert.equal(v.filter((i) => i.issueNumber === 278 && i.source === "github").length, 0);
  const seo = v.find((i) => i.id === "gh-issue-280")!;
  assert.equal(seo.status, "in_review"); // open PR closes it
  assert.equal(seo.area, "SEO toolkit");
  assert.equal(seo.prNumber, 282);
  assert.equal(v.find((i) => i.id === "gh-pr-282"), undefined); // attached, not duplicated
  assert.equal(v.find((i) => i.id === "gh-issue-233")!.status, "in_review");
  assert.equal(v.find((i) => i.id === "gh-pr-165")!.status, "in_review");
  assert.equal(buildView([picker], null).find((i) => i.id === "payments-coupon-picker")!.status, "planned");
});

test("classifySearchItems drops closed issues and unmerged closed PRs", () => {
  const split = classifySearchItems([
    { number: 278, title: "Closed with stale label", state: "closed", html_url: "i278", labels: [{ name: "status:in-progress" }, { name: "agent:chief" }] },
    { number: 10, title: "Closed unmerged", state: "closed", html_url: "p10", pull_request: { merged_at: null } },
    { number: 208, title: "Shared platform", state: "closed", html_url: "p208", pull_request: { merged_at: "2026-10-20T05:27:55Z" } },
    { number: 285, title: "Roadmap", state: "open", html_url: "i285", labels: [{ name: "status:blocked" }, { name: WORKSTREAM_LABEL }], updated_at: "2026-10-26T00:00:00Z" },
    { number: 284, title: "Blueprint checks", state: "open", html_url: "p284", pull_request: {}, body: "Closes #281", labels: [], updated_at: "2026-10-26T00:00:00Z" },
  ]);
  assert.deepEqual(split.prs.map((p) => p.number), [208]);
  assert.deepEqual(split.openIssues.map((i) => i.number), [285]);
  assert.equal(split.openIssues[0].workstream, true);
  assert.equal(buildView([], ghState({ prs: [], openIssues: split.openIssues })).find((i) => i.id === "gh-issue-285")!.workstream, true);
  assert.deepEqual(split.openPrs.map((p) => p.number), [284]);
  assert.deepEqual(split.openPrs[0].closes, [281]);
  assert.deepEqual(closesFromBody("Closes #280\nAlso fixes #12 and resolved: #9. Not a close of ticket 4."), [280, 12, 9]);
});

test("applyLinkPatches fills missing links and leaves status, title and other rows alone", () => {
  const picker = { ...SEED_ITEMS.find((i) => i.id === "payments-coupon-picker")!, prNumber: undefined, status: "planned" as const };
  const page = { ...SEED_ITEMS.find((i) => i.id === "admin-roadmap")!, prNumber: undefined, status: "in_progress" as const };
  const custom = { ...picker, id: "custom", title: "Keep me", prNumber: 99, status: "idea" as const };
  const { items, changes } = applyLinkPatches([picker, page, custom]);
  assert.equal(items.length, 3);
  assert.deepEqual(items.map((i) => i.id), ["payments-coupon-picker", "admin-roadmap", "custom"]);
  assert.equal(items[0].prNumber, 154); assert.equal(items[0].status, "planned"); assert.equal(items[0].title, picker.title);
  assert.equal(items[1].prNumber, 149); assert.equal(items[1].status, "in_progress");
  assert.equal(items[2].prNumber, 99); assert.equal(items[2].status, "idea"); assert.equal(items[2].title, "Keep me");
  assert.deepEqual(changes, [
    { id: "payments-coupon-picker", field: "prNumber", value: 154 },
    { id: "admin-roadmap", field: "prNumber", value: 149 },
  ]);
  const again = applyLinkPatches(items);
  assert.equal(again.changes.length, 0);
  assert.equal(again.items[2].prNumber, 99);
});

test("filterView: search, status and area", () => {
  const v = buildView(SEED_ITEMS, null);
  assert.ok(filterView(v, { q: "lead capture" }).some((i) => i.id === "chat-lead-capture"));
  assert.ok(filterView(v, { q: "#147" }).some((i) => i.id === "coupon-once-per-customer"));
  assert.ok(filterView(v, { status: "idea" }).every((i) => i.status === "idea"));
  assert.ok(filterView(v, { area: "admin" }).every((i) => i.area === "admin"));
  assert.equal(filterView(v, { q: "zzzznothing" }).length, 0);
  assert.equal(filterView(v, { status: "all", area: "all" }).length, v.length);
});

test("refreshStoredSeeds updates an untouched seed and leaves an edited row", () => {
  const follow = SEED_ITEMS.find((i) => i.id === "chat-followups")!;
  const stale: RoadmapItem = { ...follow, description: "Old follow-up list that named a withheld client.", area: "Chatbots", updatedAt: SEED_STAMP, updatedBy: "seed" };
  const edited: RoadmapItem = { ...stale, id: "custom-note", title: "Keep this", description: "Hand edited note", updatedBy: "shane", updatedAt: "2026-10-20T00:00:00.000Z" };
  const { items, changed } = refreshStoredSeeds([stale, edited]);
  assert.equal(changed, true);
  assert.equal(items[0].description, follow.description);
  assert.equal(items[0].area, "client sites");
  assert.equal(items[0].updatedAt, follow.updatedAt);
  assert.equal(items[1].title, "Keep this");
  assert.equal(items[1].description, "Hand edited note");
  const again = refreshStoredSeeds(items);
  assert.equal(again.changed, false);
});

test("store: seeds once, create/update/move/delete", async () => {
  const a = await loadItems();
  assert.equal(a!.length, SEED_ITEMS.length);
  await deleteItem("coupon-reporting");
  const b = await loadItems();
  assert.equal(b!.length, SEED_ITEMS.length - 1, "reload must not re-seed");
  const it = await createItem({ title: "New thing", status: "planned", description: "", area: "Admin" }, "tester");
  assert.equal((await loadItems())![0].id, it.id); // top of list
  const up = await updateItem(it.id, { status: "idea", target: "Dec 2026", issueNumber: 285 }, "tester");
  assert.equal(up!.status, "idea"); assert.equal(up!.target, "Dec 2026"); assert.equal(up!.issueNumber, 285); assert.equal(up!.updatedBy, "tester");
  const cleared = await updateItem(it.id, { target: undefined, issueNumber: undefined }, "tester");
  assert.equal(cleared!.target, undefined); assert.equal(cleared!.issueNumber, undefined);
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

test("GitHub: pages merged PRs, fetches linked numbers, ignores closed issues, fails as unavailable", async () => {
  const realFetch = globalThis.fetch;
  const merged = (number: number, title: string, mergedAt: string) => ({
    number, title, state: "closed", html_url: `h${number}`, updated_at: mergedAt,
    pull_request: { merged_at: mergedAt }, labels: [],
  });
  try {
    let calls = 0;
    globalThis.fetch = (async (url: string) => {
      calls += 1;
      const u = String(url);
      const j = (b: unknown) => new Response(JSON.stringify(b), { status: 200 });
      if (u.includes("/search/issues?") && u.includes("is%3Amerged")) {
        const page = new URL(u).searchParams.get("page");
        if (page === "2") return j({ total_count: 101, items: [merged(208, "Move Christina and Zara onto the shared chat platform", "2026-10-20T05:27:55Z")] });
        const first = Array.from({ length: 100 }, (_, i) => merged(1000 + i, `Merged ${i}`, "2026-10-19T01:00:00Z"));
        return j({ total_count: 101, items: first });
      }
      if (u.includes("/search/issues?") && u.includes("is%3Aopen")) {
        return j({ total_count: 3, items: [
          { number: 278, title: "Stale closed", state: "closed", html_url: "i278", labels: [{ name: "status:in-progress" }] },
          { number: 280, title: "SEO/AI search audit", state: "open", html_url: "i280", labels: [{ name: "agent:chief" }, { name: "status:in-progress" }], updated_at: "2026-10-26T00:00:00Z" },
          { number: 282, title: "SEO audit fixes", state: "open", html_url: "p282", body: "Closes #280", pull_request: {}, labels: [], updated_at: "2026-10-26T01:00:00Z" },
        ] });
      }
      if (u.includes("/deployments?")) return j([{ id: 9, created_at: "2026-10-26T12:00:00Z" }]);
      if (u.includes("/deployments/9/statuses")) return j([{ state: "success" }]);
      if (u.endsWith("/pulls/149")) return j({ number: 149, title: "Admin Roadmap page", state: "closed", merged_at: "2026-10-19T04:04:58Z", html_url: "h149", updated_at: "2026-10-19T04:04:58Z", labels: [] });
      if (u.endsWith("/issues/278")) return j({ number: 278, title: "AI visitors panel", state: "closed", html_url: "i278", updated_at: "2026-10-26T02:00:00Z", labels: [{ name: "status:in-progress" }, { name: "agent:chief" }] });
      return new Response("no", { status: 404 });
    }) as typeof fetch;
    resetGithubCache();
    const s = await fetchGithubState(true, { prs: [149, 208], issues: [278] });
    assert.equal(s.ok, true);
    assert.equal(s.error, undefined);
    assert.ok(s.prs.some((p) => p.number === 208), "page 2 merged PR is kept");
    assert.ok(s.prs.some((p) => p.number === 149), "linked PR outside the search window is fetched");
    assert.equal(s.prs.length, 102);
    assert.deepEqual(s.openIssues?.map((i) => i.number), [280]);
    assert.deepEqual(s.openPrs?.map((p) => p.number), [282]);
    assert.deepEqual(s.openPrs?.[0].closes, [280]);
    assert.equal(s.linked?.find((l) => l.number === 278)?.state, "closed");
    assert.equal(s.deployedAt, "2026-10-26T12:00:00Z");
    assert.ok(s.fetchedAt);
    const afterBulk = calls;
    const cached = await fetchGithubState(false, { prs: [149], issues: [278] });
    assert.equal(calls, afterBulk, "warm cache must not call GitHub again");
    assert.equal(cached.prs.length, 102);

    globalThis.fetch = (async () => new Response("no", { status: 500 })) as typeof fetch;
    resetGithubCache();
    const bad = await fetchGithubState(true);
    assert.equal(bad.ok, false);
    assert.equal(bad.error, "unavailable");
    assert.deepEqual(bad.prs, []);
    assert.deepEqual(bad.openIssues, []);
    assert.deepEqual(bad.openPrs, []);

    globalThis.fetch = (async () => { throw new Error("network down"); }) as typeof fetch;
    resetGithubCache();
    assert.equal((await fetchGithubState(true)).error, "unavailable");

    globalThis.fetch = (async (url: string) => {
      const u = String(url);
      const j = (b: unknown) => new Response(JSON.stringify(b), { status: 200 });
      if (u.includes("/search/issues?") && u.includes("is%3Amerged")) return j({ total_count: 1, items: [merged(5, "A", "2026-10-19T01:00:00Z")] });
      if (u.includes("/search/issues?")) return j({ total_count: 0, items: [] });
      return new Response("no", { status: 403 });
    }) as typeof fetch;
    resetGithubCache();
    const part = await fetchGithubState(true);
    assert.equal(part.ok, true);
    assert.equal(part.deployedAt, null);
    assert.deepEqual(part.prs.map((p) => p.number), [5]);
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
