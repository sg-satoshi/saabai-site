import { test } from "node:test";
import assert from "node:assert/strict";
import { assignAll, defaultVariant, parseExpCookie, validateExperiment, variantFromHeader, kindOf, type Experiment } from "../lib/exp/core";
import { SLOTS, SEED_EXPERIMENTS, slotToExperiment } from "../lib/exp/seed";
import { applyAction } from "../lib/exp/mutate";
import { checkSuggestion, cleanSuggestions, suggestSystem, buildSuggestPrompt } from "../lib/exp/suggest";
import { getExperiments, resetExpCache } from "../lib/exp/config";
import { nextStep } from "../lib/exp/weekly";
import { analyse } from "../lib/exp/stats";

const HUMAN = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const VID = "11111111-1111-4111-8111-111111111111";
const ctx = (o: Record<string, unknown> = {}) => ({ ua: HUMAN, privacy: false, admin: false, optedOut: false, cookie: null, newVisitorId: () => VID, ...o }) as Parameters<typeof assignAll>[1];
const cta = () => structuredClone(SEED_EXPERIMENTS.find((e) => e.slot === "home.hero.cta")!);
const head = () => structuredClone(SEED_EXPERIMENTS.find((e) => e.slot === "home.hero.headline")!);

test("slot registry: unique ids and slot names, every slot validates", () => {
  assert.equal(new Set(SLOTS.map((s) => s.id)).size, SLOTS.length);
  assert.equal(new Set(SLOTS.map((s) => s.slot)).size, SLOTS.length);
  for (const e of SEED_EXPERIMENTS) assert.ok(validateExperiment(e), e.id);
  assert.ok(!/[\u2013\u2014]/.test(JSON.stringify(SEED_EXPERIMENTS)));
});

test("hero CTA slot: control is the live label, two plain variants, button kind", () => {
  const e = cta();
  assert.equal(kindOf(e), "button");
  assert.equal(e.status, "running");
  assert.equal(e.variants.length, 3);
  assert.equal(defaultVariant(e).text, "Get your free AI score");
  assert.equal(e.path, "/");
  for (const v of e.variants) { assert.ok(v.text.length <= 40); assert.equal(v.emphasis, undefined); assert.ok(!/!|[\u2013\u2014]/.test(v.text)); }
});

test("a new slot needs only an id, slot name, kind and copy", () => {
  const e = slotToExperiment({ id: "about-cta", siteKey: "saabai", slot: "about.cta", kind: "button", name: "About button", path: "/about", control: { text: "Talk to us" }, variants: [{ text: "Book a chat" }] });
  assert.ok(validateExperiment(e));
  assert.equal(e.status, "running");
  const solo = slotToExperiment({ id: "about-cta", siteKey: "saabai", slot: "about.cta", kind: "button", name: "x", path: "/about", control: { text: "Talk to us" } });
  assert.equal(solo.status, "draft");
});

test("button copy limits are enforced in config validation", () => {
  const e = cta(); e.variants[1].text = "x".repeat(41);
  assert.equal(validateExperiment(e), null);
  const f = cta(); f.variants[1].emphasis = "extra";
  assert.equal(validateExperiment(f), null);
  const bad = cta(); bad.kind = "nope" as never;
  assert.equal(validateExperiment(bad), null);
});

test("assignAll: two slots share one visitor id and one cookie, independent variants, header lists both", () => {
  const exps = [head(), cta()];
  let n = 0;
  const rng = () => [0.0, 0.99][n++ % 2];
  const r = assignAll(exps, ctx({ rng }));
  assert.equal(r.track, true);
  assert.ok(r.cookie);
  const ck = parseExpCookie(r.cookie)!;
  assert.equal(ck.v, VID);
  assert.deepEqual(Object.keys(ck.a).sort(), ["home-hero-cta", "home-hero-headline"]);
  assert.equal(variantFromHeader(r.header, "home-hero-headline"), ck.a["home-hero-headline"]);
  assert.equal(variantFromHeader(r.header, "home-hero-cta"), ck.a["home-hero-cta"]);
  assert.equal(variantFromHeader(r.header, "missing"), undefined);
  assert.equal(variantFromHeader(null, "x"), undefined);
});

test("assignAll: sticky on repeat, and an existing headline-only cookie gains the new slot without losing its headline", () => {
  const old = parseExpCookie(encodeURIComponent(JSON.stringify({ v: VID, a: { "home-hero-headline": "c" } })))!;
  const r = assignAll([head(), cta()], ctx({ cookie: old }));
  const ck = parseExpCookie(r.cookie)!;
  assert.equal(ck.v, VID);
  assert.equal(ck.a["home-hero-headline"], "c");
  assert.ok(ck.a["home-hero-cta"]);
  const again = assignAll([head(), cta()], ctx({ cookie: ck }));
  assert.equal(again.cookie, undefined);
  assert.equal(variantFromHeader(again.header, "home-hero-cta"), ck.a["home-hero-cta"]);
});

test("assignAll: bots, GPC/DNT, admin and opt-out get every slot's control with no cookie and no tracking", () => {
  for (const o of [{ ua: "Googlebot/2.1" }, { ua: "" }, { privacy: true }, { admin: true }, { optedOut: true }]) {
    const r = assignAll([head(), cta()], ctx(o));
    assert.equal(r.cookie, undefined); assert.equal(r.track, false);
    assert.equal(variantFromHeader(r.header, "home-hero-headline"), "a");
    assert.equal(variantFromHeader(r.header, "home-hero-cta"), "a");
  }
});

