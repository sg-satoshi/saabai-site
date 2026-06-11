/**
 * AI Audit Capability Matrix — the intelligence layer.
 *
 * A living library of automation patterns for professional firms, each scored
 * for feasibility with current AI, build complexity, cost band, and the logic
 * for estimating hours saved. Fact-find data is crossed against this matrix
 * (by the assessment generator and by Shane) to produce ranked opportunities.
 *
 * UPDATE THIS AFTER EVERY AUDIT — patterns observed, real build costs, real
 * hours saved. The matrix compounding is the moat.
 */

import { FirmType } from "./audit-types";

export type Feasibility = "proven" | "emerging" | "frontier";
export type Complexity = "low" | "medium" | "high";

export interface CapabilityPattern {
  id: string;
  name: string;
  category: string;
  description: string;
  /** Fact-find signals that indicate this pattern fits. */
  signals: string[];
  firmTypes: FirmType[] | "all";
  feasibility: Feasibility;
  complexity: Complexity;
  costBandAud: string;
  hoursSavedLogic: string;
  notes?: string;
}

export const CAPABILITY_MATRIX: CapabilityPattern[] = [
  {
    id: "intake-triage",
    name: "Client Intake & Enquiry Triage",
    category: "Front Office",
    description:
      "AI agent captures enquiries (web, email, phone transcript), qualifies them against firm criteria, collects key details, creates the matter/job in the practice system, and routes to the right person with a summary.",
    signals: [
      "slow response to new enquiries",
      "intake done manually",
      "reception overloaded",
      "leads going cold",
      "re-keying enquiry details",
    ],
    firmTypes: "all",
    feasibility: "proven",
    complexity: "medium",
    costBandAud: "$15k–$25k",
    hoursSavedLogic:
      "(enquiries/week × 20–40 min each) + faster response lifts conversion 10–30% — value the won work, not just the time.",
  },
  {
    id: "doc-generation",
    name: "Document & Letter Generation",
    category: "Document Automation",
    description:
      "First drafts of recurring documents (engagement letters, standard contracts, advice letters, reports) generated from matter data and firm precedents, in firm tone, for human review.",
    signals: [
      "repeated document production",
      "drafting from old matters",
      "copy-paste from precedents",
      "high monthly document volume",
    ],
    firmTypes: "all",
    feasibility: "proven",
    complexity: "medium",
    costBandAud: "$15k–$30k",
    hoursSavedLogic:
      "docs/month × (manual draft time − review time). Typical: 45 min draft → 10 min review.",
  },
  {
    id: "email-triage",
    name: "Inbox Triage & Draft Replies",
    category: "Communications",
    description:
      "Incoming email classified, filed against the right matter/client, prioritised, and answered with a drafted reply in the sender's context for one-click review.",
    signals: [
      "drowning in email",
      "after-hours email work",
      "slow client responses",
      "emails not filed to matters",
    ],
    firmTypes: "all",
    feasibility: "proven",
    complexity: "medium",
    costBandAud: "$12k–$22k",
    hoursSavedLogic:
      "people × daily email-hours × 30–50% reduction. Senior staff hours valued at charge-out rate.",
  },
  {
    id: "meeting-notes",
    name: "Meeting / Call Notes → File Notes & Actions",
    category: "Communications",
    description:
      "Calls and meetings transcribed, summarised into structured file notes, saved to the matter, with action items extracted and assigned.",
    signals: [
      "file notes done late or never",
      "actions from calls dropped",
      "dictation backlog",
    ],
    firmTypes: "all",
    feasibility: "proven",
    complexity: "low",
    costBandAud: "$8k–$15k",
    hoursSavedLogic:
      "meetings/week × 15–25 min note-writing each, plus reduced dropped-action risk.",
  },
  {
    id: "billing-followup",
    name: "WIP, Billing & Debtor Follow-Up",
    category: "Finance",
    description:
      "Automated WIP capture nudges, draft bill narratives from activity, and graduated debtor follow-up sequences with personalised messages.",
    signals: [
      "unbilled work",
      "WIP leakage",
      "slow payers",
      "awkward chasing invoices",
      "billing done in evening batches",
    ],
    firmTypes: "all",
    feasibility: "proven",
    complexity: "medium",
    costBandAud: "$10k–$20k",
    hoursSavedLogic:
      "Recovered WIP leakage (often 5–15% of billings) usually dwarfs the time saved — model both.",
  },
  {
    id: "doc-review-extract",
    name: "Document Review & Data Extraction",
    category: "Document Automation",
    description:
      "Incoming documents (contracts, statements, IDs, financials) read by AI, key data extracted into the practice system, anomalies flagged for review.",
    signals: [
      "manual data entry from documents",
      "re-keying client documents",
      "checking documents line by line",
    ],
    firmTypes: "all",
    feasibility: "proven",
    complexity: "medium",
    costBandAud: "$15k–$30k",
    hoursSavedLogic: "docs/month × manual extraction minutes, plus error-rate reduction.",
  },
  {
    id: "client-portal-bot",
    name: "Client Self-Service Assistant",
    category: "Front Office",
    description:
      "Branded AI assistant on the website/portal answering routine client questions (status, process, documents needed), escalating to staff with full context when needed.",
    signals: [
      "same questions answered repeatedly",
      "status update calls",
      "reception interruptions",
    ],
    firmTypes: "all",
    feasibility: "proven",
    complexity: "low",
    costBandAud: "$8k–$18k",
    hoursSavedLogic:
      "routine enquiries/week × 5–10 min each, plus after-hours capture of new business.",
  },
  {
    id: "onboarding-automation",
    name: "Client Onboarding & Engagement Automation",
    category: "Operations",
    description:
      "From 'yes' to ready-to-work: engagement letter, ID verification, document requests, system setup, and welcome sequence orchestrated automatically with progress tracking.",
    signals: [
      "onboarding takes days",
      "chasing clients for documents",
      "inconsistent setup between staff",
    ],
    firmTypes: "all",
    feasibility: "proven",
    complexity: "medium",
    costBandAud: "$12k–$25k",
    hoursSavedLogic:
      "new clients/month × admin hours per onboarding (typically 2–5h), plus faster time-to-revenue.",
  },
  {
    id: "knowledge-assistant",
    name: "Internal Knowledge Assistant",
    category: "Knowledge",
    description:
      "Staff ask questions in plain English against the firm's precedents, policies, and past matters — answers with sources. Cuts 'ask the senior' interruptions.",
    signals: [
      "knowledge in senior heads",
      "juniors interrupt seniors",
      "precedents hard to find",
      "inconsistent advice",
    ],
    firmTypes: "all",
    feasibility: "proven",
    complexity: "medium",
    costBandAud: "$15k–$30k",
    hoursSavedLogic:
      "interruptions/day × people × minutes, valued at the SENIOR person's rate (they bear the cost).",
  },
  {
    id: "report-generation",
    name: "Recurring Report & Pack Generation",
    category: "Document Automation",
    description:
      "Monthly/quarterly client reports, board packs, or compliance reports assembled automatically from system data with AI-written commentary for review.",
    signals: [
      "monthly reporting crunch",
      "manual report assembly",
      "copy-paste from systems into Word",
    ],
    firmTypes: "all",
    feasibility: "proven",
    complexity: "medium",
    costBandAud: "$12k–$25k",
    hoursSavedLogic: "reports/month × assembly hours (often 1–4h each).",
  },
  {
    id: "compliance-monitoring",
    name: "Deadline & Compliance Monitoring",
    category: "Risk",
    description:
      "Critical dates and obligations extracted from documents and systems, monitored, with escalating alerts and audit trail. Nothing falls through.",
    signals: [
      "missed deadlines",
      "manual date tracking",
      "spreadsheet of key dates",
      "PI insurance concerns",
    ],
    firmTypes: "all",
    feasibility: "proven",
    complexity: "low",
    costBandAud: "$8k–$15k",
    hoursSavedLogic:
      "Insurance against catastrophic misses — value one prevented incident, plus tracking admin time.",
  },
  {
    id: "lead-nurture",
    name: "Lead Nurture & Follow-Up Sequences",
    category: "Growth",
    description:
      "Quoted-but-not-converted prospects and dormant clients re-engaged with personalised, firm-tone sequences; replies triaged to staff.",
    signals: [
      "quotes never followed up",
      "no system for lost leads",
      "marketing is ad-hoc",
    ],
    firmTypes: "all",
    feasibility: "proven",
    complexity: "low",
    costBandAud: "$8k–$15k",
    hoursSavedLogic:
      "Conversion lift on followed-up quotes (10–20% typical) × average matter value — a revenue play, not a time play.",
  },
  // ── Firm-type specific ────────────────────────────────────────────────
  {
    id: "legal-precedent-drafting",
    name: "Precedent-Based Legal Drafting",
    category: "Legal",
    description:
      "First drafts of contracts, leases, wills, or pleadings from the firm's own precedent bank, matter facts auto-merged, deviations from standard flagged.",
    signals: ["drafting from precedents", "junior drafting time", "settlement letters"],
    firmTypes: ["law"],
    feasibility: "proven",
    complexity: "medium",
    costBandAud: "$18k–$35k",
    hoursSavedLogic:
      "matters/month × drafting hours × 50–70% reduction; review remains with the lawyer.",
    notes: "Trust accounting and legal professional privilege constraints apply — keep data in-tenancy.",
  },
  {
    id: "legal-disclosure-review",
    name: "Disclosure / Due-Diligence Document Review",
    category: "Legal",
    description:
      "Large document sets reviewed and summarised: key clauses, risks, missing documents, and chronology built automatically.",
    signals: ["large matter document sets", "due diligence", "disclosure review"],
    firmTypes: ["law"],
    feasibility: "emerging",
    complexity: "high",
    costBandAud: "$25k–$50k",
    hoursSavedLogic: "review hours per matter × matters/year × 40–60% reduction.",
  },
  {
    id: "acct-workpaper-prep",
    name: "Workpaper & Reconciliation Prep",
    category: "Accounting",
    description:
      "Source documents matched to ledger items, workpapers pre-built, anomalies flagged — accountant starts at review rather than assembly.",
    signals: ["workpaper assembly", "reconciliation grind", "EOFY crunch"],
    firmTypes: ["accounting"],
    feasibility: "emerging",
    complexity: "high",
    costBandAud: "$20k–$40k",
    hoursSavedLogic: "jobs/month × prep hours × 30–50% reduction.",
  },
  {
    id: "acct-client-queries",
    name: "Client Query Resolution (Accounting)",
    category: "Accounting",
    description:
      "Routine client questions ('can I claim…', 'what do you need from me') answered from the client's own file and firm policy, drafted for accountant approval.",
    signals: ["repetitive client questions", "email backlog at BAS time"],
    firmTypes: ["accounting"],
    feasibility: "proven",
    complexity: "medium",
    costBandAud: "$10k–$20k",
    hoursSavedLogic: "queries/week × 10–20 min each across the team.",
  },
  {
    id: "re-listing-lifecycle",
    name: "Listing & Property Lifecycle Automation",
    category: "Real Estate",
    description:
      "Listing copy, ad variants, vendor reports, and routine tenant/landlord communications generated and sequenced automatically from CRM data.",
    signals: ["listing admin", "vendor reporting", "tenant communications volume"],
    firmTypes: ["real-estate"],
    feasibility: "proven",
    complexity: "low",
    costBandAud: "$8k–$18k",
    hoursSavedLogic: "listings or managements × admin minutes per cycle.",
  },
  {
    id: "advice-doc-prep",
    name: "Advice Document Preparation (Financial Advisory)",
    category: "Financial Advisory",
    description:
      "SOA/ROA first drafts assembled from fact-find and modelling data in licensee-compliant templates, for adviser review.",
    signals: ["SOA preparation time", "paraplanning backlog", "compliance documentation"],
    firmTypes: ["financial-advisory"],
    feasibility: "emerging",
    complexity: "high",
    costBandAud: "$25k–$45k",
    hoursSavedLogic: "advice docs/month × prep hours (often 4–10h) × 40–60% reduction.",
    notes: "Licensee compliance sign-off required on templates and process.",
  },
];

export function patternsForFirmType(firmType: FirmType): CapabilityPattern[] {
  return CAPABILITY_MATRIX.filter(
    (p) => p.firmTypes === "all" || p.firmTypes.includes(firmType)
  );
}

/** Compact text rendering of the matrix for AI assessment prompts. */
export function matrixAsPromptContext(firmType: FirmType): string {
  return patternsForFirmType(firmType)
    .map(
      (p) =>
        `- [${p.id}] ${p.name} (${p.category}) — ${p.description} Feasibility: ${p.feasibility}; complexity: ${p.complexity}; typical cost: ${p.costBandAud}. Hours-saved logic: ${p.hoursSavedLogic}${p.notes ? ` Note: ${p.notes}` : ""}`
    )
    .join("\n");
}
