import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FACTFIND_CONSENT_LABEL,
  FACTFIND_INTRO,
  FACTFIND_SECTIONS,
  FACTFIND_SUBMIT_LABEL,
  FACTFIND_THANKS_BODY,
  FACTFIND_THANKS_HEADING,
  START_QUESTION_IDS,
  missingStartAnswers,
  questionsForTier,
  sectionsForTier,
  toPublicQuestion,
  toPublicSection,
  toPublicValue,
} from "../lib/audit-factfind";
import { buildAssessmentPrompt, parseAssessmentText, rankAgainstFrustration } from "../lib/audit-assessment";
import { buildAuditReportDocx, whatYouToldUs } from "../lib/audit-report";
import { demoEngagement, isDemoFactFindToken } from "../lib/audit-factfind-demo";
import { AuditEngagement, AuditOpportunity, AuditTier } from "../lib/audit-types";

const EM = /\u2014/;
const START = Object.values(START_QUESTION_IDS);

test("Start here comes first for every tier, with the three required questions in order", () => {
  for (const t of ["starter", "pro", "business"] as AuditTier[]) {
    assert.equal(sectionsForTier(t)[0].id, "start");
    const qs = questionsForTier(t, "other");
    assert.deepEqual(qs.slice(0, 3).map((q) => q.id), START);
    for (const q of qs.slice(0, 3)) {
      assert.equal(q.required, true);
      assert.equal(q.type, "textarea");
      assert.ok(q.help);
    }
  }
});