test("assignAll: a paused slot does not affect a running one; won serves control untracked", () => {
  const c = cta(); c.status = "won";
  const r = assignAll([head(), c], ctx());
  assert.equal(variantFromHeader(r.header, "home-hero-cta"), "a");
  const ck = parseExpCookie(r.cookie)!;
  assert.equal(ck.a["home-hero-cta"], undefined);
  assert.ok(ck.a["home-hero-headline"]);
});

test("config falls back to the full seed (all slots) when Redis has nothing", async () => {
  resetExpCache();
  const list = await getExperiments("saabai", { fresh: true });
  const ids = list.map((e) => e.id);
  assert.ok(ids.includes("home-hero-headline") && ids.includes("home-hero-cta"));
});

test("dashboard edits on a button slot: valid edit, 40 char limit, no highlight part, no long dash, add variant", () => {
  const e = cta();
  const ok = applyAction(e, { type: "update_variant", variantId: "b", text: "Start the free AI quiz" });
  assert.ok(ok.ok && ok.exp.variants[1].text === "Start the free AI quiz");
  const long = applyAction(e, { type: "update_variant", variantId: "b", text: "y".repeat(41) });
  assert.ok(!long.ok && /button label/.test(long.error));
  const emph = applyAction(e, { type: "update_variant", variantId: "b", text: "Short", emphasis: "more" });
  assert.ok(!emph.ok && /highlighted/.test(emph.error));
  const dash = applyAction(e, { type: "update_variant", variantId: "b", text: "Go \u2014 now" });
  assert.ok(!dash.ok);
  const add = applyAction(e, { type: "add_variant", text: "See your AI score" });
  assert.ok(add.ok && add.exp.variants.length === 4 && add.exp.variants[3].id === "d");
});

test("headline edits still allow the 90 character limit and highlight", () => {
  const ok = applyAction(head(), { type: "update_variant", variantId: "b", text: "z".repeat(90), emphasis: "w".repeat(10) });
  assert.ok(ok.ok);
});

test("AI suggestions for a button: plain labels pass, hype, other numbers, links and highlight parts are blocked", () => {
  const pass = (t: string) => checkSuggestion({ text: t, emphasis: "", rationale: "" }, [], "button");
  assert.equal(pass("Find out where AI fits"), null);
  assert.equal(pass("Take the free 3 minute quiz"), null);
  assert.equal(pass("Get my free AI score"), null);
  assert.ok(pass("Unlock your AI score"));
  assert.ok(pass("Start now"));
  assert.ok(pass("Get 100 leads"));
  assert.ok(pass("Take the free 5 minute quiz"));
  assert.ok(pass("Guaranteed AI score"));
  assert.ok(pass("Go! Go! Go!"));
  assert.ok(pass("Score \u2014 free"));
  assert.ok(pass("x".repeat(41)));
  assert.ok(pass("https://x.co"));
  assert.ok(checkSuggestion({ text: "Fine label", emphasis: "extra", rationale: "" }, [], "button"));
  assert.ok(checkSuggestion({ text: "Get your free AI score", emphasis: "", rationale: "" }, ["get your free ai score"], "button"));
});

test("AI suggestion clean-up for a button drops emphasis and keeps rules", () => {
  const raw = [{ text: "See where AI fits", emphasis: "ignored", why: "angle" }, { text: "Unlock it", why: "x" }, { text: "Start the free quiz", why: "y" }];
  const { ok, dropped } = cleanSuggestions(raw, ["Get your free AI score"], 3, "button");
  assert.deepEqual(ok.map((s) => s.text), ["See where AI fits", "Start the free quiz"]);
  assert.ok(ok.every((s) => s.emphasis === ""));
  assert.equal(dropped.length, 1);
});

test("headline suggestion rules are unchanged by default", () => {
  assert.ok(checkSuggestion({ text: "Get 100 leads", emphasis: "", rationale: "" }, []));
  assert.equal(checkSuggestion({ text: "Know where AI fits,", emphasis: "in 48\u00a0hours.", rationale: "" }, []), "in 48 hours is not a claim we can make");
});

test("button suggestions use the button prompt and noun", () => {
  assert.match(suggestSystem("button"), /button label/);
  assert.match(suggestSystem("headline"), /headline variants/);
  const e = cta();
  const an = analyse(e.variants.map((v) => ({ id: v.id, label: v.id, active: true, isDefault: v.id === "a", impressions: 0, ctaClicks: 0, calls: 0, enquiries: 0, converters: 0 })), 0, "a");
  assert.match(buildSuggestPrompt(e, an, 0, []), /3 new button label variants/);
});

test("weekly note names the right thing to make live", () => {
  const e = cta();
  const an = analyse(e.variants.map((v) => ({ id: v.id, label: v.id, active: true, isDefault: v.id === "a", impressions: 0, ctaClicks: 0, calls: 0, enquiries: 0, converters: 0 })), 0, "a");
  const txt = nextStep({ exp: e, analysis: { ...an, verdict: { ...an.verdict, kind: "winner", leaderId: "b", canMakeWinner: true } }, daysRunning: 20, week: { views: 1, conversions: 0, perVariant: {} }, pendingSuggestions: 0 } as never);
  assert.match(txt, /live button label/);
});

test("Experiment type accepts old stored experiments with no kind (treated as headline)", () => {
  const old = head() as Experiment; delete old.kind;
  assert.ok(validateExperiment(old));
  assert.equal(kindOf(old), "headline");
});
