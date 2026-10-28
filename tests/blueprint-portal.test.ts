/**
 * Blueprint client portal (Stage 1): flag, session scope, magic links,
 * ownership, autosave version check, write lock, submit/lock/unlock, counts.
 * In-memory Upstash mock, no real services.
 *
 *   npx tsx --test tests/blueprint-portal.test.ts
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
  process.env.PORTAL_SESSION_SECRET = "test-secret-123";
  delete process.env.RESEND_API_KEY;
});
after(() => new Promise<void>((r) => mock.server.close(() => r())));

const tiers = ["starter", "pro", "business"] as const;

test("flag is OFF by default and supports allowlist", async () => {
  const f = await import("../lib/portal-blueprint/flag");
  assert.equal(f.portalEnabled({} as NodeJS.ProcessEnv), false);
  assert.equal(f.portalMode({ BLUEPRINT_PORTAL_MODE: "bogus" } as unknown as NodeJS.ProcessEnv), "off");
  assert.equal(f.portalAllowed("a@b.com", { BLUEPRINT_PORTAL_MODE: "on" } as unknown as NodeJS.ProcessEnv), true);
  const env = { BLUEPRINT_PORTAL_MODE: "allowlist", BLUEPRINT_PORTAL_ALLOW: "me@x.com, @saabai.ai" } as unknown as NodeJS.ProcessEnv;
  assert.equal(f.portalAllowed("ME@x.com", env), true);
  assert.equal(f.portalAllowed("hello@saabai.ai", env), true);
  assert.equal(f.portalAllowed("evil@notsaabai.ai.evil.com", env), false);
  assert.equal(f.portalAllowed("other@x.com", env), false);
});

test("per-plan question counts follow the current fact-find: Starter 30, Pro 37, Business 40", async () => {
  const { planQuestions } = await import("../lib/portal-blueprint/progress");
  const n = Object.fromEntries(tiers.map((t) => [t, planQuestions({ tier: t, firmType: "other" }).length]));
  assert.deepEqual(n, { starter: 30, pro: 37, business: 40 });
});

test("answer validation rejects bad values", async () => {
  const { cleanValue } = await import("../lib/portal-blueprint/progress");
  const { FACTFIND_QUESTIONS } = await import("../lib/audit-factfind");
  const t = FACTFIND_QUESTIONS.find((q) => q.type === "text")!;
  const sel = FACTFIND_QUESTIONS.find((q) => q.type === "select")!;
  const sc = FACTFIND_QUESTIONS.find((q) => q.type === "scale")!;
  const num = FACTFIND_QUESTIONS.find((q) => q.type === "number")!;
  assert.equal(cleanValue(t, "ok"), "ok");
  assert.equal(cleanValue(t, 5), undefined);
  assert.equal(cleanValue(t, "x".repeat(5001)), undefined);
  assert.equal(cleanValue(t, ""), null);
  assert.equal(cleanValue(sel, "not an option"), undefined);
  assert.equal(cleanValue(sel, sel.options![0]), sel.options![0]);
  assert.equal(cleanValue(sc, 6), undefined);
  assert.equal(cleanValue(sc, 3), 3);
  assert.equal(cleanValue(num, -1), undefined);
  assert.equal(cleanValue(num, 0), 0);
});

test("session: scoped, signed, expiring, not interchangeable with other cookies", async () => {
  const { signBpSession, verifyBpSession } = await import("../lib/portal-blueprint/session");
  const { signSession } = await import("../lib/portal-session");
  const tok = signBpSession("Buyer@X.com");
  assert.equal(verifyBpSession(tok)?.email, "buyer@x.com");
  assert.equal(verifyBpSession(tok + "x"), null);
  assert.equal(verifyBpSession(signBpSession("a@b.com", -1000)), null);
  // A Lex/site portal session token must NOT be accepted as a Blueprint session.
  assert.equal(verifyBpSession(signSession("buyer@x.com")), null);
  assert.equal(verifyBpSession(undefined), null);
});

async function seed(tier: "starter" | "pro" | "business" = "pro", email = "buyer@x.com") {
  const { createEngagement } = await import("../lib/audit-store");
  const e = await createEngagement({ tier, firmName: "Acme Pty Ltd", firmType: "other", contactName: "Alex Buyer", contactEmail: email, stripeRef: "cs_test_" + Math.random().toString(36).slice(2) });
  assert.ok(e);
  return e!;
}

test("email index finds engagements and backfills", async () => {
  const { findEngagementsByEmail, createEngagement } = await import("../lib/audit-store");
  const a = await seed("starter", "idx@x.com");
  const b = await seed("pro", "idx@x.com");
  const got = await findEngagementsByEmail("IDX@x.com");
  assert.deepEqual(new Set(got.map((x) => x.id)), new Set([a.id, b.id]));
  assert.equal((await findEngagementsByEmail("nobody@x.com")).length, 0);
  void createEngagement;
});

test("magic link: single use, wrong token fails, redirect sanitised", async () => {
  const { createPortalToken, consumePortalToken } = await import("../lib/portal-blueprint/links");
  const t = await createPortalToken("Buyer@x.com", { redirect: "/portal/aud_1/factfind" });
  assert.ok(t);
  assert.deepEqual(await consumePortalToken(t), { email: "buyer@x.com", redirect: "/portal/aud_1/factfind" });
  assert.equal(await consumePortalToken(t), null, "second use must fail");
  assert.equal(await consumePortalToken("a".repeat(43)), null);
  const t2 = await createPortalToken("b@x.com", { redirect: "https://evil.com" });
  assert.equal((await consumePortalToken(t2))?.redirect, "/portal");
});

test("sendPortalLink does nothing when flag off, for unknown emails, or when not allowlisted", async () => {
  const { sendPortalLink } = await import("../lib/portal-blueprint/links");
  const logs: string[] = [];
  const orig = console.log; console.log = (...a: unknown[]) => { logs.push(a.join(" ")); };
  try {
    process.env.BLUEPRINT_PORTAL_MODE = "off";
    await seed("pro", "sendoff@x.com");
    await sendPortalLink("sendoff@x.com");
    process.env.BLUEPRINT_PORTAL_MODE = "on";
    await sendPortalLink("ghost@x.com");
    process.env.BLUEPRINT_PORTAL_MODE = "allowlist";
    process.env.BLUEPRINT_PORTAL_ALLOW = "someoneelse@x.com";
    await sendPortalLink("sendoff@x.com");
    assert.equal(logs.filter((l) => l.includes("/portal/auth")).length, 0);
    process.env.BLUEPRINT_PORTAL_MODE = "on";
    await sendPortalLink("sendoff@x.com");
    assert.equal(logs.filter((l) => l.includes("/portal/auth?token=")).length, 1);
  } finally {
    console.log = orig; process.env.BLUEPRINT_PORTAL_MODE = "off";
  }
});

test("ownership: another email gets nothing", async () => {
  const { getOwnedEngagement } = await import("../lib/portal-blueprint/store");
  const e = await seed("pro", "owner@x.com");
  assert.equal((await getOwnedEngagement(e.id, "owner@x.com")).ok, true);
  assert.equal((await getOwnedEngagement(e.id, "OWNER@x.com")).ok, true);
  assert.equal((await getOwnedEngagement(e.id, "thief@x.com")).ok, false);
  assert.equal((await getOwnedEngagement("../../etc", "owner@x.com")).ok, false);
});

test("autosave: version check, validation, lock, and per-question merge", async () => {
  const { saveClientAnswers } = await import("../lib/portal-blueprint/store");
  const e = await seed("starter", "save@x.com");
  const ok = await saveClientAnswers(e.id, "save@x.com", { firm_overview: "We do things" }, 0);
  assert.equal(ok.status, "ok");
  const v = ok.status === "ok" ? ok.engagement.portal!.version! : -1;
  assert.equal(v, 1);
  // stale version -> conflict, nothing written
  const stale = await saveClientAnswers(e.id, "save@x.com", { firm_overview: "overwrite" }, 0);
  assert.equal(stale.status, "conflict");
  // wrong owner
  assert.equal((await saveClientAnswers(e.id, "thief@x.com", { firm_overview: "x" }, 1)).status, "notfound");
  // unknown question and bad type rejected, nothing partially written
  const bad = await saveClientAnswers(e.id, "save@x.com", { firm_overview: "ok2", nope: "x" }, 1);
  assert.equal(bad.status, "invalid");
  const bad2 = await saveClientAnswers(e.id, "save@x.com", { firm_staff_count: "ten" }, 1);
  assert.equal(bad2.status, "invalid");
  // merge keeps earlier answers
  const two = await saveClientAnswers(e.id, "save@x.com", { firm_staff_count: 12 }, 1);
  assert.equal(two.status, "ok");
  if (two.status === "ok") {
    assert.equal(two.engagement.responses.firm_overview.value, "We do things");
    assert.equal(two.engagement.responses.firm_staff_count.value, 12);
  }
});

test("concurrent autosaves: lock + version means exactly one wins per version", async () => {
  const { saveClientAnswers } = await import("../lib/portal-blueprint/store");
  const e = await seed("starter", "race@x.com");
  const results = await Promise.all([
    saveClientAnswers(e.id, "race@x.com", { firm_overview: "A" }, 0),
    saveClientAnswers(e.id, "race@x.com", { firm_overview: "B" }, 0),
    saveClientAnswers(e.id, "race@x.com", { firm_overview: "C" }, 0),
  ]);
  assert.equal(results.filter((r) => r.status === "ok").length, 1);
  assert.equal(results.filter((r) => r.status === "conflict").length, 2);
});

async function fillRequired(id: string, email: string) {
  const { saveClientAnswers } = await import("../lib/portal-blueprint/store");
  const { getEngagement } = await import("../lib/audit-store");
  const { planQuestions } = await import("../lib/portal-blueprint/progress");
  const e = (await getEngagement(id))!;
  const payload: Record<string, unknown> = {};
  for (const q of planQuestions(e).filter((x) => x.required)) {
    payload[q.id] = q.type === "number" ? 5 : q.type === "scale" ? 3 : q.type === "select" ? q.options![0] : q.type === "multiselect" ? [q.options![0]] : "answer";
  }
  const r = await saveClientAnswers(id, email, payload, e.portal?.version ?? 0);
  assert.equal(r.status, "ok");
}

test("submit: blocks without consent or required answers, locks, snapshots, idempotent, unlock reopens", async () => {
  const { submitForBuild, saveClientAnswers, unlockForEdits } = await import("../lib/portal-blueprint/store");
  const { getEngagement } = await import("../lib/audit-store");
  const e = await seed("pro", "submit@x.com");

  const early = await submitForBuild(e.id, "submit@x.com", true);
  assert.equal(early.status, "missing_required");

  await fillRequired(e.id, "submit@x.com");
  assert.equal((await submitForBuild(e.id, "submit@x.com", false)).status, "consent");
  assert.equal((await submitForBuild(e.id, "thief@x.com", true)).status, "notfound");

  const s1 = await submitForBuild(e.id, "submit@x.com", true);
  assert.equal(s1.status, "ok");
  assert.equal(s1.status === "ok" && s1.already, false);
  const locked = (await getEngagement(e.id))!;
  assert.ok(locked.portal?.submittedAt);
  assert.ok(locked.portal?.lockedSnapshot && Object.keys(locked.portal.lockedSnapshot).length > 0);
  assert.equal(locked.status, "factfind_complete");
  assert.ok(locked.factFindCompletedAt);

  // second submit is idempotent
  const s2 = await submitForBuild(e.id, "submit@x.com", true);
  assert.equal(s2.status === "ok" && s2.already, true);

  // edits refused while locked
  const edit = await saveClientAnswers(e.id, "submit@x.com", { firm_overview: "sneaky" }, locked.portal!.version!);
  assert.equal(edit.status, "locked");

  // admin unlock reopens, keeps history, and edits work again
  const un = await unlockForEdits(e.id);
  assert.ok(un && !un.portal?.submittedAt);
  assert.equal(un!.portal?.reopenedAt?.length, 1);
  const again = await saveClientAnswers(e.id, "submit@x.com", { firm_overview: "updated" }, un!.portal!.version!);
  assert.equal(again.status, "ok");
  assert.equal(await unlockForEdits(e.id), null, "unlock on an unsubmitted engagement is a no-op");
});

test("progress: first unfinished section and blanks", async () => {
  const { computeProgress } = await import("../lib/portal-blueprint/progress");
  const p0 = computeProgress({ tier: "business", firmType: "other" }, {});
  assert.equal(p0.totalQuestions, 40);
  assert.equal(p0.percent, 0);
  assert.equal(p0.sections[0].id, "start");
  assert.equal(p0.firstUnfinishedSectionId, p0.sections[0].id);
  assert.ok(p0.missingRequired > 0);
  const p1 = computeProgress({ tier: "starter", firmType: "other" }, { firm_overview: "x", firm_staff_count: 0 });
  assert.equal(p1.answered, 2, "zero counts as answered");
  assert.equal(p1.sections[0].state, "empty", "Start here stays empty until those questions are answered");
  assert.equal(p1.sections.find((s) => s.id === "firm")?.state, "partial");
});

test("no em dashes in portal copy", async () => {
  const { readFileSync, readdirSync, statSync } = await import("node:fs");
  const { join } = await import("node:path");
  const files: string[] = [];
  const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx|css)$/.test(f) && files.push(p); } };
  walk("app/portal"); walk("lib/portal-blueprint"); walk("app/api/portal/blueprint");
  for (const f of files) assert.ok(!readFileSync(f, "utf8").includes("\u2014"), `em dash in ${f}`);
});

test("portal link base: production stays on www.saabai.ai, previews use their own allow-listed host", async () => {
  const { portalBaseUrl, isAllowedPortalHost, linkUrl } = await import("../lib/portal-blueprint/links");
  const saved = { ...process.env };
  const req = (host: string, xf?: string) => new Request("https://x.test/api/portal/blueprint/login", { headers: { host, ...(xf ? { "x-forwarded-host": xf } : {}) } });
  const preview = "saabai-site-git-feat-client-port-2dd764-shanegoldbergs-projects.vercel.app";
  try {
    delete process.env.NEXT_PUBLIC_BASE_URL;
    for (const h of ["saabai.ai", "www.saabai.ai", preview, "saabai-site-b4bkx70y5-shanegoldbergs-projects.vercel.app"]) assert.equal(isAllowedPortalHost(h), true, h);
    for (const h of ["evil.com", "saabai.ai.evil.com", "other-app.vercel.app", "saabai-site-x-otherteam.vercel.app", "localhost:3000", "", null]) assert.equal(isAllowedPortalHost(h as string), false, String(h));

    process.env.VERCEL_ENV = "production";
    assert.equal(portalBaseUrl(req(preview)), "https://www.saabai.ai");
    assert.equal(portalBaseUrl(req("evil.com")), "https://www.saabai.ai");

    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "saabai-site-b4bkx70y5-shanegoldbergs-projects.vercel.app";
    delete process.env.VERCEL_BRANCH_URL;
    assert.equal(portalBaseUrl(req(preview)), `https://${preview}`);
    assert.equal(portalBaseUrl(req("evil.com", preview)), `https://${preview}`);
    assert.equal(portalBaseUrl(req("evil.com")), "https://saabai-site-b4bkx70y5-shanegoldbergs-projects.vercel.app");
    assert.equal(portalBaseUrl(), "https://saabai-site-b4bkx70y5-shanegoldbergs-projects.vercel.app");
    process.env.VERCEL_URL = "evil.vercel.app";
    assert.equal(portalBaseUrl(req("evil.com")), "https://www.saabai.ai");

    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
    assert.equal(portalBaseUrl(req("localhost:3000")), "https://www.saabai.ai");
    assert.equal(linkUrl("tok", `https://${preview}/`), `https://${preview}/portal/auth?token=tok`);
    assert.equal(linkUrl("tok"), "https://www.saabai.ai/portal/auth?token=tok");
  } finally {
    for (const k of ["VERCEL_ENV", "VERCEL_URL", "VERCEL_BRANCH_URL", "NEXT_PUBLIC_BASE_URL"]) {
      if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
    }
  }
});

test("portal routes hide the promo bar and sales chrome", async () => {
  const { hidesAnnouncement, isFocusedFormPath } = await import("../lib/focused-paths");
  for (const p of ["/portal", "/portal/login", "/portal/auth?token=x", "/portal/aud_1/factfind", "/portal/aud_1/review"]) {
    assert.equal(hidesAnnouncement(p), true, p);
  }
  assert.equal(isFocusedFormPath("/portal/aud_1"), true);
  for (const p of ["/portals", "/client-portal", "/client-portal/auth", "/"]) assert.equal(hidesAnnouncement(p), false, p);
});

test("sign-in email has a plain-text version with the link, and Resend gets it", async () => {
  const { portalLinkEmail } = await import("../lib/portal-blueprint/emails");
  const link = "https://www.saabai.ai/portal/auth?token=abc";
  const m = portalLinkEmail({ name: "Alex Smith", link });
  assert.ok(m.text.length > 40);
  assert.ok(m.text.includes(link));
  assert.ok(m.text.startsWith("Pick up where you left off"));
  assert.ok(!/<[a-z]/i.test(m.text), "text part has no HTML");
  const fs = await import("node:fs");
  const src = fs.readFileSync(new URL("../lib/email/branded-layout.ts", import.meta.url), "utf8");
  assert.match(src, /text:\s*opts\.email\.text/);
});
