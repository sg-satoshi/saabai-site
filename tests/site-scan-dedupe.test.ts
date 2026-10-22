import test from "node:test";
import assert from "node:assert/strict";
import { normaliseScanUrl, dedupeTargets, domainKey, planDomainCleanup, slugify } from "../lib/site-scan/targets";
import { subSitePath } from "../lib/site-scan/scan";

test("normalises URLs: host case, www, decoding, slugified /sites/, trailing slash", () => {
  assert.equal(normaliseScanUrl("https://www.saabai.ai/sites/Tributum%20Law/"), "https://www.saabai.ai/sites/tributum-law/");
  assert.equal(normaliseScanUrl("https://SAABAI.AI/sites/heaven-thai-massage"), "https://www.saabai.ai/sites/heaven-thai-massage/");
  assert.equal(normaliseScanUrl("https://www.NicoMoretti.au/about"), "https://nicomoretti.au/");
  assert.equal(normaliseScanUrl("ftp://x.com"), null);
  assert.equal(normaliseScanUrl("not a url"), null);
  assert.equal(slugify("Tributum Law"), "tributum-law");
  assert.equal(subSitePath(new URL("https://www.saabai.ai/sites/Tributum%20Law/")), "/sites/tributum-law");
});

test("factory list: one row per site, bad slug merged, live vs preview labelled", () => {
  const rows = dedupeTargets([
    { slug: "heaven-thai-massage", name: "heaven-thai-massage", url: "https://www.saabai.ai/sites/heaven-thai-massage/" },
    { slug: "heaven-thai-massage", name: "Heaven Thai Massage", url: "https://www.saabai.ai/sites/heaven-thai-massage/" },
    { slug: "x", name: "Heaven Thai Massage", url: "https://saabai.ai/sites/heaven-thai-massage" },
    { slug: "tributum-law", name: "Tributum Law", url: "https://www.saabai.ai/sites/tributum-law/" },
    { slug: "Tributum Law", name: "Tributum Law", url: "https://www.saabai.ai/sites/Tributum Law/" },
    { slug: "nico-moretti", name: "Nico Moretti", url: "https://www.saabai.ai/sites/nico-moretti/" },
    { slug: "nico", name: "Nico Moretti", url: "https://nicomoretti.au" },
  ]);
  assert.equal(rows.length, 4);
  assert.equal(rows.find((r) => r.url.includes("heaven"))?.name, "Heaven Thai Massage");
  assert.ok(rows.every((r) => !/\s|%20|[A-Z]/.test(r.url)));
  assert.deepEqual(rows.filter((r) => r.name === "Nico Moretti").map((r) => r.kind).sort(), ["live", "preview"]);
});

test("history keys: canonical kept, case/encoded duplicates merged, invalid dropped", () => {
  assert.equal(domainKey("https://www.saabai.ai/sites/Tributum%20Law/"), "saabai.ai/sites/tributum-law");
  const known = new Set(["saabai.ai/sites/tributum-law", "saabai.ai/sites/heaven-thai-massage"]);
  const p = planDomainCleanup(["saabai.ai/sites/tributum-law", "saabai.ai/sites/Tributum", "saabai.ai/sites/Heaven-Thai-Massage", "nicomoretti.au", "NicoMoretti.au", "saabai.ai/sites/%20"], known);
  assert.deepEqual(p.keep, ["saabai.ai/sites/tributum-law", "nicomoretti.au"]);
  assert.deepEqual(p.merge, [{ from: "saabai.ai/sites/Heaven-Thai-Massage", to: "saabai.ai/sites/heaven-thai-massage" }, { from: "NicoMoretti.au", to: "nicomoretti.au" }]);
  assert.deepEqual(p.drop, ["saabai.ai/sites/Tributum", "saabai.ai/sites/%20"]);
});
