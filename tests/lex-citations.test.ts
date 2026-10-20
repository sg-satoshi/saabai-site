/**
 * Lex citation backend (B0). No network: fetch is stubbed, models are mocked.
 *   npx tsx --test tests/lex-citations.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MockLanguageModelV3 } from "ai/test";
import {
  SourceRegistry, classifySource, isAllowedSourceUrl, fetchSourceText, htmlToText, parsePinpoint, findPinpoint,
  parseMarkers, renderMarkers, stripMarkers, verifyCitations, CITATION_RULES, MAX_READS_PER_ANSWER,
} from "../lib/lex-sources";
import { withSourceRegistry, buildLexResearchTools } from "../lib/lex-research-tools";
import { tightenConclusions, buildAnswerMeta } from "../lib/lex-answer-meta";
import { getLexConfig } from "../lib/lex-config";

const CASE = "https://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/HCA/2004/26.html";
const FCA = "https://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/FCA/2019/1.html";
const ART = "https://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/ARTA/2025/100.html";
const AAT = "https://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/AATA/2020/5.html";
const LEG = "https://www.legislation.gov.au/C2004A07990/latest/text";
const TR = "https://www.ato.gov.au/law/view/document?docid=TXR/TR20224/NAT/ATO/00001";
const PCG = "https://www.ato.gov.au/law/view/document?docid=COG/PCG20222/NAT/ATO/00001";

test("source type and authority come from the URL, not the model", () => {
  assert.deepEqual([classifySource(CASE).type, classifySource(CASE).authority], ["case", "binding"]);
  assert.equal(classifySource(FCA).authority, "persuasive");
  assert.equal(classifySource(ART).typeLabel, "Tribunal decision, ART");
  assert.equal(classifySource(AAT).typeLabel, "Tribunal decision, former AAT");
  assert.equal(classifySource(LEG).type, "legislation");
  assert.equal(classifySource("https://www.austlii.edu.au/au/legis/cth/consol_act/itaa1936240/s109d.html").type, "legislation");
  assert.equal(classifySource(TR).type, "ato_ruling");
  assert.equal(classifySource(PCG).type, "ato_guidance");
  assert.equal(classifySource("https://asic.gov.au/regulatory-resources/rg-1").type, "regulator");
  assert.equal(classifySource("https://www.bailii.org/uk/cases/UKHL/1932/100.html").type, "foreign");
  assert.equal(classifySource("https://someblog.com.au/div7a").type, "secondary");
});

test("registry gives stable ids, dedupes by URL and returns ids to the model", () => {
  const reg = new SourceRegistry();
  const out = reg.register({ query: "q", source: "AustLII", results: [{ title: "Hart", url: CASE, snippet: "x", source: "AustLII" }, { title: "Hart again", url: CASE.replace("https://www.", "http://"), snippet: "y", source: "AustLII" }, { title: "TR", url: TR, snippet: "z", source: "ATO" }] }, "searchAustLII");
  assert.deepEqual(out.results.map((r) => (r as { id?: string }).id), ["S1", "S1", "S2"]);
  assert.equal((out.results[2] as { type?: string }).type, "ATO public ruling");
  assert.equal(reg.list().length, 2);
});

test("readSource allowlist: https legal sites only, no credentials, no other ports", () => {
  for (const u of [CASE, LEG, TR, "https://classic.austlii.edu.au/x", "https://www.fwc.gov.au/x", "https://www.art.gov.au/x"]) assert.ok(isAllowedSourceUrl(u), u);
  for (const u of ["http://www.austlii.edu.au/x", "https://evil.com/austlii.edu.au", "https://austlii.edu.au.evil.com/", "https://user:pw@www.ato.gov.au/", "https://www.ato.gov.au:8443/", "https://169.254.169.254/", "file:///etc/passwd", "https://localhost/"]) assert.ok(!isAllowedSourceUrl(u), u);
});

test("fetchSourceText refuses redirects off the allowlist and non-HTML", async () => {
  const redirectOut = async () => new Response(null, { status: 302, headers: { location: "https://evil.com/x" } });
  const r1 = await fetchSourceText(CASE, redirectOut);
  assert.ok(!r1.ok && /not on Lex's list/.test(r1.error));
  const pdf = async () => new Response("%PDF", { status: 200, headers: { "content-type": "application/pdf" } });
  assert.ok(!(await fetchSourceText(CASE, pdf)).ok);
  const html = async () => new Response(`<html><head><title>t</title></head><body><nav>menu</nav><p>[40] Earlier.</p><p>[41] The dominant purpose is assessed objectively &amp; by reference to the eight matters.</p>${"<p>filler text here</p>".repeat(20)}</body></html>`, { status: 200, headers: { "content-type": "text/html" } });
  const r3 = await fetchSourceText(CASE, html);
  assert.ok(r3.ok);
  if (r3.ok) { assert.ok(r3.text.includes("[41] The dominant purpose is assessed objectively & by")); assert.ok(!r3.text.includes("menu")); }
});

test("pinpoints: paragraphs and sections are found in the real text", () => {
  assert.deepEqual(parsePinpoint("para 41"), { kind: "para", value: "41" });
  assert.deepEqual(parsePinpoint("at [41]"), { kind: "para", value: "41" });
  assert.deepEqual(parsePinpoint("s 109D(1)"), { kind: "section", value: "109D" });
  assert.deepEqual(parsePinpoint("section 284-90"), { kind: "section", value: "284-90" });
  assert.equal(parsePinpoint("p 12").kind, "page");
  const judgment = htmlToText("<p>[40] a</p><p>[41] b</p>");
  assert.ok(findPinpoint(judgment, "para 41").found);
  assert.ok(!findPinpoint(judgment, "para 4").found, "[4] is not [41]");
  assert.ok(!findPinpoint(judgment, "para 141").found);
  const act = "109C Payments treated as dividends\n109D Loans treated as dividends\n(1) A private company is taken to pay";
  assert.ok(findPinpoint(act, "s 109D").found);
  assert.ok(!findPinpoint(act, "s 109E").found);
});

test("markers parse, render as [n] pinpoint, and are stripped from history", () => {
  const text = "Loans are deemed dividends [[cite:S2|s 109D(1)]]. Purpose is objective [[cite:S1|para 41]] and see also [[cite:S2|s 109D(1)]]. Folklore [[cite:none]].";
  const marks = parseMarkers(text);
  assert.equal(marks.length, 4);
  const reg = new SourceRegistry();
  reg.add({ title: "Hart", url: CASE, snippet: "" }, "searchAustLII");
  reg.add({ title: "ITAA 1936", url: LEG, snippet: "" }, "searchLegislation");
  reg.setText("S1", "[40] x\n[41] objective");
  const cites = verifyCitations(text, reg);
  assert.deepEqual(cites.map((c) => [c.n, c.id, c.status]), [[1, "S2", "not_checked"], [2, "S1", "verified"], [0, null, "no_source"]]);
  assert.equal(renderMarkers(text, cites), "Loans are deemed dividends [1 s 109D]. Purpose is objective [2 at [41]] and see also [1 s 109D]. Folklore [unverified].");
  assert.equal(stripMarkers(text), "Loans are deemed dividends. Purpose is objective and see also. Folklore.");
});

test("verification catches invented ids and wrong pinpoints", () => {
  const reg = new SourceRegistry();
  reg.add({ title: "Hart", url: CASE, snippet: "" }, "searchAustLII");
  reg.setText("S1", "[1] a\n[2] b");
  const cites = verifyCitations("A [[cite:S9|para 3]]. B [[cite:S1|para 41]].", reg);
  assert.equal(cites[0].status, "unknown_source");
  assert.equal(cites[1].status, "pinpoint_not_found");
});

test("wrapped tools register results, readSource reads by id with a read limit, verifySection reads the Act", async () => {
  const reg = new SourceRegistry();
  const pages: Record<string, string> = { [LEG]: "109D Loans treated as dividends\n(1) A private company is taken to pay a dividend" + " x".repeat(200), [CASE]: "[41] objective" + " y".repeat(200) };
  const read = async (u: string) => (pages[u] ? { ok: true as const, text: pages[u] } : { ok: false as const, error: "HTTP 404" });
  const base = { searchLegislation: { description: "d", execute: async () => ({ query: "q", source: "L", results: [{ title: "ITAA 1936", url: LEG, snippet: "", source: "L" }] }) },
    verifySection: { description: "v", execute: async () => ({ query: "q", source: "L", results: [{ title: "ITAA 1936", url: LEG, snippet: "", source: "L" }] }) },
    searchAustLII: { description: "a", execute: async () => ({ query: "q", source: "A", results: [{ title: "Hart", url: CASE, snippet: "", source: "A" }, { title: "x", url: "https://someblog.com.au/p", snippet: "", source: "A" }] }) } };
  const t = withSourceRegistry(base, reg, read) as unknown as Record<string, { execute: (i: unknown, o: unknown) => Promise<Record<string, unknown>> }>;
  const r1 = await t.searchLegislation.execute({}, {});
  assert.equal((r1.results as { id: string }[])[0].id, "S1");
  const vs = await t.verifySection.execute({ act: "ITAA 1936", section: "109D" }, {});
  assert.deepEqual([(vs.sectionCheck as { found: boolean }).found, (vs.sectionCheck as { id: string }).id], [true, "S1"]);
  await t.searchAustLII.execute({}, {});
  const rs = await t.readSource.execute({ id: "S2", pinpoint: "para 41" }, {});
  assert.equal(rs.pinpointFound, true);
  assert.equal((await t.readSource.execute({ id: "S3" }, {})).ok, false, "blog is not on the read list");
  assert.equal((await t.readSource.execute({ id: "S77" }, {})).ok, false, "unknown id");
  assert.ok(MAX_READS_PER_ANSWER >= 2 && MAX_READS_PER_ANSWER <= 6);
  // the real research tool set gains readSource and keeps the rest
  const real = withSourceRegistry(buildLexResearchTools(getLexConfig()), new SourceRegistry());
  assert.ok("readSource" in real && "searchART" in real && "verifySection" in real);
});

test("confidence is tightened by rules: unsupported is low, unverified or persuasive caps at moderate", () => {
  const reg = new SourceRegistry();
  reg.add({ title: "Hart", url: CASE, snippet: "" }, "a");
  reg.add({ title: "FCA", url: FCA, snippet: "" }, "a");
  reg.setText("S1", "[41] x"); reg.setText("S2", "[3] y");
  const cites = verifyCitations("A [[cite:S1|para 41]]. B [[cite:S2|para 3]].", reg);
  const out = tightenConclusions([
    { text: "Rule \u2014 settled", confidence: "high", basis: "HCA", citeIds: ["s1"] },
    { text: "Persuasive", confidence: "high", basis: "FCA", citeIds: ["S2"] },
    { text: "Made up", confidence: "high", basis: "memory", citeIds: ["S9"] },
  ], reg, cites);
  assert.deepEqual(out.map((c) => c.confidence), ["high", "moderate", "low"]);
  assert.equal(out[0].citeIds[0], "S1");
  assert.ok(!/[\u2012-\u2015]/.test(out[0].text), "no em dashes in conclusions");
});

test("buildAnswerMeta: schema-checked output from the model; bad output degrades to a warning, never throws", async () => {
  const reg = new SourceRegistry();
  reg.add({ title: "Hart", url: CASE, snippet: "" }, "a");
  reg.setText("S1", "[41] x");
  const good = new MockLanguageModelV3({ doGenerate: async () => ({
    content: [{ type: "text", text: JSON.stringify({ conclusions: [{ text: "Purpose is objective.", confidence: "high", basis: "High Court", citeIds: ["S1"] }], verify: ["Check the facts"] }) }],
    finishReason: { unified: "stop", raw: "stop" }, usage: { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 10, text: 10, reasoning: 0 } }, warnings: [],
  }) } as never);
  const meta = await buildAnswerMeta(good as never, "Purpose is objective [[cite:S1|para 41]].", reg);
  assert.equal(meta.conclusions[0].confidence, "high");
  assert.equal(meta.counts.verified, 1);
  assert.equal(meta.sources[0].id, "S1");
  const bad = new MockLanguageModelV3({ doGenerate: async () => ({
    content: [{ type: "text", text: JSON.stringify({ conclusions: [{ text: "x", confidence: "certain" }] }) }],
    finishReason: { unified: "stop", raw: "stop" }, usage: { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } }, warnings: [],
  }) } as never);
  const m2 = await buildAnswerMeta(bad as never, "A [[cite:S1|para 41]].", reg);
  assert.equal(m2.conclusions.length, 0);
  assert.ok(m2.verify.some((v) => /could not run/.test(v)));
});

test("route wiring: citation rules in the prompt, registry, meta part, em dash filter, longer time limit", () => {
  const src = readFileSync("app/api/lex-research/route.ts", "utf8");
  for (const s of ["CITATION_RULES", "withSourceRegistry", "data-lex-sources", "buildAnswerMeta", "noDashesTransform", "stripMarkers", "maxDuration = 180"]) assert.ok(src.includes(s), s);
  assert.ok(!/[\u2012-\u2015]/.test(CITATION_RULES));
  for (const f of ["lib/lex-sources.ts", "lib/lex-answer-meta.ts"]) assert.ok(!/[\u2014\u2013]/.test(readFileSync(f, "utf8")), f);
});
