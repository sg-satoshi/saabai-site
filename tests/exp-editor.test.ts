import { test } from "node:test";
import type { WrapRequest } from "../lib/exp/editor";
import assert from "node:assert/strict";
import { insertSlotEntry, kindForElement, slotEntrySource, slugify, suggestSlot, uniqueSlot, validateWrapRequest, requestNote } from "../lib/exp/editor";
import { SLOTS } from "../lib/exp/seed";
import { readFileSync } from "node:fs";

const el = (o: Partial<Parameters<typeof kindForElement>[0]> = {}) => ({ tag: "H2", className: "", complex: false, excluded: false, text: "How it works", ...o });

test("eligibility: plain headlines and buttons only", () => {
  assert.equal(kindForElement(el()), "headline");
  assert.equal(kindForElement(el({ tag: "a", className: "btn primary", text: "Book a call" })), "button");
  assert.equal(kindForElement(el({ tag: "button", text: "Send" })), "button");
  assert.equal(kindForElement(el({ tag: "a", className: "link", text: "Read more here" })), "link");
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
  assert.equal(bad({ kind: "video" }).ok, false);
  assert.equal(bad({ path: "/privacy" }).ok, false);
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

import { wrapSource, countWrapMatches, prBody, isWrapCandidatePath } from "../lib/exp/editor";
import { applyAction } from "../lib/exp/mutate";
import { slotToExperiment } from "../lib/exp/seed";

const btnReq = (o: Record<string, unknown> = {}) => {
  const c = validateWrapRequest({ path: "/about", slot: "about.intro.cta", kind: "button", name: "About button", tag: "a", section: "intro", control: { text: "Take the free AI score \u2192" }, ...o }, []);
  if (!c.ok) throw new Error(c.error);
  return c.req;
};

test("button control drops the trailing arrow", () => {
  assert.equal(btnReq().control.text, "Take the free AI score");
});

test("wrap: single literal button is wrapped, arrow kept, import added", () => {
  const src = `import Link from "next/link";\n\nexport default function P() {\n  return <a className="btn-secondary max-sm:w-full" href="/score">Take the free AI score \u2192</a>;\n}\n`;
  const out = wrapSource(src, btnReq())!;
  assert.ok(out.includes('<ExpText slot="about.intro.cta">'));
  assert.ok(out.includes('data-exp-event="cta_click" {...v.attrs}>{v.text}{" \u2192"}</a>'));
  assert.ok(out.includes('import ExpText from "@/app/components/exp/ExpText";'));
  assert.ok(out.indexOf("import ExpText") > out.indexOf("next/link"));
});

test("wrap: headline without emphasis, multiline attrs", () => {
  const r = validateWrapRequest({ path: "/about", slot: "about.intro.headline", kind: "headline", name: "h", tag: "h2", section: "intro", control: { text: "Who we are" } }, []);
  assert.ok(r.ok);
  const src = `import x from "y";\nexport default () => (\n  <h2\n    className="t"\n  >\n    Who we are\n  </h2>\n);\n`;
  const out = wrapSource(src, (r as { ok: true; req: WrapRequest }).req)!;
  assert.ok(out && out.includes("{v.text}</h2>"));
});

test("wrap: refuses ambiguous, client, emphasis and missing matches", () => {
  const one = `<a className="btn" href="/s">Take the free AI score</a>`;
  assert.equal(wrapSource(`${one}\n${one}`, btnReq()), null);
  assert.equal(wrapSource(`"use client";\n${one}`, btnReq()), null);
  assert.equal(wrapSource(`<a className="btn">Something else</a>`, btnReq()), null);
  assert.equal(countWrapMatches(`<a onClick={() => go()}>Take the free AI score</a>`, btnReq()), 0);
  const emph = validateWrapRequest({ path: "/a", slot: "a.b.headline", kind: "headline", name: "h", tag: "h1", section: "s", control: { text: "Hello", emphasis: "world" } }, []);
  assert.equal(countWrapMatches(`<h1>Hello</h1>`, (emph as { ok: true; req: WrapRequest }).req), 0);
});

test("wrap candidate paths exclude admin, api and the wrapper itself", () => {
  assert.ok(isWrapCandidatePath("app/about/page.tsx"));
  assert.ok(!isWrapCandidatePath("app/saabai-admin/x.tsx"));
  assert.ok(!isWrapCandidatePath("app/api/x/route.ts"));
  assert.ok(!isWrapCandidatePath("app/components/exp/ExpText.tsx"));
});

test("pr body states wrap outcome plainly", () => {
  const r = btnReq();
  assert.ok(prBody(r, { wrapped: true, file: "app/about/page.tsx" }).includes("Wrapped automatically"));
  assert.ok(prBody(r, { wrapped: false, reason: "No match." }).includes("Not wrapped automatically.** No match."));
  assert.ok(!/[\u2013\u2014]/.test(prBody(r, { wrapped: false, reason: "x" })));
});

test("a running control can't be edited, a paused one can", () => {
  const exp = slotToExperiment(SLOTS[1]);
  assert.equal(exp.status, "running");
  const bad = applyAction(exp, { type: "update_variant", variantId: "a", text: "Get your Free AI Score Now" });
  assert.equal(bad.ok, false);
});

import { IMAGE_PATH_RE, validateExperiment } from "../lib/exp/core";
import { checkSuggestion } from "../lib/exp/suggest";

test("every element type is detected", () => {
  assert.equal(kindForElement(el({ tag: "p", text: "A paragraph of plain text" })), "text");
  assert.equal(kindForElement(el({ tag: "li", text: "Fast turnaround" })), "text");
  assert.equal(kindForElement(el({ tag: "span", text: "$1,000 deposit" })), "price");
  assert.equal(kindForElement(el({ tag: "div", text: "From $49 a month" })), "price");
  assert.equal(kindForElement(el({ tag: "a", text: "Pricing" })), "link");
  assert.equal(kindForElement(el({ tag: "input", text: "", placeholder: "Your email address" })), "placeholder");
  assert.equal(kindForElement(el({ tag: "img", text: "", src: "/images/hero.jpg" })), "image");
  assert.equal(kindForElement(el({ tag: "img", text: "", src: "https://x.com/a.jpg" })), null);
  assert.equal(kindForElement(el({ tag: "p", text: "Powered by Saabai.ai" })), null);
  assert.equal(kindForElement(el({ tag: "p", text: "Para", spans: 1 })), null);
  assert.equal(kindForElement(el({ tag: "p", text: "x".repeat(400) })), null);
});

const req = (o: object) => ({ siteKey: "saabai", path: "/", slot: "home.main.text", kind: "text", name: "n", tag: "p", section: "main", control: { text: "Hello there" }, ...o }) as WrapRequest;

test("wrap: paragraph, link, price with entities and line breaks", () => {
  const src = `import x from "y";\nexport default function P(){return (<div><p className="a">\n  Don&apos;t guess   where\n AI fits.\n</p></div>)}`;
  const out = wrapSource(src, req({ control: { text: "Don't guess where AI fits." } }))!;
  assert.ok(out.includes('<ExpText slot="home.main.text">{(v) => (<p className="a" {...v.attrs}>{v.text}</p>)}</ExpText>'));
  assert.ok(out.includes('import ExpText'));
  const l = wrapSource(`<nav><a href="/x">Pricing</a></nav>`, req({ kind: "link", tag: "a", slot: "home.nav.link", control: { text: "Pricing" } }))!;
  assert.ok(l.includes('data-exp-event="cta_click"') && l.includes('href="/x"'));
  const pr = wrapSource(`<span>$49 a month</span>`, req({ kind: "price", slot: "home.main.price", control: { text: "$49 a month" } }))!;
  assert.ok(pr.includes("{v.text}"));
});

test("wrap: image and placeholder keep other attributes", () => {
  const im = wrapSource(`<img src="/a/hero.jpg" alt="Old alt" className="w-full" />`, req({ kind: "image", tag: "img", slot: "home.main.image", control: { text: "/a/hero.jpg", emphasis: "Old alt" } }))!;
  assert.ok(im.includes("src={v.text}") && im.includes("alt={v.emphasis ?? \"\"}") && im.includes('className="w-full"') && im.includes("{...v.attrs}"));
  const nx = wrapSource(`<Image src="/a/hero.jpg" alt="Old" width={10} height={10} />`, req({ kind: "image", tag: "image", slot: "home.main.image", control: { text: "/a/hero.jpg", emphasis: "Old" } }))!;
  assert.ok(nx.includes("<Image") && nx.includes("width={10}"));
  const ph = wrapSource(`<input type="email" placeholder="Your email" />`, req({ kind: "placeholder", tag: "input", slot: "home.main.hint", control: { text: "Your email" } }))!;
  assert.ok(ph.includes("placeholder={v.text}") && ph.includes('type="email"'));
  assert.equal(wrapSource(`<img src="/a.jpg" /><img src="/a.jpg" />`, req({ kind: "image", control: { text: "/a.jpg" } })), null);
  assert.equal(wrapSource(`"use client";\n<input placeholder="Your email" />`, req({ kind: "placeholder", control: { text: "Your email" } })), null);
});

test("kind rules: image paths, price numbers, no AI for price or image", () => {
  assert.ok(IMAGE_PATH_RE.test("/images/a-b.webp"));
  assert.ok(!IMAGE_PATH_RE.test("https://evil.com/a.jpg") && !IMAGE_PATH_RE.test("/a.php"));
  const e = (kind: string, text: string) => validateExperiment({ ...slotToExperiment({ id: "t-one", siteKey: "saabai", slot: "a.b.c", kind: kind as never, name: "n", path: "/", control: { text: "/x.jpg" }, variants: [{ text }] }) });
  assert.ok(e("image", "/y.jpg"));
  assert.equal(e("image", "https://evil.com/y.jpg"), null);
  assert.equal(e("image", "/a/../b.jpg"), null);
  assert.equal(e("price", "Free"), null);
  assert.equal(checkSuggestion({ text: "Cheaper $9", emphasis: "", rationale: "" }, ["$49"], "price"), "no AI suggestions for this type");
  assert.equal(checkSuggestion({ text: "Plans from 99 dollars", emphasis: "", rationale: "" }, ["Plans"], "text"), "number we cannot back up");
  assert.equal(checkSuggestion({ text: "Pick a plan", emphasis: "", rationale: "" }, ["Plans"], "text"), null);
});
