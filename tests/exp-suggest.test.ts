import { test } from "node:test";
import assert from "node:assert/strict";
import { analyse, type VariantCounts } from "../lib/exp/stats";
import { applyAction } from "../lib/exp/mutate";
import { SEED_EXPERIMENTS } from "../lib/exp/seed";
import { buildSuggestPrompt, checkSuggestion, cleanSuggestions, parseModelJson, SUGGEST_SYSTEM } from "../lib/exp/suggest";
import { addDays, brisbaneDate, buildNote, nextStep, renderNote, sumWeek, WEEKLY_MIN_VIEWS, type WeekInput } from "../lib/exp/weekly";

const exp = () => structuredClone(SEED_EXPERIMENTS[0]);
const vc = (id: string, impressions: number, converters: number): VariantCounts => ({ id, impressions, converters, ctaClicks: 0, calls: 0, enquiries: converters, active: true, isDefault: id === "a" });
const S = (text: string, emphasis = "") => ({ text, emphasis, rationale: "" });

// ---- guardrails ----
test("a plain, honest headline passes", () => {
  assert.equal(checkSuggestion(S("Not sure where AI fits in your business?", "Get a straight answer in 48 hours."), []), null);
});

test("guardrails reject dashes, hype, exclamations, numbers, links, emoji, long copy and duplicates", () => {
  const bad = (t: string, e = "") => checkSuggestion(S(t, e), ["Stop guessing where AI fits. Get a clear plan"]);
  assert.equal(bad("AI plans \u2014 in 48 hours"), "long dash");
  assert.equal(bad("AI plans \u2013 in 48 hours"), "long dash");
  assert.equal(bad("Get a clear AI plan today!"), "exclamation");
  assert.equal(bad("Save 30% with AI in 48 hours"), "number we cannot back up");
  assert.equal(bad("Join 200 businesses using AI"), "number we cannot back up");
  assert.equal(bad("Done in 48 days"), "48 must mean 48 hours");
  assert.equal(bad("The best AI plan in 48 hours"), "claim we cannot back up");
  assert.equal(bad("Guaranteed AI savings"), "claim we cannot back up");
  assert.equal(bad("Unlock the power of AI"), "claim we cannot back up");
  assert.equal(bad("See www.example.com"), "link");
  assert.equal(bad("AI that works \u{1F680}"), "emoji");
  assert.equal(bad("x".repeat(95)), "too long");
  assert.equal(bad("a".repeat(60), "b".repeat(60)), "too long");
  assert.equal(bad("Stop guessing where AI fits.", "Get a clear plan"), "duplicate");
  assert.equal(bad("  "), "empty");
});

test("cleanSuggestions keeps at most 3 good ones, tidies, drops bad and duplicate ones, and keeps 48 hours together", () => {
  const raw = [
    { text: "Know where AI fits.", emphasis: "Plan ready in 48 hours.", why: "Clear next step" },
    { text: "Know where AI fits.", emphasis: "Plan ready in 48 hours.", why: "dupe" },
    { text: "Best AI plan ever", emphasis: "", why: "hype" },
    { text: "Stop wasting money on the wrong AI tool.", emphasis: "Get a plan in 48 hours.", why: "Cost of guessing" },
    { text: "Your week is full.\n  Let AI take the busywork.", emphasis: "", why: "Time" },
    { text: "Plain English AI advice for your business.", emphasis: "No jargon.", why: "Jargon" },
    "junk", null, 5,
  ];
  const { ok, dropped } = cleanSuggestions(raw, []);
  assert.equal(ok.length, 3);
  assert.ok(ok[0].emphasis.includes("48\u00a0hours"));
  assert.equal(ok[2].text, "Your week is full. Let AI take the busywork.");
  assert.ok(dropped.some((d) => d.why === "duplicate") && dropped.some((d) => d.why === "claim we cannot back up"));
  for (const s of ok) assert.ok(!/[\u2013\u2014]/.test(s.text + s.emphasis));
});

test("cleanSuggestions never returns something already live or already rejected", () => {
  const live = exp().variants.map((v) => [v.text, v.emphasis].join(" "));
  const { ok } = cleanSuggestions([{ text: "Stop guessing where AI fits.", emphasis: "Get a clear plan for your business in 48 hours." }], live);
  assert.equal(ok.length, 0);
});

test("non-array model output gives nothing rather than throwing", () => {
  assert.deepEqual(cleanSuggestions({ a: 1 }, []).ok, []);
  assert.deepEqual(cleanSuggestions(undefined, []).ok, []);
});

test("parseModelJson copes with fences and chatter, and returns null for junk", () => {
  assert.deepEqual(parseModelJson('```json\n[{"text":"a"}]\n```'), [{ text: "a" }]);
  assert.deepEqual(parseModelJson('Here you go: [{"text":"a"}] hope that helps'), [{ text: "a" }]);
  assert.equal(parseModelJson("no json here"), null);
  assert.equal(parseModelJson("[broken"), null);
});

test("system prompt states the voice and hard rules", () => {
  for (const w of ["Australian", "em dashes", "48 hours", "JSON", "exactly 3"]) assert.ok(SUGGEST_SYSTEM.includes(w), w);
});

