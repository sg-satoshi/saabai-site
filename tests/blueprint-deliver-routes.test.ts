/**
 * Route-level tests for Blueprint review and deliver (#363): download guard and
 * streaming (Blob URL never leaves the server), admin-only PATCH, review only
 * when the flag needs it, 404 for unknown reports, ready email sent once.
 *
 *   npx tsx --test tests/blueprint-deliver-routes.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { handleReportDownload, handleReportPatch, type DownloadDeps, type PatchDeps } from "../lib/portal-blueprint/report-routes";
import type { AuditEngagement, AuditReport } from "../lib/audit-types";

const BLOB = "https://abc.public.blob.vercel-storage.com/audits/e1/AI-Audit-x-v1-RANDOM.docx";
const ALLOW = { BLUEPRINT_PORTAL_MODE: "allowlist", BLUEPRINT_PORTAL_ALLOW: "owner@x.com" } as unknown as NodeJS.ProcessEnv;
const OFF = {} as NodeJS.ProcessEnv;
const rep = (id: string, v: number, extra: Partial<AuditReport> = {}): AuditReport => ({ id, version: v, filename: `f${v}.docx`, url: `${BLOB}?${id}`, generatedAt: "2026-10-30T00:00:00Z", ...extra });
const eng = (reports: AuditReport[], email = "owner@x.com"): AuditEngagement =>
  ({ id: "e1", contactEmail: email, contactName: "Jo", tier: "starter", firmName: "X", reports } as unknown as AuditEngagement);

async function fullText(res: Response): Promise<string> {
  const h = [...res.headers.entries()].map(([k, v]) => `${k}: ${v}`).join("\n");
  return `${res.status}\n${h}\n${await res.text()}`;
}

// ── Download ──
const owned = eng([rep("r1", 1, { deliveredAt: "2026-10-30T01:00:00Z" }), rep("r2", 2)]);
const fileDeps = (guardOk: false | "owner", status = 401): DownloadDeps => ({
  guard: async () =>
    guardOk === "owner"
      ? { ok: true, engagement: owned, refresh: (r) => r }
      : { ok: false, response: Response.json({ error: status === 401 ? "Please sign in" : "Not found" }, { status }) },
  fetchFile: async () => new Response("DOCXBYTES", { status: 200, headers: { "content-length": "9" } }),
});
const req = () => new Request("https://saabai.ai/api/portal/blueprint/e1/report/r1");

test("download: no session is refused and the blob URL is not in the response", async () => {
  const res = await handleReportDownload(req(), "e1", "r1", fileDeps(false, 401));
  assert.equal(res.status, 401);
  assert.ok(!(await fullText(res)).includes("blob.vercel-storage.com"));
});

test("download: non-owner is refused with 404 and no blob URL", async () => {
  const res = await handleReportDownload(req(), "e1", "r1", fileDeps(false, 404));
  assert.equal(res.status, 404);
  assert.ok(!(await fullText(res)).includes("blob.vercel-storage.com"));
});

test("download: owner gets the file streamed, no redirect, no blob URL anywhere", async () => {
  let fetched = "";
  const d = fileDeps("owner");
  const res = await handleReportDownload(req(), "e1", "r1", { ...d, fetchFile: async (u) => { fetched = u; return d.fetchFile(u); } });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("location"), null);
  assert.match(res.headers.get("content-disposition") || "", /attachment; filename="Saabai-Blueprint-v1.docx"/);
  assert.match(res.headers.get("cache-control") || "", /no-store/);
  const t = await fullText(res);
  assert.ok(t.includes("DOCXBYTES"));
  assert.ok(!t.includes("blob.vercel-storage.com"));
  assert.ok(fetched.includes("blob.vercel-storage.com")); // fetched server-side only
});

test("download: undelivered or unknown version is 404, upstream failure is 502 without URL", async () => {
  assert.equal((await handleReportDownload(req(), "e1", "r2", fileDeps("owner"))).status, 404);
  assert.equal((await handleReportDownload(req(), "e1", "nope", fileDeps("owner"))).status, 404);
  const res = await handleReportDownload(req(), "e1", "r1", { ...fileDeps("owner"), fetchFile: async () => new Response("x", { status: 403 }) });
  assert.equal(res.status, 502);
  assert.ok(!(await fullText(res)).includes("blob.vercel-storage.com"));
});

// ── Admin PATCH ──
function patchHarness(e: AuditEngagement, env: NodeJS.ProcessEnv, admin = true) {
  const state = { e: structuredClone(e), sent: 0, writes: 0, deferred: [] as (() => Promise<void>)[], claimed: new Set<string>() };
  const deps: PatchDeps = {
    requireAdmin: async () => (admin ? { ok: true } : { ok: false, response: Response.json({ error: "Unauthorised" }, { status: 401 }) }),
    getEngagement: async () => structuredClone(state.e),
    updateEngagement: async (_id, p) => { state.writes++; state.e = { ...state.e, ...p }; return state.e; },
    logEvent: async () => state.e,
    afterDelivery: async () => {},
    claimSendOnce: async (k) => { if (state.claimed.has(k)) return false; state.claimed.add(k); return true; },
    sendReady: async () => { state.sent++; },
    defer: (fn) => { state.deferred.push(fn); },
    env,
  };
  const call = (body: unknown) => handleReportPatch(new Request("https://saabai.ai/x", { method: "PATCH", body: JSON.stringify(body) }), "e1", deps);
  const flush = async () => { const d = state.deferred.splice(0); await Promise.all(d.map((f) => f())); };
  return { state, call, flush };
}

test("PATCH is admin only: review and deliver refused without admin, nothing written", async () => {
  const h = patchHarness(eng([rep("r1", 1)]), ALLOW, false);
  assert.equal((await h.call({ reportId: "r1", action: "review" })).status, 401);
  assert.equal((await h.call({ reportId: "r1" })).status, 401);
  assert.equal(h.state.writes, 0);
});

test("missing or unknown reportId is 404 (as before)", async () => {
  const h = patchHarness(eng([rep("r1", 1)]), OFF);
  assert.equal((await h.call({})).status, 404);
  assert.equal((await h.call({ reportId: "zzz" })).status, 404);
});

test("flag off: Mark reviewed writes nothing; deliver works without review and sends no email", async () => {
  const h = patchHarness(eng([rep("r1", 1)]), OFF);
  assert.equal((await h.call({ reportId: "r1", action: "review" })).status, 409);
  assert.equal(h.state.writes, 0);
  assert.equal((await h.call({ reportId: "r1" })).status, 200);
  await h.flush();
  assert.equal(h.state.sent, 0);
});

test("portal buyer: deliver needs review, then the ready email goes once even on a double deliver", async () => {
  const h = patchHarness(eng([rep("r1", 1), rep("r2", 2)]), ALLOW);
  assert.equal((await h.call({ reportId: "r1" })).status, 409);
  assert.equal((await h.call({ reportId: "r1", action: "review" })).status, 200);
  // Race: two deliver calls read the engagement before either write lands.
  const before = structuredClone(h.state.e);
  const getE = async () => structuredClone(before);
  const [a, b] = await Promise.all([
    handleReportPatch(new Request("https://saabai.ai/x", { method: "PATCH", body: JSON.stringify({ reportId: "r1" }) }), "e1", { ...harnessDeps(h), getEngagement: getE }),
    handleReportPatch(new Request("https://saabai.ai/x", { method: "PATCH", body: JSON.stringify({ reportId: "r1" }) }), "e1", { ...harnessDeps(h), getEngagement: getE }),
  ]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  await h.flush();
  assert.equal(h.state.sent, 1);
  // A new version emails again (intended).
  await h.call({ reportId: "r2", action: "review" });
  await h.call({ reportId: "r2" });
  await h.flush();
  assert.equal(h.state.sent, 2);
});

function harnessDeps(h: ReturnType<typeof patchHarness>): PatchDeps {
  const s = h.state;
  return {
    requireAdmin: async () => ({ ok: true }),
    getEngagement: async () => structuredClone(s.e),
    updateEngagement: async (_id, p) => { s.writes++; s.e = { ...s.e, ...p }; return s.e; },
    logEvent: async () => s.e,
    afterDelivery: async () => {},
    claimSendOnce: async (k) => { if (s.claimed.has(k)) return false; s.claimed.add(k); return true; },
    sendReady: async () => { s.sent++; },
    defer: (fn) => { s.deferred.push(fn); },
    env: ALLOW,
  };
}
