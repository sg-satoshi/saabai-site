import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { analyse, daysSince, WINNER_RULES, type VariantCounts } from "../lib/exp/stats";
import { applyAction, variantRows } from "../lib/exp/mutate";
import { eventSource, channelOf } from "../lib/exp/attr";
import { validateExperiment, type Experiment } from "../lib/exp/core";
import { SEED_EXPERIMENTS } from "../lib/exp/seed";
import { serialiseAttr } from "../lib/growth/attribution";

const base = (): Experiment => structuredClone(SEED_EXPERIMENTS[0]);
const vc = (id: string, impressions: number, converters: number, extra: Partial<VariantCounts> = {}): VariantCounts =>
  ({ id, impressions, converters, ctaClicks: 0, calls: 0, enquiries: converters, active: true, isDefault: id === "a", ...extra });

// ---- stats ----
test("no views gives a no-data verdict", () => {
  const r = analyse([vc("a", 0, 0), vc("b", 0, 0)], 0, "a");
  assert.equal(r.verdict.kind, "no_data");
  assert.equal(r.verdict.canMakeWinner, false);
});

test("small data is too early to call and lists what is missing", () => {
  const r = analyse([vc("a", 40, 1), vc("b", 38, 1), vc("c", 41, 0)], 3, "a");
  assert.equal(r.verdict.kind, "too_early");
  assert.equal(r.verdict.canMakeWinner, false);
  assert.ok(r.verdict.missing.some((m) => /14 days/.test(m)));
  assert.ok(r.verdict.missing.some((m) => /300 views/.test(m)));
  assert.ok(!/[\u2013\u2014]/.test(r.verdict.detail + r.verdict.headline), "no em dashes in copy");
});

test("a strong early leader is 'leading' but never a winner before the rules are met", () => {
  const r = analyse([vc("a", 120, 2), vc("b", 118, 18)], 5, "a");
  assert.equal(r.verdict.kind, "leading");
  assert.equal(r.verdict.leaderId, "b");
  assert.equal(r.verdict.canMakeWinner, false);
  assert.ok(r.verdict.lift && r.verdict.lift.median > 1);
});

test("winner needs 95%, 14 days, 300 views per variant and 10 conversions", () => {
  const strong = [vc("a", 1000, 20), vc("b", 1000, 70)];
  assert.equal(analyse(strong, 20, "a").verdict.kind, "winner");
  assert.equal(analyse(strong, 20, "a").verdict.canMakeWinner, true);
  assert.notEqual(analyse(strong, WINNER_RULES.minDays - 1, "a").verdict.kind, "winner", "14 day rule");
  assert.notEqual(analyse([vc("a", 1000, 20), vc("b", 299, 25)], 20, "a").verdict.kind, "winner", "300 view rule");
  assert.notEqual(analyse([vc("a", 1000, 3), vc("b", 1000, 6)], 20, "a").verdict.kind, "winner", "10 conversion rule");
  assert.notEqual(analyse([vc("a", 1000, 40), vc("b", 1000, 44)], 20, "a").verdict.kind, "winner", "95% rule");
});

test("when the control is the clear winner there is nothing to switch", () => {
  const r = analyse([vc("a", 1000, 80), vc("b", 1000, 20)], 20, "a");
  assert.equal(r.verdict.kind, "winner");
  assert.equal(r.verdict.canMakeWinner, false);
  assert.equal(r.verdict.leaderId, "a");
});

test("probabilities sum to 1, are deterministic, and ordering follows the data", () => {
  const input = [vc("a", 200, 10), vc("b", 200, 14), vc("c", 200, 6)];
  const r1 = analyse(input, 10, "a"), r2 = analyse(input, 10, "a");
  assert.deepEqual(r1.variants.map((v) => v.probBest), r2.variants.map((v) => v.probBest));
  assert.ok(Math.abs(r1.variants.reduce((s, v) => s + v.probBest, 0) - 1) < 1e-9);
  const p = Object.fromEntries(r1.variants.map((v) => [v.id, v.probBest]));
  assert.ok(p.b > p.a && p.a > p.c);
  for (const v of r1.variants) assert.ok(v.rateLow <= v.rate + 1e-9 && v.rate <= v.rateHigh + 1e-9 || v.impressions === 0);
});

test("equal data gives roughly equal probabilities", () => {
  const r = analyse([vc("a", 500, 25), vc("b", 500, 25)], 20, "a");
  assert.ok(Math.abs(r.variants[0].probBest - 0.5) < 0.05);
});