test("prompt carries the real variants and results, flags early data, and lists rejected ideas", () => {
  const e = exp();
  const a = analyse([vc("a", 40, 1), vc("b", 38, 3), vc("c", 41, 0)], 3, "a");
  const p = buildSuggestPrompt(e, a, 3, ["Old rejected idea"]);
  assert.ok(p.includes("Know exactly where AI will") && p.includes("(control)"));
  assert.ok(p.includes("38 views, 3 enquiries or calls"));
  assert.ok(p.includes("Old rejected idea"));
  assert.ok(/early and noisy|weak hint/.test(p));
  assert.ok(!/[\u2013\u2014]/.test(p));
});

// ---- approval gate ----
test("an AI-sourced variant is added only through add_variant with source ai, and is logged as an approval", () => {
  const r = applyAction(exp(), { type: "add_variant", text: "Know where AI fits.", emphasis: "Plan in 48\u00a0hours.", source: "ai", suggestionId: "s1", edited: true });
  assert.ok(r.ok);
  if (r.ok) {
    const v = r.exp.variants[r.exp.variants.length - 1];
    assert.equal(v.source, "ai");
    assert.equal(r.action, "approve_suggestion");
    assert.equal(r.detail.suggestionId, "s1");
    assert.equal(r.detail.editedBeforeApproval, true);
  }
});

test("an ordinary add_variant stays human, and approval still enforces the dash and length rules", () => {
  const h = applyAction(exp(), { type: "add_variant", text: "Plain headline" });
  assert.ok(h.ok && h.exp.variants[3].source === "human" && h.action === "add_variant");
  assert.ok(!applyAction(exp(), { type: "add_variant", text: "Has a dash \u2014 here", source: "ai" }).ok);
  assert.ok(!applyAction(exp(), { type: "add_variant", text: "x".repeat(91), source: "ai" }).ok);
});

// ---- weekly note ----
const week = (views: number, conv: number) => ({ views, conversions: conv, perVariant: { a: { views: Math.floor(views / 3), conversions: 1 }, b: { views: Math.floor(views / 3), conversions: conv }, c: { views: views - 2 * Math.floor(views / 3), conversions: 0 } } });
const input = (views: number, conv: number, counts: VariantCounts[], days: number, pending = 0): WeekInput => ({ exp: exp(), analysis: analyse(counts, days, "a"), daysRunning: days, week: week(views, conv), pendingSuggestions: pending });

test("sumWeek only counts days from the start of the week", () => {
  const rows = [
    { day: "2026-10-10", variant_key: "a", impressions: 99, converters: 9 },
    { day: "2026-10-12", variant_key: "a", impressions: 10, converters: 1 },
    { day: "2026-10-13", variant_key: "b", impressions: 20, converters: 2 },
    { day: "2026-10-14", variant_key: "a", impressions: 5, converters: 0 },
  ];
  const w = sumWeek(rows, "2026-10-12");
  assert.equal(w.views, 35);
  assert.equal(w.conversions, 3);
  assert.deepEqual(w.perVariant.a, { views: 15, conversions: 1 });
});

test("no meaningful traffic means no note", () => {
  assert.equal(buildNote(input(WEEKLY_MIN_VIEWS - 1, 0, [vc("a", 20, 0), vc("b", 20, 0)], 5)), null);
  assert.equal(buildNote(input(0, 0, [vc("a", 0, 0), vc("b", 0, 0)], 0)), null);
  assert.ok(buildNote(input(WEEKLY_MIN_VIEWS, 1, [vc("a", 20, 0), vc("b", 20, 1)], 5)));
});

test("next step never tells Shane to go live on unproven data", () => {
  const early = nextStep(input(120, 8, [vc("a", 120, 2), vc("b", 118, 18)], 5, 2));
  assert.ok(/isn't proven|too early/i.test(early) && /don't switch/i.test(early));
  assert.ok(/2 AI suggestions are waiting/.test(early));
  const proven = nextStep(input(2000, 90, [vc("a", 1000, 20), vc("b", 1000, 70)], 20));
  assert.ok(/your click/.test(proven));
  const ctrl = nextStep(input(2000, 100, [vc("a", 1000, 80), vc("b", 1000, 20)], 20));
  assert.ok(/nothing to switch/.test(ctrl));
  assert.ok(/too early to tell/.test(nextStep(input(60, 1, [vc("a", 30, 0), vc("b", 30, 1)], 4))));
});

test("the rendered note is plain, escaped, marked draft, and free of long dashes", () => {
  const i = input(150, 6, [vc("a", 50, 1), vc("b", 50, 4), vc("c", 50, 1)], 6);
  i.exp.variants[0].text = "Know <b>exactly</b> & more";
  const note = buildNote(i)!;
  const m = renderNote([note], "2026-10-11", "2026-10-17");
  assert.ok(m.subject.startsWith("Draft:"));
  assert.ok(m.html.includes("&lt;b&gt;exactly&lt;/b&gt; &amp; more") && !m.html.includes("<b>exactly</b>"));
  assert.ok(m.html.includes("DRAFT for Shane only"));
  assert.ok(m.html.includes("/saabai-admin/experiments?id=home-hero-headline"));
  assert.ok(!/[\u2013\u2014]/.test(m.html + m.text + m.subject));
  assert.ok(m.text.includes("150 views"));
});

test("Brisbane date arithmetic works across the UTC boundary", () => {
  assert.equal(brisbaneDate(new Date("2026-10-18T21:30:00Z")), "2026-10-19"); // Monday 7:30am Brisbane
  assert.equal(addDays("2026-10-18", -6), "2026-10-12");
});
