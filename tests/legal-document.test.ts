import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync("app/components/sb/sb.css", "utf8");
const layout = readFileSync("app/components/LegalDocument.tsx", "utf8");
const terms = readFileSync("app/terms/page.tsx", "utf8");
const privacy = readFileSync("app/privacy/page.tsx", "utf8");

test("legal clauses opt out of the page-band section padding that opened the gaps", () => {
  assert.match(css, /\.sb section\{padding:96px 0\}/);
  assert.match(css, /\.sb \.card\.legal section\{padding:0\}/);
  assert.match(layout, /className="card legal"/);
  assert.match(layout, /padding: 0/);
  assert.doesNotMatch(layout, /white-space:\s*pre/);
});

test("terms and privacy share one layout and keep their own wording", () => {
  assert.match(terms, /LegalDocument/);
  assert.match(privacy, /LegalDocument/);
  assert.match(terms, /title="Terms"/);
  assert.match(terms, /General terms\. Last updated: October 2026/);
  assert.match(privacy, /title="Privacy Policy"/);
  assert.match(privacy, /lede="Last updated: 27 October 2026"/);
  assert.match(privacy, /1\. About this policy/);
  assert.match(privacy, /sb_attr/);
  assert.match(privacy, /sb_exp/);
  assert.match(privacy, /SaabaiScanner/);
  assert.doesNotMatch(privacy, /#fff/);
  assert.doesNotMatch(privacy, /Back to Saabai/);
  for (const src of [layout, terms, privacy]) {
    assert.ok(!/[\u2012-\u2015]/.test(src), "em or en dash");
  }
});

test("the legal layout is not mounted on client sites", () => {
  assert.doesNotMatch(layout, /\/sites\//);
  assert.doesNotMatch(terms, /sites\//);
  assert.doesNotMatch(privacy, /sites\//);
});
