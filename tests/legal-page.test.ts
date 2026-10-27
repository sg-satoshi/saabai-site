import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hidesAnnouncement, isFocusedFormPath } from "../lib/focused-paths";
import { DOCUMENT_TYPES } from "../lib/lex-document-types";

const page = readFileSync("app/legal/page.tsx", "utf8");
const css = readFileSync("app/legal/legal.css", "utf8");
const tools = readFileSync("lib/lex-tools.ts", "utf8");

test("/legal never shows the announcement (countdown) bar; other pages are unchanged", () => {
  for (const p of ["/legal", "/legal/", "/legal?utm=x", "/legal#pricing", "/audit/factfind/abc"]) assert.equal(hidesAnnouncement(p), true, p);
  for (const p of ["/", "/legalese", "/blueprint", "/lex", "/pricing", "", null, undefined]) assert.equal(hidesAnnouncement(p), false, String(p));
  // focused-form behaviour is untouched (Mia and popups still show on /legal)
  assert.equal(isFocusedFormPath("/legal"), false);
});

test("no em or en dashes in the /legal page or its styles", () => {
  assert.ok(!/[\u2012-\u2015]/.test(page), "dash in page.tsx");
  assert.ok(!/[\u2012-\u2015]/.test(css), "dash in legal.css");
});

test("unverified or retired claims are gone", () => {
  for (const bad of [/no hallucinations/i, /australian[- ]hosted/i, /hosted in australia/i, /14[- ]day trial/i, /most popular/i, /court[- ]ready/i, /94%/, /only ai legal tool/i, /firm workspace/i, /Partnership Agreements/, /Loan Agreements/, /Non-Disclosure/, /Contractor/, /Federal Circuit Court/]) {
    // the explanatory code comment may name what is deliberately not claimed
    const visible = page.replace(/\/\*[\s\S]*?\*\//g, "");
    assert.ok(!bad.test(visible), `found ${bad}`);
  }
});

test("prices, GST line and demo CTA are as approved", () => {
  assert.ok(page.includes("$299<small> per month</small>"));
  assert.ok(!page.includes("> /month<") && !page.includes(">/month<") && !page.includes("> /year<"));
  assert.ok(page.includes(">Custom<"));
  assert.ok(page.includes("Prices in AUD. GST not applicable."));
  assert.ok(!page.includes("Tributum"));
  assert.ok(!page.includes("tributumlaw.com"));
  assert.ok(page.includes(">Book a demo</a>"));
  assert.equal((page.match(/lx-plan lx-hi/g) ?? []).length, 1, "exactly one highlighted plan");
  assert.ok(/lx-plan lx-hi">\s*<div className="lx-tier">Firm</.test(page), "Firm is the highlighted plan");
});

test("every document type listed exists in the Lex drafting registry", () => {
  const listed = [...page.matchAll(/^\s+"([^"]+)",$/gm)].map((m) => m[1]).filter((s) => /Deed|BFA|Order|Agreement|Contract|Lease/.test(s));
  assert.equal(listed.length, 10);
  const real = DOCUMENT_TYPES.filter((d) => d.id !== "custom");
  assert.equal(real.length, 10);
  const words = (s: string) => s.toLowerCase().replace(/bfas?/g, "binding financial agreement").replace(/[^a-z ]/g, " ").split(/\s+/).filter((w) => w.length > 3).map((w) => w.replace(/s$/, ""));
  for (const l of listed) {
    const lw = words(l);
    assert.ok(real.some((d) => lw.every((w) => words(d.name).includes(w))), `no Lex document type for "${l}"`);
  }
  assert.ok(DOCUMENT_TYPES.some((d) => d.id === "custom"), "custom drafting exists");
});

test("every source listed has a search tool in lib/lex-tools.ts", () => {
  const need: Record<string, RegExp> = {
    ATO: /"ato\.gov\.au"/,
    "Federal Register of Legislation": /"legislation\.gov\.au"/,
    "Act status": /export async function checkLegislationStatus/,
    ASIC: /"asic\.gov\.au"/,
    "Fair Work Commission": /"fwc\.gov\.au"/,
  };
  const listed = [...page.matchAll(/\{ name: "([^"]+)", note:/g)].map((m) => m[1]);
  assert.deepEqual(listed.sort(), Object.keys(need).sort());
  for (const [k, re] of Object.entries(need)) assert.ok(re.test(tools), `no tool for ${k}`);
});

test("AustLII stays paused on /legal, and case law is described as the licensed snapshot", () => {
  const visible = page.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const disclosed = visible + "\n" + readFileSync("lib/oalc-disclosure.ts", "utf8");
  for (const bad of [/AustLII/, /Administrative Review Tribunal/, /State legislation/, /all 8 jurisdictions/, /all State Supreme Courts/i, /1000\+ databases/i, /All Australian databases/]) {
    assert.ok(!bad.test(visible), `found ${bad}`);
  }
  assert.match(disclosed, /Family Court[\s\S]{0,220}not in this snapshot/);
  assert.match(visible, /OALC_SOURCE_PANEL/);
  assert.match(visible, /cutoff 10 March 2025/);
  assert.match(disclosed, /citation and link only/);
  for (const f of ["lib/seo-entity.ts", "lib/seo-pages.ts"]) assert.ok(!/AustLII/.test(readFileSync(f, "utf8")), f);
});

test("the licensed snapshot does not revive retired case-checking claims", () => {
  const visible = page.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  for (const bad of [/Binding or persuasive/i, /cites the case/i, /Case name and citation/i, /Australian authority comes first/i, /marked as persuasive/i, /not searching (Australian )?case law right now/]) {
    assert.ok(!bad.test(visible), `found ${bad}`);
  }
  assert.match(visible, /licensed snapshot/);
});
