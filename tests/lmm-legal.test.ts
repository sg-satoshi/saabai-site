import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  LMM_AFCA, LMM_LEGAL_IDENTITY, LMM_OAIC, LMM_SITE,
  lmmLegalDocument, lmmLicensingLine, lmmPublicName, prepareLmmHomeHtml,
} from "../lib/lmm-legal";

const home = readFileSync("public/clients/lmm-site/index.html", "utf8");
const served = prepareLmmHomeHtml(home);
const privacy = lmmLegalDocument("privacy");
const complaints = lmmLegalDocument("complaints");

test("unset licence particulars are null and do not render", () => {
  assert.deepEqual(LMM_LEGAL_IDENTITY, {
    entityName: null,
    abn: null,
    aclOrCreditRep: null,
    licenseeOrAggregator: null,
    afcaMemberNo: null,
  });
  assert.equal(lmmPublicName(), "Lifestyle Money Management");
  assert.equal(lmmLicensingLine(), "");
  assert.equal(lmmLicensingLine({
    entityName: "Example Pty Ltd",
    abn: "12 345 678 901",
    aclOrCreditRep: "123456",
    licenseeOrAggregator: "Example Aggregator",
    afcaMemberNo: "99999",
  }), "Lifestyle Money Management is the trading name of Example Pty Ltd (ABN 12 345 678 901). Credit assistance is provided under 123456, authorised through Example Aggregator. AFCA member number: 99999.");
  assert.equal(lmmLicensingLine({ ...LMM_LEGAL_IDENTITY, abn: "   " }), "");
  const hidden = ["[ENTITY NAME]", "[ABN]", "[ACL", "[LICENSEE", "[AFCA", "square brackets", "particulars still", "AFCA member number", "trading name of"];
  for (const page of [served, privacy, complaints]) {
    for (const token of hidden) assert.equal(page.includes(token), false, token);
  }
  const footer = served.slice(served.indexOf('data-lmm-legal="1"'));
  assert.match(footer, /Privacy Policy/);
  assert.match(footer, /Complaints/);
  assert.doesNotMatch(footer.slice(0, 400), /<p>/);
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
