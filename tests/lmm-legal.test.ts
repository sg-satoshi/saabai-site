import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  LMM_AFCA, LMM_LEGAL_IDENTITY, LMM_OAIC, LMM_PLACEHOLDERS, LMM_SITE,
  lmmLegalDocument, lmmLicensingLine, prepareLmmHomeHtml,
} from "../lib/lmm-legal";

const home = readFileSync("public/clients/lmm-site/index.html", "utf8");
const served = prepareLmmHomeHtml(home);
const privacy = lmmLegalDocument("privacy");
const complaints = lmmLegalDocument("complaints");

test("unpublished licence particulars live in one config", () => {
  assert.deepEqual([...LMM_PLACEHOLDERS], [
    "[ENTITY NAME]",
    "[ABN]",
    "[ACL / Credit Rep No.]",
    "[LICENSEE / AGGREGATOR]",
    "[AFCA Member No.]",
  ]);
  assert.deepEqual(Object.values(LMM_LEGAL_IDENTITY), [...LMM_PLACEHOLDERS]);
  for (const token of LMM_PLACEHOLDERS) {
    assert.equal((lmmLicensingLine().match(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length, 1, token);
    assert.ok(served.includes(token), `home footer missing ${token}`);
    assert.ok(privacy.includes(token), `privacy missing ${token}`);
    assert.ok(complaints.includes(token), `complaints missing ${token}`);
  }
});

test("the LMM home page links to privacy and complaints and has no draft quotes", () => {
  assert.match(home, /<!-- LMM-LEGAL-FOOTER -->/);
  assert.match(served, /href="\/sites\/lmm-site\/privacy"/);
  assert.match(served, /href="\/sites\/lmm-site\/complaints"/);
  assert.match(served, /data-lmm-path="\/privacy"/);
  assert.match(served, /data-lmm-path="\/complaints"/);
  assert.match(served, /id="lmm-legal-paths"/);
  assert.doesNotMatch(served, /Prototype testimonials|Draft client quote|#testimonials|Testimonials hidden/);
  assert.doesNotMatch(home, /Prototype testimonials|Draft client quote|#testimonials/);
  assert.equal(prepareLmmHomeHtml(served), served);
});

test("privacy policy covers the broker duties the page is there for", () => {
  for (const phrase of [
    "Privacy Act 1988",
    "Australian Privacy Principles",
    "Part IIIA",
    "Credit Reporting Privacy Code",
    "website enquiry form",
    "Zara chatbot",
    "lenders",
    "credit reporting bod",
    "United States",
    "Australian Privacy Principle 8",
    "Access and correction",
    "bank details, tax file numbers",
    LMM_SITE.email,
    LMM_SITE.phoneDisplay,
    LMM_OAIC.websiteDisplay,
    LMM_OAIC.phoneDisplay,
    LMM_OAIC.post,
    "1 business day",
    "30 calendar days",
  ]) {
    assert.ok(privacy.includes(phrase), phrase);
  }
  assert.doesNotMatch(privacy, /GPO Box 5218/);
  assert.doesNotMatch(privacy, /enquiries@oaic\.gov\.au/);
});

test("complaints page states RG 271 timeframes and real AFCA and OAIC contacts", () => {
  for (const phrase of [
    "Regulatory Guide 271",
    "within 1 business day",
    "within 30 calendar days",
    LMM_SITE.email,
    LMM_SITE.phoneDisplay,
    LMM_AFCA.websiteDisplay,
    LMM_AFCA.email,
    LMM_AFCA.phoneDisplay,
    LMM_AFCA.post,
    LMM_OAIC.post,
    LMM_OAIC.phoneDisplay,
    "Nick Foale",
  ]) {
    assert.ok(complaints.includes(phrase), phrase);
  }
  assert.match(complaints, /href="\/sites\/lmm-site\/privacy"/);
});

test("the site routes serve the prepared home page and the two legal documents", () => {
  const homeRoute = readFileSync("app/sites/[slug]/route.ts", "utf8");
  const pageRoute = readFileSync("app/sites/[slug]/[page]/route.ts", "utf8");
  assert.match(homeRoute, /prepareLmmHomeHtml/);
  assert.match(pageRoute, /lmmLegalDocument/);
  assert.match(pageRoute, /page === "privacy" \|\| page === "complaints"/);
});
