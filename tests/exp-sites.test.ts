import test from "node:test";
import assert from "node:assert/strict";
import { scopedSlot, siteOn } from "../lib/exp/sites";
import { SLOT_RE, experimentIdForSlot } from "../lib/exp/editor";
import { suggestSystem } from "../lib/exp/suggest";
import { buildNote, renderNote } from "../lib/exp/weekly";

test("client sites default OFF; saabai keeps its env default", () => {
  const none = new Set<string>();
  assert.equal(siteOn("saabai", undefined, none), true);
  assert.equal(siteOn("sunder", undefined, none), false);
  assert.equal(siteOn("cycle-repair", "saabai", none), false);
  assert.equal(siteOn("sunder", undefined, new Set(["sunder"])), true);
  assert.equal(siteOn("sunder", "saabai,sunder", none), true);
});

test("'none' switches every site off, even a flagged client site", () => {
  assert.equal(siteOn("saabai", "none", new Set()), false);
  assert.equal(siteOn("sunder", "none", new Set(["sunder"])), false);
});

test("bad site keys never switch on", () => {
  assert.equal(siteOn("../x", undefined, new Set(["../x"])), false);
  assert.equal(siteOn("", undefined, new Set([""])), false);
});

test("client slots are prefixed with the site key and stay valid slot names", () => {
  assert.equal(scopedSlot("saabai", "home.hero.cta"), "home.hero.cta");
  const s = scopedSlot("sunder", "home.hero.headline");
  assert.equal(s, "sunder-home.hero.headline");
  assert.equal(scopedSlot("sunder", s), s);
  assert.ok(SLOT_RE.test(s));
  assert.equal(experimentIdForSlot(s), "sunder-home-hero-headline");
  assert.notEqual(experimentIdForSlot(scopedSlot("cycle-repair", "home.hero.headline")), experimentIdForSlot(s));
});

test("client suggestions use the client's brand, never Saabai's", () => {
  const p = suggestSystem("headline", { name: "SUNDER", about: "Pickleball paddles." });
  assert.ok(p.includes("SUNDER"));
  assert.ok(!/saabai/i.test(p));
  assert.ok(!/[\u2013\u2014]/.test(p));
  assert.ok(/saabai/i.test(suggestSystem("headline")));
});

test("weekly note names the client site and links to it", () => {
  const exp = { id: "sunder-home-hero-headline", siteKey: "sunder", slot: "sunder-home.hero.headline", path: "/", status: "running" as const, defaultVariantId: "a", name: "Hero headline",
    variants: [{ id: "a", text: "Get first hit.", active: true }, { id: "b", text: "Feel the power. Keep the control.", active: true }] };
  const analysis = { verdict: { kind: "early", headline: "Too early.", detail: "", leaderId: null, probBest: 0, canMakeWinner: false, missing: [] }, variants: [] } as never;
  const note = buildNote({ exp, analysis, daysRunning: 3, week: { views: 80, conversions: 4, perVariant: { a: { views: 40, conversions: 2 }, b: { views: 40, conversions: 2 } } }, pendingSuggestions: 0 }, undefined, { key: "sunder", label: "SUNDER" });
  assert.ok(note);
  assert.ok(note!.adminUrl.endsWith("&site=sunder"));
  const mail = renderNote([note!], "2026-11-02", "2026-11-08");
  assert.ok(mail.text.includes("Hero headline (SUNDER)"));
  assert.ok(mail.html.includes("on SUNDER"));
});
