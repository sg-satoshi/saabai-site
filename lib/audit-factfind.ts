/**
 * AI Audit Fact-Find — single question engine, two surfaces:
 *  - Client mode: public tokenised form (pre-audit questionnaire)
 *  - Interview mode: same questions inside admin with follow-up prompts,
 *    used as the discovery-session script.
 *
 * Questions are tier-aware (Essential asks less than Enterprise) and can be
 * restricted by firm type.
 */

import { AuditTier, FirmType } from "./audit-types";

export type QuestionType =
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "number"
  | "scale"; // 1–5

export interface FactFindQuestion {
  id: string;
  section: string; // section id
  label: string;
  help?: string;
  type: QuestionType;
  options?: string[];
  tiers: AuditTier[];
  firmTypes?: FirmType[]; // omit = all firm types
  required?: boolean;
  /** Shown only in interview mode — follow-up guidance for the discovery session. */
  interviewPrompt?: string;
}

export interface FactFindSection {
  id: string;
  title: string;
  description?: string;
  tiers: AuditTier[];
}

const ALL: AuditTier[] = ["essential", "professional", "enterprise"];
const PRO_ENT: AuditTier[] = ["professional", "enterprise"];
const ENT: AuditTier[] = ["enterprise"];

export const FACTFIND_SECTIONS: FactFindSection[] = [
  {
    id: "firm",
    title: "Your Firm",
    description: "The basics so we understand your operation.",
    tiers: ALL,
  },
  {
    id: "team",
    title: "Team & Roles",
    description: "Who does what, and where the hours go.",
    tiers: ALL,
  },
  {
    id: "tools",
    title: "Tools & Systems",
    description: "The software your firm runs on today.",
    tiers: ALL,
  },
  {
    id: "workflows",
    title: "Core Workflows",
    description:
      "The repetitive processes that consume the most time. Be specific — this is where we find the highest-ROI opportunities.",
    tiers: ALL,
  },
  {
    id: "pain",
    title: "Bottlenecks & Frustrations",
    description: "What slows you down, what gets dropped, what costs you.",
    tiers: ALL,
  },
  {
    id: "goals",
    title: "Goals & Success Criteria",
    description: "What a win looks like for you, in your words.",
    tiers: ALL,
  },
  {
    id: "data",
    title: "Data, Documents & Compliance",
    description: "How information moves through your firm, and what constrains it.",
    tiers: PRO_ENT,
  },
  {
    id: "readiness",
    title: "AI Readiness",
    description: "Where you are with AI today, and your appetite.",
    tiers: ALL,
  },
  {
    id: "strategy",
    title: "Strategy & Growth",
    description: "The bigger picture — direction, competition, and capacity.",
    tiers: ENT,
  },
];

/** Builds the 3 structured workflow blocks (all tiers). */
function workflowBlock(n: number): FactFindQuestion[] {
  const req = n === 1; // only the first workflow is required
  return [
    {
      id: `workflow${n}_name`,
      section: "workflows",
      label: `Workflow ${n}: What is it?`,
      help: "e.g. Client intake, monthly BAS prep, lease renewals, file opening",
      type: "text",
      tiers: ALL,
      required: req,
      interviewPrompt:
        "Get the workflow's trigger (what starts it) and end-state (when is it 'done'). Walk through it step by step.",
    },
    {
      id: `workflow${n}_description`,
      section: "workflows",
      label: `Workflow ${n}: Describe the steps as you do them today`,
      help: "Who does what, in what order, using which tools.",
      type: "textarea",
      tiers: ALL,
      required: req,
      interviewPrompt:
        "Probe handoffs between people — handoffs are where time dies. Ask: where does this sit waiting, and for how long?",
    },
    {
      id: `workflow${n}_hours`,
      section: "workflows",
      label: `Workflow ${n}: Roughly how many hours per week does this consume across the firm?`,
      type: "number",
      tiers: ALL,
      required: req,
      interviewPrompt:
        "People underestimate. Cross-check: times per week × people involved × minutes each. Recalculate live with them.",
    },
    {
      id: `workflow${n}_pain`,
      section: "workflows",
      label: `Workflow ${n}: How painful is it? (1 = mild annoyance, 5 = major problem)`,
      type: "scale",
      tiers: ALL,
      interviewPrompt:
        "If 4–5, ask what it has actually cost them — a lost client, a missed deadline, staff turnover. Capture the story.",
    },
  ];
}