test("paused variants with no views are ignored, with views are kept", () => {
  assert.equal(analyse([vc("a", 100, 5), vc("b", 0, 0, { active: false })], 3, "a").variants.length, 1);
  assert.equal(analyse([vc("a", 100, 5), vc("b", 50, 2, { active: false })], 3, "a").variants.length, 2);
});

test("daysSince counts calendar days inclusively", () => {
  const today = new Date("2026-10-17T05:00:00Z");
  assert.equal(daysSince("2026-10-17", today), 1);
  assert.equal(daysSince("2026-10-04", today), 14);
  assert.equal(daysSince(undefined, today), 0);
});

// ---- mutations ----
test("update_variant edits copy, bumps rev, records before and after", () => {
  const r = applyAction(base(), { type: "update_variant", variantId: "b", text: "New headline.", emphasis: "Plan in 48\u00a0hours." });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.exp.variants[1].text, "New headline.");
  assert.equal(r.exp.rev, 1);
  assert.equal((r.detail.before as { text: string }).text, "Stop guessing where AI fits.");
  assert.ok(validateExperiment(r.exp));
});

test("copy rules: empty, too long, long dashes, no-op, unknown variant", () => {
  const e = base();
  for (const text of ["", "x".repeat(91), "Hello \u2014 there", "Hello \u2013 there"]) {
    const r = applyAction(e, { type: "update_variant", variantId: "b", text });
    assert.equal(r.ok, false, text.slice(0, 12));
  }
  assert.equal(applyAction(e, { type: "update_variant", variantId: "zz", text: "ok" }).ok, false);
  const same = applyAction(e, { type: "update_variant", variantId: "b", text: e.variants[1].text, emphasis: e.variants[1].emphasis });
  assert.equal(same.ok, false);
});

test("add_variant takes the next free id, max 8", () => {
  let e = base();
  const r = applyAction(e, { type: "add_variant", text: "Fresh idea", emphasis: "in 48 hours." });
  assert.ok(r.ok); if (!r.ok) return;
  assert.equal(r.exp.variants[3].id, "d");
  assert.equal(r.exp.variants[3].active, true);
  e = r.exp;
  for (let i = 0; i < 4; i++) { const n = applyAction(e, { type: "add_variant", text: `Idea ${i}` }); assert.ok(n.ok); if (n.ok) e = n.exp; }
  assert.equal(e.variants.length, 8);
  assert.equal(applyAction(e, { type: "add_variant", text: "One too many" }).ok, false);
});

test("pause and resume variants; control cannot be paused; running needs two active", () => {
  const e = base();
  assert.equal(applyAction(e, { type: "set_variant_active", variantId: "a", active: false }).ok, false);
  const p = applyAction(e, { type: "set_variant_active", variantId: "c", active: false });
  assert.ok(p.ok && p.action === "pause_variant"); if (!p.ok) return;
  assert.equal(p.exp.variants[2].active, false);
  const p2 = applyAction(p.exp, { type: "set_variant_active", variantId: "b", active: false });
  assert.ok(p2.ok); if (!p2.ok) return;
  const paused = applyAction(p2.exp, { type: "set_status", status: "paused" });
  assert.ok(paused.ok); if (!paused.ok) return;
  assert.equal(applyAction(paused.exp, { type: "set_status", status: "running" }).ok, false, "only one active variant left");
});

test("set_status toggles and rejects no-ops", () => {
  const e = base();
  assert.equal(applyAction(e, { type: "set_status", status: "running" }).ok, false);
  const p = applyAction(e, { type: "set_status", status: "paused" });
  assert.ok(p.ok && p.exp.status === "paused");
});

test("make_winner ends the test and the winner becomes the control; reopening works", () => {
  const r = applyAction(base(), { type: "make_winner", variantId: "c" });
  assert.ok(r.ok); if (!r.ok) return;
  assert.equal(r.exp.status, "won");
  assert.equal(r.exp.defaultVariantId, "c");
  const reopen = applyAction(r.exp, { type: "set_status", status: "running" });
  assert.ok(reopen.ok && reopen.action === "reopen_test");
});

test("lead value accepts null and positive numbers only", () => {
  assert.ok(applyAction(base(), { type: "set_lead_value", leadValueAUD: 250 }).ok);
  assert.equal(applyAction(base(), { type: "set_lead_value", leadValueAUD: -1 }).ok, false);
  assert.equal(applyAction(base(), { type: "set_lead_value", leadValueAUD: Number.NaN }).ok, false);
});

