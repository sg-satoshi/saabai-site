import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { STATIC_EXP_SCRIPT, injectStaticExp } from "../lib/exp/static-overlay";
import { CLIENT_SEEDS, SEED_EXPERIMENTS, SLOTS } from "../lib/exp/seed";
import { validateExperiment } from "../lib/exp/core";
import { SUNDER_HEADLINE } from "../lib/sunder-factory-seed";

/** Minimal DOM stand-in: one h1, enough for the static overlay runtime. */
function runScript(cookie: string, path = "/") {
  const text: { nodeType: number; nodeValue: string } = { nodeType: 3, nodeValue: SUNDER_HEADLINE.control };
  const attrs: Record<string, string> = {};
  const h1 = {
    tagName: "H1", childNodes: [text],
    get textContent() { return text.nodeValue; }, set textContent(v: string) { text.nodeValue = v; },
    querySelector: () => null, closest: () => null, contains: () => false,
    setAttribute: (k: string, v: string) => { attrs[k] = v; }, getAttribute: (k: string) => attrs[k] ?? null,
  };
  const cls = new Set<string>(["sb-af"]);
  const listeners: Record<string, () => void> = {};
  const sent: string[] = [];
  const document = {
    cookie, readyState: "complete",
    documentElement: { classList: { remove: (c: string) => cls.delete(c), add: (c: string) => cls.add(c) } },
    querySelectorAll: (s: string) => (s === "h1" ? [h1] : []), getElementsByTagName: (t: string) => (t === "h1" ? [h1] : []),
    addEventListener: () => {},
  };
  const window = { addEventListener: (n: string, f: () => void) => { listeners[n] = f; } };
  const navigator = { sendBeacon: (_u: string, b: { s: string }) => { sent.push(b.s); return true; } };
  class Blob { s: string; constructor(p: string[]) { this.s = p[0]; } }
  new Function("document", "window", "navigator", "location", "Blob", "sessionStorage", STATIC_EXP_SCRIPT)(
    document, window, navigator, { pathname: path }, Blob, { getItem: () => null, setItem: () => {} });
  return { h1: text, attrs, cls, listeners, sent };
}

const ov = (x?: string) => `sb_ov=${encodeURIComponent(JSON.stringify({ p: "/", o: [{ i: "sunder-home-hero-headline", s: "h1", f: SUNDER_HEADLINE.control.toLowerCase(), t: "h1", k: "headline", l: "sunder-home.hero.headline", a: x ? "b" : "a", ...(x ? { x } : {}) }] }))}`;

test("static overlay swaps the SUNDER headline for the assigned variant and fires goal once", () => {
  const r = runScript(ov(SUNDER_HEADLINE.variant));
  assert.equal(r.h1.nodeValue.trim(), SUNDER_HEADLINE.variant);
  assert.equal(r.attrs["data-exp-variant"], "b");
  assert.equal(r.cls.has("sb-af"), false);
  r.listeners["sb:goal"](); r.listeners["sb:goal"]();
  assert.deepEqual(r.sent, [JSON.stringify({ type: "goal" })]);
});

test("static overlay leaves the page alone without a cookie, on control, or on a /sites preview", () => {
  assert.equal(runScript("").h1.nodeValue, SUNDER_HEADLINE.control);
  assert.equal(runScript(ov()).h1.nodeValue, SUNDER_HEADLINE.control);
  const p = runScript(ov(SUNDER_HEADLINE.variant), "/sites/sunder");
  assert.equal(p.h1.nodeValue, SUNDER_HEADLINE.control);
  assert.equal(p.listeners["sb:goal"], undefined);
});

test("injectStaticExp adds one head script and is idempotent", () => {
  const once = injectStaticExp("<html><head></head><body></body></html>");
  assert.equal((once.match(/data-sb-exp/g) ?? []).length, 1);
  assert.equal(injectStaticExp(once), once);
  assert.equal(injectStaticExp("<p>no head</p>"), "<p>no head</p>");
  assert.doesNotMatch(STATIC_EXP_SCRIPT, /[\u2013\u2014]/);
});

test("every static serve path injects the runtime", () => {
  const src = readFileSync("app/sites/[slug]/route.ts", "utf8");
  assert.equal((src.match(/injectStaticExp\(ensurePoweredBy\(/g) ?? []).length, 3);
});

test("SUNDER page sends goal only after a successful signup, endpoint unchanged", () => {
  const html = readFileSync("public/clients/sunder/index.html", "utf8");
  assert.match(html, /if\(r\.ok&&r\.j\.ok\)\{[^}]*thanks\(first,r\.j\.ref,r\.j\.token\);try\{window\.dispatchEvent\(new Event\('sb:goal'\)\)\}catch\{\}\}/);
  assert.equal((html.match(/sb:goal/g) ?? []).length, 1);
  assert.match(html, /post\('\/api\/sunder-waitlist',\{/);
});

test("SUNDER headline test ships as an idle draft overlay test with both headlines", () => {
  const s = CLIENT_SEEDS.find((e) => e.id === "sunder-home-hero-headline")!;
  assert.ok(s && validateExperiment(s));
  assert.equal(s.status, "draft");
  assert.equal(s.siteKey, "sunder");
  assert.deepEqual(s.variants.map((v) => v.text), [SUNDER_HEADLINE.control, SUNDER_HEADLINE.variant]);
  assert.ok(SEED_EXPERIMENTS.some((e) => e.id === s.id));
  assert.ok(!SLOTS.some((x) => x.id === s.id), "not a native slot, so the overlay is never treated as wrapped");
});
