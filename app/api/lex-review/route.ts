import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export const runtime = "nodejs";
export const maxDuration = 120;

export type ReviewSeverity = "critical" | "moderate" | "minor";

export type ReviewFinding = {
  id: string;
  severity: ReviewSeverity;
  axis:
    | "risk"
    | "missing"
    | "legislation"
    | "market"
    | "accuracy"
    | "completeness"
    | "compliance"
    | "tone";
  clauseRef: string;
  title: string;
  issue: string;
  recommendation: string;
  redline?: string;
};

export type ReviewMissingClause = {
  clause: string;
  reason: string;
  severity: ReviewSeverity;
};

export type ReviewLegislationConflict = {
  ref: string;
  clauseRef: string;
  issue: string;
};

export type ReviewReport = {
  documentType: string;
  direction: "incoming" | "outgoing";
  actingFor?: string;
  jurisdiction: string;
  overallScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  summary: string;
  findings: ReviewFinding[];
  missingClauses: ReviewMissingClause[];
  legislationConflicts: ReviewLegislationConflict[];
  recommendedActions: string[];
  wordCount: number;
  clauseCount: number;
};

type ReviewRequest = {
  documentText: string;
  documentType: string;
  direction: "incoming" | "outgoing";
  actingFor?: string;
  jurisdiction: string;
  fileName?: string;
};

function buildUserPrompt(body: ReviewRequest): string {
  const { documentText, documentType, direction, actingFor, jurisdiction } = body;
  const truncated = documentText.slice(0, 12000);

  const isAutoDetect = documentType === "auto-detect" || documentType === "other";
  const docTypeInstruction = isAutoDetect
    ? `First, identify the document type from the content (e.g. "Service Agreement", "Employment Contract", "NDA", "Commercial Lease", "Letter of Advice" etc.) and use that as the documentType field in your response. Apply review criteria appropriate for that document type.`
    : `Document type: ${documentType}.`;

  let analysisInstructions: string;

  if (direction === "incoming") {
    analysisInstructions = `${docTypeInstruction}

Review this document as ${actingFor ?? "your client"}'s solicitor in ${jurisdiction}.

Analyse across these axes:
1. RISK FLAGS — clauses that create unfavorable exposure for your client (unlimited liability, one-sided indemnities, unilateral variation rights, unusual termination triggers, IP assignment, auto-renewal traps)
2. MISSING CLAUSES — clauses that should be present but are absent (limitation of liability, dispute resolution, IP ownership, restraint of trade, force majeure, confidentiality, etc.) — tailor this to the identified document type
3. LEGISLATION CONFLICTS — clauses that may conflict with Australian legislation relevant to this document type (ACL, Fair Work Act, Corporations Act, Residential Tenancies Acts, Copyright Act 1968, Family Law Act, etc.)
4. MARKET POSITION — terms that are unusually aggressive or non-standard for this document type
5. NEGOTIATION — for each critical/moderate finding, suggest a redline (replacement clause language)

Return a JSON ReviewReport object.`;
  } else {
    analysisInstructions = `${docTypeInstruction}

Review this document prepared for a client in ${jurisdiction} as outgoing work product from a law firm.

Analyse across these axes:
1. ACCURACY — are legal citations correct? Are case references valid? Are legislation section numbers accurate for the identified document type?
2. COMPLETENESS — has the lawyer addressed all material issues relevant to this document type? What has been missed?
3. COMPLIANCE — does this comply with Legal Profession Uniform Law obligations (costs disclosure, conflict disclosure)?
4. TONE — is the language professionally appropriate? Too aggressive? Too tentative?
5. RISK TO FIRM — anything that could expose the firm to professional indemnity liability?

Return a JSON ReviewReport object.`;
  }

  return `${analysisInstructions}

Document text:
---
${truncated}
---

Return ONLY the raw JSON ReviewReport. No explanation, no markdown. Valid JSON only.
The overallScore should be 0-100 where 0 = perfectly clean, 100 = critical issues throughout.
Generate at least 4 findings and check carefully for missing clauses.`;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body: ReviewRequest = await request.json();

    const { documentText, documentType, direction, actingFor, jurisdiction } = body;

    if (!documentText || !documentType || !direction || !jurisdiction) {
      return Response.json(
        { error: "Missing required fields: documentText, documentType, direction, jurisdiction" },
        { status: 400 }
      );
    }

    const systemPrompt =
      "You are Lex, an expert AI legal document reviewer specialising in Australian law.\n" +
      "You review documents with the precision of a senior partner conducting a pre-execution review.\n" +
      "You MUST respond with valid JSON only — no prose, no markdown, no code fences. Raw JSON object only.";

    const userPrompt = buildUserPrompt(body);

    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 4000,
    });

    let report: ReviewReport;
    try {
      report = JSON.parse(text);
    } catch {
      return Response.json(
        { error: "Analysis failed — could not parse review output" },
        { status: 500 }
      );
    }

    // Ensure top-level metadata is populated from the request in case the model omits them
    report.documentType = report.documentType ?? documentType;
    report.direction = report.direction ?? direction;
    report.actingFor = report.actingFor ?? actingFor;
    report.jurisdiction = report.jurisdiction ?? jurisdiction;

    return Response.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
