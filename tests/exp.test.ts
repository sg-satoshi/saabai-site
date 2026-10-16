import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assign, defaultVariant, enabledSites, isBot, parseExpCookie, pickVariant, privacySignal,
  serialiseExpCookie, siteKeyForHost, validateExperiment, type Experiment,
} from "../lib/exp/core";
import { SEED_EXPERIMENTS } from "../lib/exp/seed";

const HUMAN = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const exp: Experiment = structuredClone(SEED_EXPERIMENTS[0]);
const ctx = (o: Partial<Parameters<typeof assign>[1]> = {}) => ({
  ua: HUMAN, privacy: false, admin: false, optedOut: false, cookie: null, newVisitorId: () => "11111111-1111-4111-8111-111111111111", ...o,
});

test("seed experiment is valid, control is the live headline, no em dashes", () => {
  assert.ok(validateExperiment(exp));
  assert.equal(exp.variants.length, 3);
  assert.equal(defaultVariant(exp).text, "Know exactly where AI will");
  assert.ok(!/[—–]/.test(JSON.stringify(exp)));
});

test("validateExperiment rejects bad config", () => {
  const bad = structuredClone(exp); bad.variants[1].text = "";
  assert.equal(validateExperiment(bad), null);
  const dash = structuredClone(exp); dash.variants[1].text = "Hello \u2014 world";
  assert.equal(validateExperiment(dash), null);
  const nodef = structuredClone(exp); nodef.defaultVariantId = "zzz";
  assert.equal(validateExperiment(nodef), null);
  const long = structuredClone(exp); long.variants[0].text = "x".repeat(91);
  assert.equal(validateExperiment(long), null);
  assert.equal(validateExperiment(null), null);
});

test("bot detection", () => {
  for (const ua of ["Googlebot/2.1", "Mozilla/5.0 (compatible; GPTBot/1.1)", "curl/8.4.0", "Mozilla/5.0 (compatible; SaabaiSiteCheck/1.0)", "HeadlessChrome", "", null, "ClaudeBot", "Bingbot", "Lighthouse"]) {
    assert.equal(isBot(ua as string | null), true, String(ua));
  }
  assert.equal(isBot(HUMAN), false);
});

test("GPC and DNT are honoured", () => {
  assert.equal(privacySignal(new Headers({ "sec-gpc": "1" })), true);
  assert.equal(privacySignal(new Headers({ dnt: "1" })), true);
  assert.equal(privacySignal(new Headers()), false);
});

test("bots, privacy, admin and opt-out get the default with no cookie and no tracking", () => {
  for (const o of [{ ua: "Googlebot/2.1" }, { privacy: true }, { admin: true }, { optedOut: true }]) {
    const a = assign(exp, ctx(o));
    assert.equal(a.variant.id, "a"); assert.equal(a.track, false); assert.equal(a.cookie, undefined);
  }
});

test("humans get a tracked variant and a cookie; repeat visits are sticky", () => {
  const first = assign(exp, ctx({ rng: () => 0.5 }));
  assert.equal(first.track, true);
  assert.ok(first.cookie);
  const ck = parseExpCookie(first.cookie);
  assert.equal(ck?.a[exp.id], first.variant.id);
  for (let i = 0; i < 20; i++) {
    const again = assign(exp, ctx({ cookie: ck, rng: Math.random }));
    assert.equal(again.variant.id, first.variant.id);
    assert.equal(again.cookie, undefined);
  }
});

test("even split across variants and inactive variants are never served", () => {
  const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
  let seed = 7; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 3000; i++) counts[pickVariant(exp, rng).id]++;
  for (const k of Object.keys(counts)) assert.ok(counts[k] > 850 && counts[k] < 1150, `${k}=${counts[k]}`);
  const off = structuredClone(exp); off.variants[2].active = false;
  for (let i = 0; i < 500; i++) assert.notEqual(pickVariant(off, rng).id, "c");
});

test("a cookie pointing at a removed variant is reassigned", () => {
  const off = structuredClone(exp); off.variants[1].active = false;
  const ck = { v: "11111111-1111-4111-8111-111111111111", a: { [exp.id]: "b" } };
  const a = assign(off, ctx({ cookie: ck }));
  assert.notEqual(a.variant.id, "b");
  assert.equal(parseExpCookie(a.cookie)?.v, ck.v);
});

test("non-running experiments serve the default untracked", () => {
  for (const status of ["draft", "paused", "won"] as const) {
    const e = { ...exp, status };
    const a = assign(e, ctx());
    assert.equal(a.variant.id, "a"); assert.equal(a.track, false); assert.equal(a.cookie, undefined);
  }
});

test("cookie parse and serialise reject junk", () => {
  assert.equal(parseExpCookie("%7Bnope"), null);
  assert.equal(parseExpCookie(undefined), null);
  assert.equal(parseExpCookie(serialiseExpCookie({ v: "not-a-uuid", a: {} })), null);
  const ok = { v: "11111111-1111-4111-8111-111111111111", a: { x: "a" } };
  assert.deepEqual(parseExpCookie(serialiseExpCookie(ok)), ok);
});

test("only saabai.ai is switched on; client hosts are never experiment sites", () => {
  assert.deepEqual(enabledSites(undefined), ["saabai"]);
  assert.deepEqual(enabledSites("none"), []);
  assert.deepEqual(enabledSites(""), []);
  assert.equal(siteKeyForHost("www.saabai.ai"), "saabai");
  assert.equal(siteKeyForHost("saabai.ai:443"), "saabai");
  assert.equal(siteKeyForHost("stuscyclerepairs.com"), null);
  assert.equal(siteKeyForHost("www.lifestylemoneymanagement.com.au"), null);
});
