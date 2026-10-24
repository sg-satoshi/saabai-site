import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { SourceRegistry, verifyCitations, buildMeta } from "../lib/lex-sources";
import { splitCitations, plainAnswer, citedSources, authorityBadge, sourceGroup, answerWithSources, citeLabel } from "../lib/lex-cite-display";

function fixture() {
  const reg = new SourceRegistry();
  reg.add({ title: "Income Tax Assessment Act 1936 s 109D", url: "https://www.legislation.gov.au/C1936A00027/latest/text", snippet: "loan treated as dividend" }, "searchLegislation");
  reg.add({ title: "Commissioner of Taxation v Example [2020] FCAFC 1", url: "https://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/FCAFC/2020/1.html", snippet: "actually paid" }, "searchAustLII");
  reg.add({ title: "Practice note on Division 7A", url: "https://example.com.au/div7a", snippet: "commentary" }, "searchATO");
  reg.setText("S1", "109D Loans treated as dividends (1) A private company is taken to pay a dividend ...");
  reg.setText("S2", "[40] Earlier.\n[41] The repayment must actually be made.");
  const text = "A loan can be a dividend [[cite:S1|s 109D]]. A journal entry is not enough [[cite:S2|para 41]]. Commentary agrees [[cite:S3]]. A guess [[cite:none]].";
  const cites = verifyCitations(text, reg);
  return { text, meta: buildMeta(reg, cites, [], []) };
}

test("chips read [n] at [41], never the nested [1 at [41]]", () => {
  const { text, meta } = fixture();
  const segs = splitCitations(text, meta.citations);
  const labels = segs.filter((s) => s.kind === "cite").map((s) => (s.kind === "cite" ? s.label : ""));
  assert.deepEqual(labels, ["[1] s 109D", "[2] at [41]", "[3]"]);
  const plain = plainAnswer(text, meta.citations);
  assert.ok(plain.includes("[2] at [41]."), plain);
  assert.ok(!/\[\d+ at \[/.test(plain), plain);
  assert.ok(plain.includes("[unverified]"));
  assert.equal(citeLabel(4, "para 22"), "[4] at [22]");
});

test("statuses carry through: verified pinpoints and unchecked sources", () => {
  const { text, meta } = fixture();
  const segs = splitCitations(text, meta.citations).filter((s) => s.kind === "cite");
  assert.deepEqual(segs.map((s) => (s.kind === "cite" ? s.status : "")), ["verified", "verified", "not_checked"]);
});

test("while streaming, markers are hidden and a half-written marker is dropped", () => {
  const segs = splitCitations("The rule applies [[cite:S1|s 109D]] and also [[cite:S2|par", []);
  const out = segs.map((s) => (s.kind === "text" ? s.text : "#")).join("");
  assert.equal(out, "The rule applies  and also ");
  assert.ok(!segs.some((s) => s.kind === "cite"));
});

test("unknown ids show as unverified, not as a numbered chip", () => {
  const reg = new SourceRegistry();
  const text = "Something [[cite:S9|para 3]].";
  const cites = verifyCitations(text, reg);
  const segs = splitCitations(text, cites);
  assert.ok(segs.some((s) => s.kind === "unsourced"));
  assert.ok(!segs.some((s) => s.kind === "cite"));
});

test("cited sources are numbered in citation order with pinpoints; badges follow authority", () => {
  const { meta } = fixture();
  const { cited } = citedSources(meta);
  assert.deepEqual(cited.map((s) => [s.n, s.id]), [[1, "S1"], [2, "S2"], [3, "S3"]]);
  assert.deepEqual(cited[1].pinpoints, ["para 41"]);
  assert.equal(authorityBadge(cited[0]).label, "Primary legislation");
  assert.equal(authorityBadge(cited[1]).label, "Binding court");
  assert.equal(sourceGroup(cited[1]), "cases");
  assert.equal(sourceGroup(cited[2]), "other");
});

test("copy with citations adds a numbered source list", () => {
  const { text, meta } = fixture();
  const out = answerWithSources(text, meta);
  assert.match(out, /\n\nSources\n\[1\] Income Tax Assessment Act 1936 s 109D\. Primary legislation\. Verified in source\./);
  assert.match(out, /\[3\] Practice note on Division 7A\. .*Not checked\./);
});

test("old answers without meta render as plain text", () => {
  assert.equal(plainAnswer("Plain old answer [[cite:S1|para 2]]."), "Plain old answer.");
});

test("no em or en dashes in Lex interface copy", () => {
  const files = ["app/lex/page.tsx", "app/lex/layout.tsx", "lib/lex-cite-display.ts", ...readdirSync("app/lex/_components").map((f) => join("app/lex/_components", f))];
  for (const f of files) {
    // Strip comment rules made of box-drawing characters, then look for real dashes.
    const src = readFileSync(f, "utf8");
    assert.ok(!/[\u2013\u2014]/.test(src), `${f} contains an em or en dash`);
  }
});

test("no countdown or promo banner inside Lex", () => {
  const src = readFileSync("app/lex/page.tsx", "utf8") + readdirSync("app/lex/_components").map((f) => readFileSync(join("app/lex/_components", f), "utf8")).join("");
  assert.ok(!/AnnouncementBar|Countdown|20OFF/i.test(src));
  assert.ok(src.includes("Powered by Saabai.ai"));
});