test("spec wording is exact", () => {
  const qs = questionsForTier("starter", "other");
  assert.equal(qs[0].label, "What's frustrating you most in your business right now?");
  assert.equal(qs[1].label, "What have you already tried to fix it, and how did it go?");
  assert.equal(qs[2].label, "What do you wish people selling AI or tech understood about your situation?");
  assert.equal(FACTFIND_SUBMIT_LABEL, "Send my answers");
  assert.equal(
    `${FACTFIND_THANKS_HEADING}. ${FACTFIND_THANKS_BODY}`,
    "Thanks. Your answers go straight into your Blueprint. On Pro and Business, I read every one myself before we talk."
  );
  assert.equal(FACTFIND_CONSENT_LABEL, "You can use my words, without my name or business, to help explain what Saabai does.");
  assert.match(FACTFIND_INTRO, /^Hi, I'm Shane\./);
});

test("existing questions are unchanged and still follow the new section", () => {
  const ids = questionsForTier("starter", "other").map((q) => q.id);
  for (const id of ["firm_overview", "team_admin_burden", "tools_pm", "workflow1_name", "pain_biggest", "goals_12mo"]) {
    assert.ok(ids.indexOf(id) > 2, id);
  }
  assert.equal(FACTFIND_SECTIONS.length, 10);
});

test("nothing client-facing shows an em dash", () => {
  const copy = [FACTFIND_INTRO, FACTFIND_CONSENT_LABEL, FACTFIND_SUBMIT_LABEL, FACTFIND_THANKS_HEADING, FACTFIND_THANKS_BODY];
  for (const t of ["starter", "pro", "business"] as AuditTier[]) {
    for (const q of questionsForTier(t, "other").map(toPublicQuestion)) copy.push(q.label, q.help ?? "", ...(q.options ?? []));
    for (const s of sectionsForTier(t).map(toPublicSection)) copy.push(s.title, s.description ?? "");
  }
  for (const c of copy) assert.ok(!EM.test(c), c);
  assert.ok(!("interviewPrompt" in toPublicQuestion(questionsForTier("pro", "other")[0])));
  // stored legacy option values still match the cleaned options on resume
  assert.equal(toPublicValue("Yes — actively hiring"), "Yes, actively hiring");
  assert.equal(toPublicValue("$15k–$30k"), "$15k–$30k");
});

test("required start answers: blank or whitespace is missing", () => {
  assert.deepEqual(missingStartAnswers({}), START);
  assert.deepEqual(
    missingStartAnswers({ start_frustration: "Quotes take days", start_tried: "  ", start_wish: "x" }),
    ["start_tried"]
  );
  assert.deepEqual(missingStartAnswers({ start_frustration: "a", start_tried: "b", start_wish: "c" }), []);
});

test("demo token only works on preview or local dev, never production", () => {
  assert.ok(isDemoFactFindToken("preview-demo", { VERCEL_ENV: "preview" }));
  assert.ok(isDemoFactFindToken("preview-demo-pro", { NODE_ENV: "development" }));
  assert.ok(!isDemoFactFindToken("preview-demo", { VERCEL_ENV: "production", NODE_ENV: "production" }));
  assert.ok(!isDemoFactFindToken("preview-demo", { NODE_ENV: "production" }));
  assert.ok(!isDemoFactFindToken("anything-else", { VERCEL_ENV: "preview" }));
  assert.equal(demoEngagement("preview-demo-business").tier, "business");
});

function eng(tier: AuditTier, withV2 = true): AuditEngagement {
  const now = new Date().toISOString();
  const r = (questionId: string, value: string) => ({ questionId, value, answeredAt: now, mode: "client" as const });
  const responses: AuditEngagement["responses"] = {
    firm_overview: r("firm_overview", "Small accounting practice in Toowoomba"),
    tools_pm: r("tools_pm", "Xero"),
  };
  if (withV2) {
    responses.start_frustration = r("start_frustration", "Chasing clients for documents every BAS quarter");
    responses.start_tried = r("start_tried", "A client portal nobody used");
    responses.start_wish = r("start_wish", "We are not a big firm and cannot babysit software");
  }
  return {
    ...demoEngagement(),
    tier,
    firmName: "Test Accounting",
    responses,
  };
}

test("assessment prompt leads with what they told us and the ranking rules", () => {
  const p = buildAssessmentPrompt(eng("pro"))!;
  assert.match(p, /WHAT THEY TOLD US/);
  assert.match(p, /Chasing clients for documents every BAS quarter/);
  assert.match(p, /Rank opportunities that directly fix answer 1 first/);
  assert.match(p, /fixesMainFrustration/);
  assert.ok(p.indexOf("WHAT THEY TOLD US") < p.indexOf("FACT-FIND RESPONSES"));
  // our own prompt copy has no em dashes (the shared capability matrix text is internal context)
  assert.ok(!EM.test(p.slice(0, p.indexOf("CAPABILITY MATRIX"))));
  assert.ok(!EM.test(p.slice(p.indexOf("\nTASK"))));
  // older fact-finds without v2 answers still build a prompt, without the block
  const old = buildAssessmentPrompt(eng("pro", false))!;
  assert.ok(!/WHAT THEY TOLD US/.test(old));
  assert.equal(buildAssessmentPrompt({ ...eng("pro"), responses: {} }), null);
});

test("opportunities that fix answer 1 are ranked first, and dashes are cleaned", () => {
  const raw = JSON.stringify({
    summary: "Solid base — one big lever",
    avoidRepeating: "No new portal — that failed before",
    concernsNote: "Fair point.",
    opportunities: [
      { title: "Invoice OCR", complexity: "low", fixesMainFrustration: false, costBandAud: "$3k–$5k" },
      { title: "Document chaser", complexity: "medium", fixesMainFrustration: true },
      { title: "Inbox triage", complexity: "low" },
    ],
  });
  const a = parseAssessmentText("```json\n" + raw + "\n```")!;
  assert.deepEqual(a.opportunities.map((o) => [o.rank, o.title]), [[1, "Document chaser"], [2, "Invoice OCR"], [3, "Inbox triage"]]);
  assert.equal(a.opportunities[0].fixesMainFrustration, true);
  assert.equal(a.opportunities[2].fixesMainFrustration, false);
  assert.ok(!EM.test(JSON.stringify(a)));
  assert.equal(a.opportunities[1].costBandAud, "$3k-$5k");
  assert.equal(parseAssessmentText("not json"), null);
  const r = rankAgainstFrustration([{ id: "a", title: "a", description: "", complexity: "low" } as AuditOpportunity]);
  assert.equal(r[0].rank, 1);
});

function docText(paras: ReturnType<typeof whatYouToldUs>): string {
  return JSON.stringify(paras);
}

test("What you told us section: answer 1 quoted, Starter gets a note, Pro/Business get the call", () => {
  const starter = eng("starter");
  starter.assessment = parseAssessmentText(JSON.stringify({ summary: "s", concernsNote: "We keep it simple and set it up for you.", avoidRepeating: "We are not recommending another portal.", opportunities: [] }))!;
  const s = docText(whatYouToldUs(starter));
  assert.match(s, /What you told us/);
  assert.match(s, /Chasing clients for documents every BAS quarter/);
  assert.match(s, /We are not recommending another portal/);
  assert.match(s, /We keep it simple and set it up for you/);
  const pro = docText(whatYouToldUs(eng("pro")));
  assert.match(pro, /walkthrough call/);
  assert.deepEqual(whatYouToldUs(eng("pro", false)), []);
});

test("report docx builds with the new section and no em dashes", async () => {
  const e = eng("business");
  e.assessment = parseAssessmentText(JSON.stringify({ summary: "s", opportunities: [{ title: "Document chaser", fixesMainFrustration: true, costBandAud: "$4k-$6k", complexity: "low" }] }))!;
  const buf = await buildAuditReportDocx(e);
  assert.ok(buf.length > 1000);
  const { default: JSZip } = await import("jszip");
  const xml = await (await JSZip.loadAsync(buf)).file("word/document.xml")!.async("string");
  assert.match(xml, /What you told us/);
  assert.match(xml, /GST not applicable/);
  assert.ok(xml.indexOf("What you told us") < xml.indexOf("Engagement Snapshot"));
  assert.ok(!EM.test(xml));
});