export const FACTFIND_QUESTIONS: FactFindQuestion[] = [
  // ── Firm ──────────────────────────────────────────────────────────────
  {
    id: "firm_overview",
    section: "firm",
    label: "In a couple of sentences, what does your firm do and for whom?",
    type: "textarea",
    tiers: ALL,
    required: true,
    interviewPrompt:
      "Listen for their highest-value client type — automation should protect time spent on these clients.",
  },
  {
    id: "firm_staff_count",
    section: "firm",
    label: "How many people work in the firm (including you)?",
    type: "number",
    tiers: ALL,
    required: true,
  },
  {
    id: "firm_departments",
    section: "firm",
    label: "What are the main departments or teams?",
    help: "e.g. Property, Litigation, Bookkeeping, Admin/Reception",
    type: "textarea",
    tiers: PRO_ENT,
    interviewPrompt:
      "Sketch an org map as they talk. Identify which department heads to interview.",
  },
  {
    id: "firm_revenue_model",
    section: "firm",
    label: "How do you primarily bill?",
    type: "select",
    options: [
      "Hourly / time-based",
      "Fixed fee",
      "Retainer / subscription",
      "Commission",
      "Mixed",
    ],
    tiers: ALL,
    interviewPrompt:
      "Hourly billers: automation converts saved time into capacity, not directly into revenue — frame ROI as capacity for higher-value work or more clients.",
  },

  // ── Team ──────────────────────────────────────────────────────────────
  {
    id: "team_admin_burden",
    section: "team",
    label:
      "Who in the firm spends the most time on repetitive admin, and what are they doing?",
    type: "textarea",
    tiers: ALL,
    required: true,
    interviewPrompt:
      "Get names and roles — these become interview candidates and the people whose buy-in the build will need.",
  },
  {
    id: "team_hiring_pressure",
    section: "team",
    label:
      "Are you hiring (or wishing you could hire) to keep up with workload?",
    type: "select",
    options: [
      "Yes — actively hiring",
      "Want to but can't afford / can't find people",
      "No — workload is manageable",
      "Reducing headcount",
    ],
    tiers: ALL,
    interviewPrompt:
      "A pending admin hire is a powerful ROI anchor: a $70k salary deferred is a cleaner number than hours saved.",
  },
  {
    id: "team_dept_heads",
    section: "team",
    label:
      "Which team leads or department heads know the day-to-day processes best?",
    help: "Names and roles — we may interview them as part of the audit.",
    type: "textarea",
    tiers: PRO_ENT,
  },

  // ── Tools ─────────────────────────────────────────────────────────────
  {
    id: "tools_pm",
    section: "tools",
    label: "What practice management / core system do you use?",
    help: "e.g. LEAP, Smokeball, Actionstep, Xero, MYOB, PropertyMe",
    type: "text",
    tiers: ALL,
    required: true,
    interviewPrompt:
      "Note the exact product and plan — API availability varies by plan and determines build feasibility.",
  },
  {
    id: "tools_email_docs",
    section: "tools",
    label: "What do you use for email, documents and file storage?",
    help: "e.g. Outlook + SharePoint, Gmail + Google Drive, Dropbox",
    type: "text",
    tiers: ALL,
    required: true,
  },
  {
    id: "tools_crm",
    section: "tools",
    label: "Do you use a CRM or client database? Which one?",
    type: "text",
    tiers: ALL,
  },
  {
    id: "tools_other",
    section: "tools",
    label:
      "Any other software the firm relies on? (billing, e-signing, phones, marketing, portals)",
    type: "textarea",
    tiers: PRO_ENT,
    interviewPrompt:
      "Ask what they pay for but barely use — consolidation savings can part-fund a build.",
  },
  {
    id: "tools_spreadsheet_glue",
    section: "tools",
    label:
      "Where do spreadsheets or manual copy-paste hold things together between systems?",
    type: "textarea",
    tiers: PRO_ENT,
    required: true,
    interviewPrompt:
      "Spreadsheet glue is the #1 automation signal. Get specifics: which sheet, updated by whom, how often, feeding what.",
  },

  // ── Workflows (3 structured blocks) ───────────────────────────────────
  ...workflowBlock(1),
  ...workflowBlock(2),
  ...workflowBlock(3),
  {
    id: "workflows_other",
    section: "workflows",
    label:
      "Any other repetitive processes worth examining? List as many as you like.",
    type: "textarea",
    tiers: PRO_ENT,
    interviewPrompt:
      "Professional covers up to 8 workflows, Enterprise maps the full operation — mine this list in the deep-dive session.",
  },

  // ── Pain ──────────────────────────────────────────────────────────────
  {
    id: "pain_biggest",
    section: "pain",
    label:
      "If you could make one operational problem disappear tomorrow, what would it be?",
    type: "textarea",
    tiers: ALL,
    required: true,
    interviewPrompt:
      "This is usually the emotional centre of the engagement. The report should visibly address it, even if it's not the top-ROI item.",
  },
  {
    id: "pain_dropped_balls",
    section: "pain",
    label:
      "Where do things get missed — follow-ups, deadlines, unbilled work, slow responses?",
    type: "textarea",
    tiers: ALL,
    interviewPrompt:
      "Quantify: a missed follow-up worth how much? Unbilled WIP leakage per month? Errors-of-omission often beat time savings in ROI.",
  },
  {
    id: "pain_after_hours",
    section: "pain",
    label:
      "Do you or senior staff regularly work evenings/weekends on admin rather than client work?",
    type: "select",
    options: ["Yes, constantly", "Sometimes", "Rarely", "No"],
    tiers: ALL,
  },

  // ── Goals ─────────────────────────────────────────────────────────────
  {
    id: "goals_12mo",
    section: "goals",
    label: "What are your top goals for the firm over the next 12 months?",
    type: "textarea",
    tiers: ALL,
    required: true,
    interviewPrompt:
      "Map every recommended opportunity back to one of these goals in the report — that's what makes it land.",
  },
  {
    id: "goals_success",
    section: "goals",
    label:
      "Six months after automating, what would tell you it was worth it?",
    help: "e.g. home by 5:30, took on 20% more clients without hiring, zero missed follow-ups",
    type: "textarea",
    tiers: ALL,
    required: true,
    interviewPrompt:
      "Get a measurable baseline now (current hours, current client count) so the follow-up review can prove the delta.",
  },
  {
    id: "goals_budget_appetite",
    section: "goals",
    label:
      "If the ROI case is strong, what investment range feels workable for an initial build?",
    type: "select",
    options: [
      "Under $15k",
      "$15k–$30k",
      "$30k–$60k",
      "$60k+",
      "Depends entirely on the ROI case",
    ],
    tiers: ALL,
    interviewPrompt:
      "Don't push — this calibrates which opportunities lead the report. A $60k recommendation to an under-$15k buyer kills trust.",
  },

  // ── Data & Compliance (Pro/Ent) ───────────────────────────────────────
  {
    id: "data_sensitive",
    section: "data",
    label:
      "What sensitive or regulated data do you handle, and are there compliance rules that govern your systems?",
    help: "e.g. trust accounting rules, privacy obligations, professional body requirements",
    type: "textarea",
    tiers: PRO_ENT,
    interviewPrompt:
      "Identify hard constraints early: data residency, trust account rules, professional indemnity requirements. These shape architecture.",
  },
  {
    id: "data_document_volume",
    section: "data",
    label:
      "What documents does the firm produce repeatedly, and roughly how many per month?",
    help: "e.g. engagement letters, contracts, reports, returns, statements",
    type: "textarea",
    tiers: PRO_ENT,
    required: true,
    interviewPrompt:
      "Repeated document production is consistently a top-3 ROI opportunity. Get templates and monthly volumes.",
  },

  // ── AI Readiness ──────────────────────────────────────────────────────
  {
    id: "readiness_current_use",
    section: "readiness",
    label: "Is anyone in the firm already using AI tools? How?",
    help: "e.g. ChatGPT for drafting, Copilot, dictation tools",
    type: "textarea",
    tiers: ALL,
    interviewPrompt:
      "Existing users are your internal champions. Unsanctioned use also signals demand — and a governance gap worth noting.",
  },
  {
    id: "readiness_team_attitude",
    section: "readiness",
    label: "How would your team react to AI taking over parts of their admin?",
    type: "select",
    options: [
      "Excited — they'd welcome it",
      "Mixed — some keen, some wary",
      "Nervous — worried about jobs or change",
      "Haven't discussed it",
    ],
    tiers: ALL,
    interviewPrompt:
      "If nervous/mixed, the roadmap needs a change-management lane: start with automations that remove drudgery nobody loves.",
  },

  // ── Strategy (Enterprise) ─────────────────────────────────────────────
  {
    id: "strategy_growth",
    section: "strategy",
    label:
      "What's the growth plan — acquisition, new service lines, new locations, succession?",
    type: "textarea",
    tiers: ENT,
    interviewPrompt:
      "Position automation as growth infrastructure: scaling without proportional headcount. This frames the 12-month roadmap.",
  },
  {
    id: "strategy_competitors",
    section: "strategy",
    label:
      "Are competitors doing anything with AI or automation that concerns or motivates you?",
    type: "textarea",
    tiers: ENT,
    interviewPrompt:
      "Feeds the competitive benchmarking section. Note named competitors for research before the final session.",
  },
  {
    id: "strategy_capacity",
    section: "strategy",
    label:
      "If your team had 20% more capacity overnight, where would you point it?",
    type: "textarea",
    tiers: ENT,
    interviewPrompt:
      "Their answer is the real ROI story — saved hours only matter when reinvested somewhere valuable. Quote it in the executive presentation.",
  },
];

/** Questions applicable to a tier (and optionally firm type), in section order. */
export function questionsForTier(
  tier: AuditTier,
  firmType?: FirmType
): FactFindQuestion[] {
  return FACTFIND_QUESTIONS.filter(
    (q) =>
      q.tiers.includes(tier) &&
      (!q.firmTypes || !firmType || q.firmTypes.includes(firmType))
  );
}

export function sectionsForTier(tier: AuditTier): FactFindSection[] {
  return FACTFIND_SECTIONS.filter((s) => s.tiers.includes(tier));
}
