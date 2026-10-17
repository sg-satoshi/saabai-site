import test from "node:test";
import assert from "node:assert/strict";
import { ANTI_FLICKER_SCRIPT, chooseTarget, decodeOverlay, encodeOverlay, fingerprint, isOverlayExp, liveOverlays, overlayPathOk, similarity } from "../lib/exp/overlay";
import { validateExperiment, type Experiment } from "../lib/exp/core";

const mk = (o: Partial<Experiment> = {}): Experiment => ({
  id: "home-main-text", siteKey: "saabai", slot: "home.main.text", kind: "headline", path: "/", status: "running", defaultVariantId: "a", name: "t",
  overlay: { sel: "body>main:nth-of-type(1)>h2:nth-of-type(2)", fp: "we build things", tag: "h2" },
  variants: [{ id: "a", text: "We build things", active: true }, { id: "b", text: "We build better things", active: true }], ...o,
});

test("overlay shape is validated on the experiment", () => {
  assert.ok(validateExperiment(mk()));
  assert.equal(validateExperiment(mk({ overlay: { sel: "a<script>", fp: "x", tag: "h2" } })), null);
  assert.equal(validateExperiment(mk({ overlay: { sel: "h2", fp: "x", tag: "h2 h3" } })), null);
});

test("paths: legal, admin, api and customer sites are never overlaid", () => {
  for (const p of ["/privacy", "/terms", "/legal/x", "/saabai-admin", "/api/x", "/sites/stus", "/x.png", "//evil"]) assert.equal(overlayPathOk(p), false, p);
  for (const p of ["/", "/pricing", "/blueprint"]) assert.equal(overlayPathOk(p), true, p);
});

test("fingerprint and similarity survive whitespace and case", () => {
  assert.equal(fingerprint("  We  BUILD\u00a0things "), "we build things");
  assert.ok(similarity("We build things for you", "we build things") >= 0.6);
  assert.ok(similarity("totally different", "we build things") < 0.2);
});

test("chooseTarget: selector+text, markup shift, copy edit, ambiguity", () => {
  assert.equal(chooseTarget("we build things", [{ text: "We build things", viaSelector: true }]), 0);
  // markup shifted: selector now hits something else, the text lives elsewhere
  assert.equal(chooseTarget("we build things", [{ text: "Contact", viaSelector: true }, { text: "We build things", viaSelector: false }]), 1);
  // small copy edit: selector still the only near match
  assert.equal(chooseTarget("we build things for small business", [{ text: "We build things for small businesses", viaSelector: true }]), 0);
  // big copy edit: do nothing (serve control)
  assert.equal(chooseTarget("we build things", [{ text: "Completely new heading text", viaSelector: true }]), -1);
  // two identical matches by text only: ambiguous, do nothing
  assert.equal(chooseTarget("hi there", [{ text: "Hi there", viaSelector: false }, { text: "Hi there", viaSelector: false }]), -1);
});

test("cookie: control carries no copy, variant does, won shows winner, round trips", () => {
  const e = mk();
  const ctl = decodeOverlay(encodeOverlay("/", [e], { [e.id]: "a" }));
  assert.equal(ctl?.o[0].x, undefined);
  const v = decodeOverlay(encodeOverlay("/", [e], { [e.id]: "b" }));
  assert.equal(v?.o[0].x, "We build better things");
  assert.equal(v?.o[0].l, "home.main.text");
  const won = decodeOverlay(encodeOverlay("/", [mk({ status: "won", defaultVariantId: "b" })], {}));
  assert.equal(won?.o[0].x, "We build better things");
  assert.equal(encodeOverlay("/", [e], {}), null);
});

test("cookie is size capped and rejects bad selectors / dashes", () => {
  const big = Array.from({ length: 6 }, (_, i) => mk({ id: `t-${i}-abc`, variants: [{ id: "a", text: "x", active: true }, { id: "b", text: "y".repeat(290), active: true }] }));
  const val = encodeOverlay("/", big, Object.fromEntries(big.map((b) => [b.id, "b"])));
  assert.ok(val && val.length <= 3200);
  const raw = encodeURIComponent(JSON.stringify({ p: "/", o: [{ i: "x", s: "h2<script>", f: "a", t: "h2", k: "text", l: "a.b.c", a: "b", x: "hi" }, { i: "y", s: "h2", f: "a", t: "h2", k: "text", l: "a.b.c", a: "b", x: "a \u2014 b" }] }));
  assert.equal(decodeOverlay(raw)?.o.length, 0);
});

test("only running or won overlay tests; a native slot in seed wins", () => {
  const live = [mk(), mk({ id: "paused-one", status: "paused" }), mk({ id: "no-overlay", overlay: undefined })];
  assert.deepEqual(liveOverlays(live, new Set(), "/").map((e) => e.id), ["home-main-text"]);
  assert.equal(liveOverlays(live, new Set(["home-main-text"]), "/").length, 0);
  assert.ok(isOverlayExp(mk()));
  assert.equal(isOverlayExp(mk({ overlay: { sel: "h2", fp: "powered by saabai.ai", tag: "p" } })), false);
});

test("anti-flicker script only hides non-control targets and has a failsafe", () => {
  assert.match(ANTI_FLICKER_SCRIPT, /t\.x&&re\.test/);
  assert.match(ANTI_FLICKER_SCRIPT, /setTimeout/);
  assert.doesNotThrow(() => new Function(ANTI_FLICKER_SCRIPT));
});
