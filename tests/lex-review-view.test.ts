import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildIssues, severityCounts, issuesByClause, clauseIdFromRef, SEVERITY, type ReviewReport } from "../lib/lex-review-display";

const R: ReviewReport = {
  documentType: "Loan agreement", direction: "incoming", actingFor: "borrower", jurisdiction: "South Australia (SA)",
  overallScore: 58, riskLevel: "medium", summary: "One uncapped indemnity.",
  findings: [
    { id: "f1", severity: "minor", axis: "tone", clauseRef: "General", title: "Defined term used inconsistently", issue: "x", recommendation: "y" },
    { id: "f2", severity: "critical", axis: "risk", clauseRef: "Clause 7.2", title: "Indemnity is uncapped", issue: "x", recommendation: "Cap it", redline: "capped at the loan amount" },
  ],
  missingClauses: [{ clause: "Governing law", reason: "No jurisdiction clause", severity: "moderate" }],
  legislationConflicts: [{ ref: "ITAA 1936 s 109N", clauseRef: "cl 4.1", issue: "No minimum yearly repayment" }],
  recommendedActions: ["Cap the indemnity"], wordCount: 2400, clauseCount: 31,
};

test("issues combine findings, missing clauses and legislation, most severe first", () => {
  const issues = buildIssues(R);
  assert.equal(issues.length, 4);
  assert.equal(issues[0].title, "Indemnity is uncapped");
  assert.equal(issues[issues.length - 1].severity, "minor");
  assert.ok(issues.some((i) => i.kind === "missing" && i.title === "Governing law missing"));
  assert.deepEqual(severityCounts(issues), { critical: 1, moderate: 2, minor: 1 });
});

test("clause refs map to document clauses for highlights", () => {
  assert.equal(clauseIdFromRef("Clause 7.2"), "7.2");
  assert.equal(clauseIdFromRef("cl 4.1(b)"), "4.1");
  assert.equal(clauseIdFromRef("General"), undefined);
  const m = issuesByClause(buildIssues(R));
  assert.equal(m.get("7.2")?.[0].severity, "critical");
  assert.equal(m.get("4.1")?.[0].kind, "legislation");
  assert.equal(SEVERITY.critical.label, "High");
});

test("review view: compare uses /api/lex-compare and shows errors, no em dashes, credit kept", () => {
  const view = readFileSync("app/lex/_components/Review.tsx", "utf8");
  assert.match(view, /\/api\/lex-compare/);
  assert.ok(!/catch \{\}/.test(view), "compare must not swallow errors");
  assert.match(view, /setCmpError/);
  for (const f of ["app/lex/_components/Review.tsx", "app/lex/_components/review.css", "app/lex/_components/exportReview.ts", "lib/lex-review-display.ts", "app/lex/page.tsx"]) {
    assert.ok(!readFileSync(f, "utf8").includes("\u2014"), `${f} has an em dash`);
  }
  assert.match(readFileSync("app/lex/_components/exportReview.ts", "utf8"), /Powered by Saabai\.ai/);
  const page = readFileSync("app/lex/page.tsx", "utf8");
  assert.ok(!page.includes("lx-legacy-mode"), "legacy dark review panel still in page.tsx");
  assert.ok(page.includes("<ReviewView"));
  assert.ok(!page.includes('documentType: "comparison"'), "compare must not go through /api/lex-review");
});
