/**
 * Guided portal onboarding. In-memory Redis, no lead posts, no client email.
 *   npx tsx --test tests/portal-onboarding.test.ts
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { NextRequest } from "next/server";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";
import {
  allOnboardingCopy,
  applyOnboardingAction,
  freshOnboarding,
  nextStepCopy,
  portalOnboardingAllowed,
  portalOnboardingMode,
  stepsFor,
} from "../lib/portal-onboarding";

const mock = createMockUpstash();
const CLIENT = "ada@client.test";
const LEX = "lex@firm.test";
const PORTAL_ONLY = "legacy@portal.test";
const ORPHAN = "site@orphan.test";

before(async () => {
  await new Promise<void>((resolve) => mock.server.listen(0, "127.0.0.1", () => resolve()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  process.env.SAABAI_ADMIN_ID = "saabai";
  process.env.SAABAI_SESSION_SECRET = "unit-test-secret-0123456789abcdef";
  process.env.PORTAL_SESSION_SECRET = "portal-unit-test-secret-0123456789";
  delete process.env.RESEND_API_KEY;
  delete process.env.PORTAL_ONBOARDING_MODE;
  delete process.env.PORTAL_ONBOARDING_ALLOW;
  delete process.env.REQUESTS_NOTIFY_EMAIL;
});

after(() => new Promise<void>((resolve) => mock.server.close(() => resolve())));

test("flag defaults off, allowlist is exact, and unknown values stay off", () => {
  assert.equal(portalOnboardingMode({}), "off");
  assert.equal(portalOnboardingMode({ PORTAL_ONBOARDING_MODE: "" }), "off");
  assert.equal(portalOnboardingMode({ PORTAL_ONBOARDING_MODE: "yes" }), "off");
  assert.equal(portalOnboardingAllowed(CLIENT, {}), false);
  assert.equal(portalOnboardingAllowed(CLIENT, { PORTAL_ONBOARDING_MODE: "on" }), true);
  assert.equal(
    portalOnboardingAllowed(CLIENT, { PORTAL_ONBOARDING_MODE: "allowlist", PORTAL_ONBOARDING_ALLOW: "other@saabai.ai" }),
    false,
  );
  assert.equal(
    portalOnboardingAllowed("Ada@Client.test", {
      PORTAL_ONBOARDING_MODE: "allowlist",
      PORTAL_ONBOARDING_ALLOW: "ada@client.test, lex@firm.test",
    }),
    true,
  );
  assert.equal(portalOnboardingAllowed(LEX, { PORTAL_ONBOARDING_MODE: "off", PORTAL_ONBOARDING_ALLOW: LEX }), false);
});

test("four steps for every tier, and a fifth step only for Lex", () => {
  assert.deepEqual(stepsFor(false), ["business", "brand", "access", "next"]);
  assert.deepEqual(stepsFor(true), ["business", "brand", "access", "next", "lex"]);
  const blueprint = nextStepCopy({ tier: "blueprint", hasBlueprint: true, hasWebsite: false }).join(" ");
  const retainer = nextStepCopy({ tier: "retainer", hasBlueprint: false, hasWebsite: false }).join(" ");
  const lex = nextStepCopy({ tier: "lex", hasBlueprint: false, hasWebsite: false }).join(" ");
  assert.match(blueprint, /Blueprint/);
  assert.match(retainer, /retainer/);
  assert.match(lex, /Lex/);
  assert.notEqual(blueprint, retainer);
  assert.doesNotMatch(blueprint, /jurisdiction/i);
  assert.equal(stepsFor(false).includes("lex"), false);
});

test("copy has no em dash, no free claim, and no home-based wording", () => {
  const blob = allOnboardingCopy();
  assert.equal(/\u2014|\u2013/.test(blob), false);
  assert.equal(/home-based/i.test(blob), false);
  assert.equal(/\bfree\b/i.test(blob), false);
  const files = [
    "lib/portal-onboarding.ts",
    "lib/portal-onboarding-store.ts",
    "lib/portal-onboarding-notify.ts",
    "lib/portal-onboarding-context.ts",
    "app/api/portal/onboarding/route.ts",
    "app/api/admin/onboarding/route.ts",
    "app/client-portal/onboarding/OnboardingCard.tsx",
    "app/saabai-admin/onboarding/OnboardingAdminClient.tsx",
  ];
  const banned = ["/api/leads", "/api/site-factory/lead", "/api/cycle-repair/lead", "/api/nico-chat", "/api/lex-chat"];
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    assert.equal(/\u2014|\u2013/.test(src), false, file);
    assert.equal(/home-based/i.test(src), false, file);
    assert.equal(/\bfree\b/i.test(src), false, file);
    for (const path of banned) assert.equal(src.includes(path), false, `${file} mentions ${path}`);
  }
});

test("skip keeps earlier answers and does not finish on the last step", () => {
  let state = freshOnboarding("ada", CLIENT, "2026-10-28T00:00:00.000Z");
  state = applyOnboardingAction({
    state,
    isLex: false,
    action: "save",
    step: "business",
    fields: { businessName: "Ada Plumbing" },
    now: "2026-10-28T00:01:00.000Z",
  }).state;
  state = applyOnboardingAction({
    state,
    isLex: false,
    action: "skip",
    step: "brand",
    now: "2026-10-28T00:02:00.000Z",
  }).state;
  assert.equal(state.step, "access");
  assert.equal(state.status, "in_progress");
  assert.equal(state.payload.businessName, "Ada Plumbing");
  assert.deepEqual(state.skipped, ["brand"]);
  state = applyOnboardingAction({ state, isLex: false, action: "skip", step: "access", now: "2026-10-28T00:03:00.000Z" }).state;
  const last = applyOnboardingAction({ state, isLex: false, action: "skip", step: "next", now: "2026-10-28T00:04:00.000Z" });
  assert.equal(last.state.step, "next");
  assert.equal(last.state.status, "in_progress");
  assert.equal(last.justCompleted, false);
  const done = applyOnboardingAction({
    state: last.state,
    isLex: false,
    action: "save",
    step: "next",
    now: "2026-10-28T00:05:00.000Z",
  });
  assert.equal(done.state.status, "complete");
  assert.equal(done.justCompleted, true);
  assert.equal(done.state.payload.businessName, "Ada Plumbing");
});

test("a non-lex client cannot save the Lex step", () => {
  const state = freshOnboarding("ada", CLIENT);
  const same = applyOnboardingAction({ state, isLex: false, action: "save", step: "lex", fields: { jurisdiction: "QLD" } });
  assert.equal(same.state.step, "business");
  assert.equal(same.state.payload.jurisdiction, undefined);
});

test("onboarding is stored on the client record, resumes, and notifies admin once", async () => {
  const { saveDirectoryUser, getDirectoryUser } = await import("../lib/user-directory");
  const { savePortalUser, getPortalUser, savePendingRequest } = await import("../lib/portal-users");
  const { saveOnboardingProgress, readStoredOnboarding, listOnboardingProgress } = await import("../lib/portal-onboarding-store");
  const { buildOnboardingView } = await import("../lib/portal-onboarding-context");
  const { onboardingAdminEmail } = await import("../lib/portal-onboarding-notify");
  const { signSession } = await import("../lib/portal-session");
  const { createSessionToken } = await import("../lib/auth");
  const portalRoute = await import("../app/api/portal/onboarding/route");
  const adminRoute = await import("../app/api/admin/onboarding/route");

  const now = "2026-10-28T01:00:00.000Z";
  await saveDirectoryUser({
    id: "ada-client",
    name: "Ada Client",
    email: CLIENT,
    password: "x",
    role: "user",
    dashboardUrl: "/client-portal",
    approvedAt: now,
    createdAt: now,
    profile: { businessName: "Ada Plumbing", phone: "0400000000", businessType: "Plumbing" },
  });
  await saveDirectoryUser({
    id: "lex-client",
    name: "Lex Firm",
    email: LEX,
    password: "x",
    role: "user",
    dashboardUrl: "/client-portal",
    products: ["lex"],
    approvedAt: now,
    createdAt: now,
  });
  await saveDirectoryUser({
    id: "boss",
    name: "Boss",
    email: "boss@saabai.test",
    password: "x",
    role: "admin",
    dashboardUrl: "/saabai-admin",
    approvedAt: now,
    createdAt: now,
  });
  await savePortalUser({
    id: "ada-legacy",
    name: "Ada Legacy",
    email: CLIENT,
    password: "x",
    dashboardUrl: "/client-portal",
    approvedAt: now,
  });
  await savePortalUser({
    id: "legacy-only",
    name: "Legacy Only",
    email: PORTAL_ONLY,
    password: "x",
    dashboardUrl: "/client-portal",
    approvedAt: now,
  });
  await savePendingRequest({ name: "Pat Pending", email: "pat@pending.test", company: "Pending Co", requestedAt: now });

  const envOn = { ...process.env, PORTAL_ONBOARDING_MODE: "on" };
  const ada = await buildOnboardingView(CLIENT, envOn);
  assert.equal(ada.enabled, true);
  if (ada.enabled) {
    assert.equal(ada.prefill.businessName, "Ada Plumbing");
    assert.equal(ada.prefill.primaryContact, "Ada Client");
    assert.equal(ada.prefill.industry, "Plumbing");
    assert.equal(ada.steps.length, 4);
    assert.equal(ada.steps.some((s) => s.id === "lex"), false);
    assert.equal(ada.isLex, false);
  }
  const lexView = await buildOnboardingView(LEX, envOn);
  assert.equal(lexView.enabled, true);
  if (lexView.enabled) {
    assert.equal(lexView.steps.length, 5);
    assert.equal(lexView.steps[4].id, "lex");
    assert.equal(lexView.steps[4].title.includes("Jurisdiction"), true);
  }
  const off = await buildOnboardingView(CLIENT, { ...process.env, PORTAL_ONBOARDING_MODE: "off" });
  assert.equal(off.enabled, false);
  const pending = await buildOnboardingView("pat@pending.test", envOn);
  assert.equal(pending.enabled, true);
  if (pending.enabled) assert.equal(pending.prefill.businessName, "Pending Co");

  assert.equal(onboardingAdminEmail({ REQUESTS_NOTIFY_EMAIL: CLIENT }, CLIENT), null);
  assert.equal(onboardingAdminEmail({}, CLIENT), "hello@saabai.ai");

  const calls: string[] = [];
  const notify = async (args: { clientEmail: string }) => {
    calls.push(args.clientEmail);
    return { sent: true, to: "hello@saabai.ai" };
  };

  const first = await saveOnboardingProgress({
    email: CLIENT,
    clientId: "ada-client",
    name: "Ada Client",
    tier: "retainer",
    isLex: false,
    action: "save",
    step: "business",
    fields: { businessName: "Ada Plumbing", primaryContact: "Ada Client" },
    now,
    notify,
  });
  assert.equal(first.where, "directory");
  assert.equal(first.notified, false);
  const skipped = await saveOnboardingProgress({
    email: CLIENT,
    clientId: "ada-client",
    name: "Ada Client",
    tier: "retainer",
    isLex: false,
    action: "skip",
    step: "brand",
    now: "2026-10-28T01:05:00.000Z",
    notify,
  });
  assert.equal(skipped.state.step, "access");
  assert.equal(skipped.state.payload.businessName, "Ada Plumbing");
  const resumed = await readStoredOnboarding(CLIENT);
  assert.equal(resumed?.step, "access");
  assert.equal(resumed?.payload.businessName, "Ada Plumbing");
  assert.equal((await getPortalUser(CLIENT))?.onboarding, undefined);

  await saveOnboardingProgress({
    email: CLIENT,
    clientId: "ada-client",
    name: "Ada Client",
    tier: "retainer",
    isLex: false,
    action: "save",
    step: "access",
    fields: { googleBusiness: "granted", domain: "not_needed", hosting: "requested", socials: "granted" },
    now: "2026-10-28T01:06:00.000Z",
    notify,
  });
  const finished = await saveOnboardingProgress({
    email: CLIENT,
    clientId: "ada-client",
    name: "Ada Client",
    tier: "retainer",
    isLex: false,
    action: "save",
    step: "next",
    now: "2026-10-28T01:07:00.000Z",
    notify,
  });
  assert.equal(finished.state.status, "complete");
  assert.equal(finished.notified, true);
  assert.deepEqual(calls, [CLIENT]);
  assert.notEqual("hello@saabai.ai", CLIENT);
  const again = await saveOnboardingProgress({
    email: CLIENT,
    clientId: "ada-client",
    name: "Ada Client",
    tier: "retainer",
    isLex: false,
    action: "save",
    step: "next",
    now: "2026-10-28T01:08:00.000Z",
    notify,
  });
  assert.equal(again.notified, false);
  assert.deepEqual(calls, [CLIENT]);

  const lexHeld = await saveOnboardingProgress({
    email: LEX,
    clientId: "lex-client",
    name: "Lex Firm",
    tier: "lex",
    isLex: true,
    action: "save",
    step: "next",
    now: "2026-10-28T01:10:00.000Z",
    notify,
  });
  assert.equal(lexHeld.state.status, "in_progress");
  assert.equal(lexHeld.state.step, "lex");
  assert.equal(lexHeld.notified, false);
  const lexDone = await saveOnboardingProgress({
    email: LEX,
    clientId: "lex-client",
    name: "Lex Firm",
    tier: "lex",
    isLex: true,
    action: "save",
    step: "lex",
    fields: { jurisdiction: "Queensland", practiceAreas: "Property" },
    now: "2026-10-28T01:11:00.000Z",
    notify,
  });
  assert.equal(lexDone.state.status, "complete");
  assert.equal(lexDone.state.payload.jurisdiction, "Queensland");
  assert.deepEqual(calls, [CLIENT, LEX]);
  const stored = await getDirectoryUser(CLIENT);
  assert.equal(stored?.onboarding?.status, "complete");
  assert.equal(stored?.profile?.businessName, "Ada Plumbing");
  assert.ok(stored?.onboarding?.notifiedAt);

  const legacy = await saveOnboardingProgress({
    email: PORTAL_ONLY,
    clientId: "legacy-only",
    name: "Legacy Only",
    tier: "retainer",
    isLex: false,
    action: "draft",
    step: "business",
    fields: { businessName: "Legacy Co" },
    now,
    notify,
  });
  assert.equal(legacy.where, "portal");
  assert.equal((await getDirectoryUser(PORTAL_ONLY)), null);
  assert.equal((await getPortalUser(PORTAL_ONLY))?.onboarding?.payload.businessName, "Legacy Co");

  await saveDirectoryUser({
    id: "legacy-moved",
    name: "Legacy Only",
    email: PORTAL_ONLY,
    password: "x",
    role: "user",
    dashboardUrl: "/client-portal",
    approvedAt: now,
    createdAt: now,
  });
  const moved = await saveOnboardingProgress({
    email: PORTAL_ONLY,
    clientId: "legacy-moved",
    name: "Legacy Only",
    tier: "retainer",
    isLex: false,
    action: "draft",
    step: "business",
    fields: { businessName: "Legacy Co" },
    now: "2026-10-28T01:09:00.000Z",
    notify,
  });
  assert.equal(moved.where, "directory");
  assert.equal((await getDirectoryUser(PORTAL_ONLY))?.onboarding?.payload.businessName, "Legacy Co");
  assert.equal((await getPortalUser(PORTAL_ONLY))?.onboarding, undefined);

  const orphan = await saveOnboardingProgress({
    email: ORPHAN,
    clientId: "site-orphan",
    name: "Orphan Site",
    tier: "website",
    isLex: false,
    action: "draft",
    step: "business",
    fields: { businessName: "Orphan Site" },
    now,
    notify,
  });
  assert.equal(orphan.where, "overflow");
  assert.equal(await getDirectoryUser(ORPHAN), null);
  assert.equal(await getPortalUser(ORPHAN), null);
  assert.equal((await readStoredOnboarding(ORPHAN))?.payload.businessName, "Orphan Site");

  const progress = await listOnboardingProgress();
  const adaRow = progress.find((row) => row.email === CLIENT);
  assert.ok(adaRow);
  assert.equal(adaRow?.status, "complete");
  assert.equal(adaRow?.step, "next");
  assert.equal(progress.some((row) => row.email === "boss@saabai.test"), false);
  assert.ok(progress.some((row) => row.email === PORTAL_ONLY && row.status === "in_progress"));

  process.env.PORTAL_ONBOARDING_MODE = "off";
  const cookie = `portal_session=${signSession(CLIENT)}`;
  const hidden = await portalRoute.GET(new Request("http://localhost/api/portal/onboarding", { headers: { cookie } }));
  assert.equal(hidden.status, 200);
  assert.equal((await hidden.json()).enabled, false);
  const blocked = await portalRoute.PUT(
    new Request("http://localhost/api/portal/onboarding", {
      method: "PUT",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ action: "save", step: "business", fields: { businessName: "Changed" } }),
    }),
  );
  assert.equal(blocked.status, 403);
  assert.equal((await getDirectoryUser(CLIENT))?.onboarding?.payload.businessName, "Ada Plumbing");

  process.env.PORTAL_ONBOARDING_MODE = "allowlist";
  process.env.PORTAL_ONBOARDING_ALLOW = CLIENT;
  const allowed = await portalRoute.GET(new Request("http://localhost/api/portal/onboarding", { headers: { cookie } }));
  const body = await allowed.json();
  assert.equal(body.enabled, true);
  assert.equal(body.prefill.businessName, "Ada Plumbing");
  assert.equal(body.state.status, "complete");
  assert.equal(body.steps.length, 4);

  const anon = await portalRoute.GET(new Request("http://localhost/api/portal/onboarding"));
  assert.equal(anon.status, 401);

  const adminToken = await createSessionToken("saabai");
  const adminRes = await adminRoute.GET(
    new NextRequest("http://localhost/api/admin/onboarding", { headers: { cookie: `saabai_session=${adminToken}` } }),
  );
  assert.equal(adminRes.status, 200);
  const adminBody = await adminRes.json();
  const fromAdmin = adminBody.clients.find((row: { email: string }) => row.email === CLIENT);
  assert.equal(fromAdmin.status, "complete");
  assert.equal(fromAdmin.stepLabel.length > 0, true);
  const noAdmin = await adminRoute.GET(new NextRequest("http://localhost/api/admin/onboarding"));
  assert.equal(noAdmin.status, 401);

  delete process.env.PORTAL_ONBOARDING_MODE;
  delete process.env.PORTAL_ONBOARDING_ALLOW;
});
