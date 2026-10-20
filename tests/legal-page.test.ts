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
  for (const bad of [/no hallucinations/i, /australian[- ]hosted/i, /hosted in australia/i, /14[- ]day trial/i, /most popular/i, /court[- ]ready/i, /94%/, /only ai legal tool/i, /firm workspace/i, /Partnership Agreements/, /Loan Agreements/, /Non-Disclosure/, /Contractor/, /Federal Circuit/]) {
    // the explanatory code comment may name what is deliberately not claimed
    const visible = page.replace(/\/\*[\s\S]*?\*\//g, "");
    assert.ok(!bad.test(visible), `found ${bad}`);
  }
});

test("prices, GST line, demo CTA and Tributum line are as approved", () => {
  assert.ok(page.includes("$299<small> /month</small>"));
  assert.ok(page.includes(">Custom<"));
  assert.ok(page.includes("Prices in AUD. GST not applicable."));
  assert.ok(page.includes("Tributum Law, an Adelaide, South Australia ATO dispute and tax law firm, uses Lex for legal research."));
  assert.ok(page.includes('href="https://tributumlaw.com"'));
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
    AustLII: /"austlii\.edu\.au"/,
    ATO: /"ato\.gov\.au"/,
    "Federal Register of Legislation": /"legislation\.gov\.au"/,
    "State legislation": /NT: "nt\/legis"/,
    ASIC: /"asic\.gov\.au"/,
    "Administrative Review Tribunal": /cases\/cth\/ARTA/,
    "Fair Work Commission": /"fwc\.gov\.au"/,
    "Family Court of Australia": /cases\/cth\/famca"/,
  };
  const listed = [...page.matchAll(/\{ name: "([^"]+)", note:/g)].map((m) => m[1]);
  assert.deepEqual(listed.sort(), Object.keys(need).sort());
  for (const [k, re] of Object.entries(need)) assert.ok(re.test(tools), `no tool for ${k}`);
});
