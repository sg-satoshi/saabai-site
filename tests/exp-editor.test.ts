import { test } from "node:test";
import assert from "node:assert/strict";
import { insertSlotEntry, kindForElement, slotEntrySource, slugify, suggestSlot, uniqueSlot, validateWrapRequest, requestNote } from "../lib/exp/editor";
import { SLOTS } from "../lib/exp/seed";
import { readFileSync } from "node:fs";

const el = (o: Partial<Parameters<typeof kindForElement>[0]> = {}) => ({ tag: "H2", className: "", complex: false, excluded: false, text: "How it works", ...o });

test("eligibility: plain headlines and buttons only", () => {
  assert.equal(kindForElement(el()), "headline");
  assert.equal(kindForElement(el({ tag: "a", className: "btn primary", text: "Book a call" })), "button");
  assert.equal(kindForElement(el({ tag: "button", text: "Send" })), "button");
  assert.equal(kindForElement(el({ tag: "a", className: "link", text: "Read more here" })), null);
  assert.equal(kindForElement(el({ tag: "p", text: "A paragraph of text" })), null);
  assert.equal(kindForElement(el({ complex: true })), null);
  assert.equal(kindForElement(el({ excluded: true })), null);
  assert.equal(kindForElement(el({ text: "ab" })), null);
  assert.equal(kindForElement(el({ tag: "button", text: "x".repeat(60) })), null);
});

test("slot names", () => {
  assert.equal(slugify("Why Saabai?"), "why-saabai");
  assert.equal(suggestSlot("/", "hero", "button"), "home.hero.cta");
  assert.equal(suggestSlot("/pricing/plans", "Our Plans", "headline"), "pricing.our-plans.headline");
  assert.equal(suggestSlot("/about", "", "headline"), "about.main.headline");
  assert.equal(uniqueSlot("a.b.c", ["a.b.c"]), "a.b.c-2");
  assert.equal(uniqueSlot("a.b.c", []), "a.b.c");
});

const good = { path: "/about", slot: "about.intro.headline", kind: "headline", name: "About headline", tag: "h2", section: "intro", control: { text: "Who we are", emphasis: "and why" } };

test("wrap request validation", () => {
  assert.equal(validateWrapRequest(good, SLOTS.map((s) => s.slot)).ok, true);
  const bad = (o: object) => validateWrapRequest({ ...good, ...o }, SLOTS.map((s) => s.slot));
  assert.equal(bad({ slot: "home.hero.cta" }).ok, false);
  assert.equal(bad({ slot: "Bad Slot" }).ok, false);
  assert.equal(bad({ path: "//evil.com" }).ok, false);
  assert.equal(bad({ path: "about" }).ok, false);
  assert.equal(bad({ kind: "image" }).ok, false);
  assert.equal(bad({ name: "A \u2014 B" }).ok, false);
  assert.equal(bad({ kind: "button", control: { text: "Go", emphasis: "x" } }).ok, false);
  assert.equal(bad({ control: { text: "" } }).ok, false);
  assert.equal(bad({ tag: "h2><script" }).ok, false);
});

test("slot entry source is valid TS and inserts into the real seed.ts", () => {
  const c = validateWrapRequest(good, []);
  assert.ok(c.ok);
  if (!c.ok) return;
  const entry = slotEntrySource(c.req);
  assert.match(entry, /id: "about-intro-headline"/);
  assert.match(entry, /control: \{ text: "Who we are", emphasis: "and why" \}/);
  const seed = readFileSync(new URL("../lib/exp/seed.ts", import.meta.url), "utf8");
  const next = insertSlotEntry(seed, entry);
  assert.ok(next);
  assert.ok(next!.includes(entry));
  assert.equal(next!.split("\n];").length, seed.split("\n];").length);
  assert.ok(next!.indexOf(entry) < next!.indexOf("const LETTERS"));
  assert.equal(insertSlotEntry("nothing here", entry), null);
});

test("control copy with quotes survives and the request note never starts a test", () => {
  const c = validateWrapRequest({ ...good, control: { text: 'Say "hello" \\ there' } }, []);
  assert.ok(c.ok);
  if (!c.ok) return;
  assert.match(slotEntrySource(c.req), /text: "Say \\"hello\\" \\\\ there"/);
  assert.match(requestNote(c.req), /Nothing is live/);
  assert.ok(!/[\u2013\u2014]/.test(requestNote(c.req)));
});