test("mutations never alter the input object", () => {
  const e = base(); const snap = JSON.stringify(e);
  applyAction(e, { type: "make_winner", variantId: "b" });
  assert.equal(JSON.stringify(e), snap);
});

test("variantRows mirror copy and flags for the Supabase allow-list", () => {
  const rows = variantRows(base());
  assert.equal(rows.length, 3);
  assert.equal(rows[0].is_default, true);
  assert.match(rows[0].label, /control/);
  assert.ok(rows.every((r) => r.copy.length > 5 && r.active));
});

// ---- data model for future slot types ----
test("non-text slot types are valid in the data model; unknown types are rejected", () => {
  const e = base();
  e.slotType = "image";
  e.variants[1].value = { src: "/brand/hero-b.png", alt: "Hero B" };
  assert.ok(validateExperiment(e));
  e.slotType = "carousel" as never;
  assert.equal(validateExperiment(e), null);
  const dup = base(); dup.variants[1].id = "a";
  assert.equal(validateExperiment(dup), null, "duplicate variant ids rejected");
});

// ---- attribution ----
const attr = (s: object) => serialiseAttr({ f: { ...s, t: 1 }, l: { ...s, t: 1 } } as never);
test("event source comes from sb_attr and carries no PII", () => {
  assert.deepEqual(eventSource(attr({ s: "Google", m: "cpc", c: "Spring_Promo" })), { source: "google", campaign: "spring_promo", channel: "paid" });
  assert.equal(eventSource(attr({ s: "facebook", m: "paid-social" })).channel, "paid");
  assert.equal(eventSource(attr({ s: "linkedin.com", r: "linkedin.com" })).channel, "social");
  assert.equal(eventSource(attr({ s: "google" })).channel, "organic search");
  assert.equal(eventSource(attr({ s: "direct" })).channel, "direct");
  assert.equal(eventSource(attr({ s: "somenews.com.au", m: "referral" })).channel, "referral");
  const pii = eventSource(attr({ s: "newsletter", m: "email", c: "shane@example.com" }));
  assert.ok(!(pii.campaign ?? "").includes("@"), "no @ ever stored");
  assert.equal(eventSource(attr({ s: "x", c: "0412 345 678" })).campaign, null, "phone-like value dropped");
  assert.equal(pii.channel, "email");
  assert.deepEqual(eventSource(null), { source: null, campaign: null, channel: "direct" });
  assert.deepEqual(eventSource("%%garbage"), { source: null, campaign: null, channel: "direct" });
  assert.equal(channelOf(null, undefined), "direct");
});

test("source is read from a raw Cookie header whether encoded once or twice", () => {
  const once = attr({ s: "google", m: "cpc", c: "spring" });
  const twice = encodeURIComponent(once);
  const want = { source: "google", campaign: "spring", channel: "paid" };
  assert.deepEqual(eventSource(once), want);
  assert.deepEqual(eventSource(twice), want);
  assert.deepEqual(eventSource(encodeURIComponent(twice)), want);
});

// ---- access control (static) ----
test("dashboard APIs and page are admin-gated, only the beacon is public", () => {
  const proxy = readFileSync("proxy.ts", "utf8");
  const pub = proxy.slice(proxy.indexOf("const PUBLIC_API"), proxy.indexOf("const ADMIN_API"));
  const adm = proxy.slice(proxy.indexOf("const ADMIN_API"), proxy.indexOf("Public endpoints that client websites"));
  assert.ok(adm.includes('"/api/admin"'));
  assert.ok(!/\/api\/admin/.test(pub), "no admin path is public");
  assert.ok(pub.includes('"/api/exp/event"'));
  assert.ok(!/\/api\/exp[^/]|\/api\/exp"/.test(pub), "only /api/exp/event is public under /api/exp");
  assert.ok(proxy.includes('"/saabai-admin"') && proxy.includes('"/admin"'), "pages protected");
  for (const f of ["app/api/admin/experiments/route.ts", "app/api/admin/experiments/[id]/route.ts"]) {
    const src = readFileSync(f, "utf8");
    assert.ok(/adminActor\(\)/.test(src) && src.includes("Forbidden"), f);
    assert.ok(!/service_role|SERVICE_ROLE/i.test(src));
  }
  assert.ok(readFileSync("app/saabai-admin/experiments/page.tsx", "utf8").includes("requireAdmin("));
  const client = readFileSync("app/saabai-admin/experiments/ExperimentsClient.tsx", "utf8");
  assert.ok(!/SERVICE_ROLE|supabase/i.test(client), "no secrets or db access in the browser bundle");
});
