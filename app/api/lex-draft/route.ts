/**
 * Lex Document Drafting API — /api/lex-draft
 *
 * Two-pass architecture:
 *
 *   Pass 1 — Drafter (streaming)
 *     An elite Australian legal drafter that searches for governing legislation
 *     BEFORE drafting, cites every substantive proposition, and marks anything
 *     unverifiable with [VERIFY: ...]. Returns the full draft as a stream.
 *
 *   Pass 2 — QA Verifier (non-streaming, optional)
 *     An independent legal reviewer that checks every clause in the draft,
 *     returns a structured JSON confidence report with flagged issues.
 *     Triggered when requestQA is true and a completed draft is provided.
 *
 * Always uses the premium model — legal accuracy is non-negotiable.
 */

import { streamText, generateText, tool, jsonSchema, stepCountIs } from "ai";
import { getPremiumModel } from "../../../lib/chat-config";
import {
  searchAustLII,
  searchATO,
  searchLegislation,
  searchFamilyLaw,
  searchCorporationsLaw,
  searchStateLegislation,
  verifySection,
  type LegalSearchResponse,
} from "../../../lib/lex-tools";
import {
  getDocumentType,
  type DocumentType,
} from "../../../lib/lex-document-types";

export const runtime = "nodejs";
export const maxDuration = 120; // Complex documents need more time

// ── Type definitions ─────────────────────────────────────────────────────────

type AustLIIInput       = { query: string; jurisdiction?: string };
type ATOInput           = { query: string };
type LegisInput         = { query: string };
type SimpleQueryInput   = { query: string };
type StateLegisInput    = { query: string; state: "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT" };
type VerifySectionInput = { act: string; section: string };

export interface QASection {
  id: string;
  clause: string;
  status: "verified" | "flagged" | "unverified";
  note: string;
}

export interface QAVerificationReport {
  overallConfidence: number;
  sections: QASection[];
  criticalIssues: string[];
  recommendedChecks: string[];
}

// ── Drafting system prompt ────────────────────────────────────────────────────

const DRAFTING_SYSTEM_PROMPT = `You are an elite Australian legal drafter — the equivalent of a senior partner at a top-tier firm. You draft precise, enforceable legal documents that are grounded in current Australian law.

ABSOLUTE RULES:
1. SEARCH BEFORE YOU DRAFT. For every document, first search for the governing legislation and key cases. Do not rely on memory alone.
2. CITE EVERYTHING. Every substantive legal proposition must cite: the specific Act, the exact section number, and (where relevant) the case. Format: [Act Name Year (Cth/State) s XX].
3. FLAG UNCERTAINTY. If you cannot find or verify a legal proposition via search, mark it: [VERIFY: {what needs checking and why}]. Do not invent citations.
4. JURISDICTION PRECISION. Australian law varies significantly by state. Always specify which jurisdiction's law applies and note where state law diverges.
5. NEVER HALLUCINATE. If a section number is uncertain, search for it. If you cannot find it, say so explicitly.

DOCUMENT QUALITY STANDARDS:
- Use proper legal drafting conventions: defined terms in capitals, operative provisions in present tense, schedules for detailed matters
- Include all legally required elements for the document type (from the document registry)
- Note any execution requirements (witnesses, independent legal advice certificates, etc.)
- Flag stamp duty and registration requirements

ALWAYS INCLUDE AT TOP OF EVERY DOCUMENT:
---
DRAFT — [Document Type] — [Date]
Prepared using Lex by Saabai | For review by a qualified Australian lawyer before execution
This document is a draft only and does not constitute legal advice.
---

FORMATTING:
- Plain text only. No markdown symbols or asterisks.
- Number every clause (1., 1.1, 1.1.1)
- New paragraph after every clause
- Section headings in CAPITALS
- Defined terms in "quotation marks" on first use, then in Title Case throughout`;

// ── QA Verifier system prompt ─────────────────────────────────────────────────

const QA_SYSTEM_PROMPT = `You are a legal QA reviewer. Your role is to review a draft Australian legal document and assess the accuracy and soundness of its legal propositions.

For each numbered clause or section in the document, assess:
1. Whether the legal proposition stated is sound under current Australian law
2. Whether any cited legislation section actually exists and says what the draft claims
3. Whether any [VERIFY: ...] markers indicate genuine risk
4. Whether any required elements appear to be missing

Return your assessment as a JSON object with this exact structure:
{
  "overallConfidence": <number between 0 and 100>,
  "sections": [
    {
      "id": "<clause number or section heading>",
      "clause": "<brief description of what the clause does>",
      "status": "<verified|flagged|unverified>",
      "note": "<your assessment — what is correct, what needs checking>"
    }
  ],
  "criticalIssues": ["<issue 1>", "<issue 2>"],
  "recommendedChecks": ["<check 1>", "<check 2>"]
}

Status meanings:
- verified: the legal proposition appears sound and the citation appears correct
- flagged: there is a substantive legal concern or citation risk that a lawyer must check
- unverified: there is a [VERIFY] marker or the clause lacks citation and cannot be assessed

Return ONLY the JSON object. No preamble, no explanation outside the JSON.`;

// ── Build document-type-aware system prompt addition ─────────────────────────

function buildDocumentContextAddition(docType: DocumentType, jurisdiction: string): string {
  const govLeg = docType.governingLegislation
    .map(
      (leg) =>
        `${leg.name}:\n  Key sections: ${leg.key_sections.join(", ")}`
    )
    .join("\n\n");

  const required = docType.requiredElements.map((el) => `- ${el}`).join("\n");
  const warnings = docType.draftingWarnings.map((w) => `- ${w}`).join("\n");
  const searchTerms = docType.searchTerms.join("; ");

  return `

DOCUMENT TYPE: ${docType.name}
CATEGORY: ${docType.category}
JURISDICTION: ${jurisdiction}

DESCRIPTION:
${docType.description}

GOVERNING LEGISLATION (search these before drafting):
${govLeg}

REQUIRED ELEMENTS (every one of these must appear in the draft):
${required}

JURISDICTION NOTES:
${docType.jurisdictionNotes}

DRAFTING WARNINGS (these are the highest-risk areas for this document type):
${warnings}

SUGGESTED SEARCH TERMS (use these with the available search tools):
${searchTerms}

MANDATORY FIRST STEP: Before drafting a single clause, search for the governing legislation using searchLegislation, searchAustLII, and/or searchFamilyLaw/searchCorporationsLaw as appropriate. Confirm the key section numbers. Only then begin the draft.`;
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const {
      documentType,
      parties,
      jurisdiction,
      specialInstructions,
      messages,
      requestQA,
      completedDraft,
    } = await req.json();

    // ── QA Pass (Pass 2) ────────────────────────────────────────────────────
    // If a completed draft is provided and QA is requested, run QA and return.
    if (requestQA && completedDraft) {
      const qaResult = await runQAPass(completedDraft, documentType);
      return new Response(JSON.stringify(qaResult), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── Drafting Pass (Pass 1) ──────────────────────────────────────────────

    // Look up document type from registry (optional — enhances the system prompt)
    const docTypeEntry = documentType ? getDocumentType(documentType) : undefined;

    // Build the full system prompt
    let systemPrompt = DRAFTING_SYSTEM_PROMPT;

    if (docTypeEntry && jurisdiction) {
      systemPrompt += buildDocumentContextAddition(docTypeEntry, jurisdiction);
    } else if (docTypeEntry) {
      systemPrompt += buildDocumentContextAddition(docTypeEntry, "All Australian States/Territories");
    }

    // Append parties and special instructions to the system prompt
    if (parties) {
      systemPrompt += `\n\nPARTIES:\n${typeof parties === "string" ? parties : JSON.stringify(parties, null, 2)}`;
    }
    if (specialInstructions) {
      systemPrompt += `\n\nSPECIAL INSTRUCTIONS FROM INSTRUCTING LAWYER:\n${specialInstructions}`;
    }

    // Build the message array
    const coreMessages = (
      messages as Array<{ role: string; content: string }>
    )
      .filter(
        (m) =>
          m.role !== "system" &&
          typeof m.content === "string" &&
          m.content.trim()
      )
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // If no messages provided, create a drafting instruction
    const finalMessages =
      coreMessages.length > 0
        ? coreMessages
        : [
            {
              role: "user" as const,
              content:
                docTypeEntry
                  ? `Draft a ${docTypeEntry.name}${jurisdiction ? ` for ${jurisdiction}` : ""}. ` +
                    `Search for the governing legislation first, then produce the full document with all required elements.`
                  : `Draft the requested legal document. Search for the governing legislation before drafting.`,
            },
          ];

    const result = streamText({
      model: getPremiumModel(),
      system: systemPrompt,
      messages: finalMessages,
      stopWhen: stepCountIs(10), // More steps needed for document drafting
      tools: {

        searchAustLII: tool<AustLIIInput, LegalSearchResponse>({
          description:
            "Search AustLII for Australian case law, tribunal decisions, and legislation summaries. " +
            "Use BEFORE drafting to find governing cases and confirm legal principles.",
          inputSchema: jsonSchema<AustLIIInput>({
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Legal query — e.g. 'discretionary trust deed valid certainty of objects' or 'binding financial agreement s90G requirements'",
              },
              jurisdiction: {
                type: "string",
                description: "Optional court filter — HCA, FCA, NSWSC, VSC, QSC, WASC",
              },
            },
            required: ["query"],
          }),
          execute: async ({ query, jurisdiction }) =>
            searchAustLII(query, jurisdiction),
        }),

        searchATO: tool<ATOInput, LegalSearchResponse>({
          description:
            "Search the ATO for tax rulings, interpretive decisions, and guidance. " +
            "Use for trust tax issues, CGT, Division 7A, superannuation, and any tax provision.",
          inputSchema: jsonSchema<ATOInput>({
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Tax query — e.g. 'discretionary trust streaming rules Subdivision 207-B' or 'Division 7A trustee loan'",
              },
            },
            required: ["query"],
          }),
          execute: async ({ query }) => searchATO(query),
        }),

        searchLegislation: tool<LegisInput, LegalSearchResponse>({
          description:
            "Search the Federal Register of Legislation (legislation.gov.au) for the exact text " +
            "of Commonwealth Acts. ALWAYS use this to verify section numbers before citing them.",
          inputSchema: jsonSchema<LegisInput>({
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Act name and section — e.g. 'Family Law Act 1975 section 90G binding financial agreement requirements'",
              },
            },
            required: ["query"],
          }),
          execute: async ({ query }) => searchLegislation(query),
        }),

        searchFamilyLaw: tool<SimpleQueryInput, LegalSearchResponse>({
          description:
            "Search Family Law Act 1975, Federal Circuit and Family Court decisions, and family law case law. " +
            "Use for BFAs, property settlements, parenting, spousal maintenance, de facto relationships.",
          inputSchema: jsonSchema<SimpleQueryInput>({
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Family law query — e.g. 'section 90G certificate independent legal advice binding' or 'property settlement just equitable s79'",
              },
            },
            required: ["query"],
          }),
          execute: async ({ query }) => searchFamilyLaw(query),
        }),

        searchCorporationsLaw: tool<SimpleQueryInput, LegalSearchResponse>({
          description:
            "Search Corporations Act 2001 case law on AustLII. Use for director duties, share transfers, " +
            "managed investment schemes, oppression remedy, company constitution.",
          inputSchema: jsonSchema<SimpleQueryInput>({
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Corporations law query — e.g. 'shareholders agreement drag along oppression remedy s232' or 'unit trust MIS registration threshold'",
              },
            },
            required: ["query"],
          }),
          execute: async ({ query }) => searchCorporationsLaw(query),
        }),

        searchStateLegislation: tool<StateLegisInput, LegalSearchResponse>({
          description:
            "Search state and territory legislation on AustLII. Use for state-specific Acts: " +
            "Retail Leases Act, Duties Act (stamp duty), Property Law Act, Trustee Act, etc.",
          inputSchema: jsonSchema<StateLegisInput>({
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "State legislation query — e.g. 'Retail Leases Act disclosure statement requirements' or 'Duties Act trust deed stamp duty exemption'",
              },
              state: {
                type: "string",
                enum: ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"],
                description: "The Australian state or territory",
              },
            },
            required: ["query", "state"],
          }),
          execute: async ({ query, state }) =>
            searchStateLegislation(query, state),
        }),

        verifySection: tool<VerifySectionInput, LegalSearchResponse>({
          description:
            "Verify the exact text of a specific section on legislation.gov.au. " +
            "ALWAYS call this before including a specific section number in a draft — " +
            "this is the primary anti-hallucination tool for statutory citations.",
          inputSchema: jsonSchema<VerifySectionInput>({
            type: "object",
            properties: {
              act: {
                type: "string",
                description: "Full Act name — e.g. 'Family Law Act 1975' or 'Corporations Act 2001'",
              },
              section: {
                type: "string",
                description: "Section number — e.g. '90G' or '180' or '102AG'",
              },
            },
            required: ["act", "section"],
          }),
          execute: async ({ act, section }) => verifySection(act, section),
        }),

      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("[lex-draft]", err);
    return new Response(String(err), { status: 500 });
  }
}

// ── QA Pass (Pass 2) ──────────────────────────────────────────────────────────

async function runQAPass(
  draftText: string,
  documentTypeId?: string
): Promise<QAVerificationReport> {
  const docTypeEntry = documentTypeId ? getDocumentType(documentTypeId) : undefined;

  const qaUserPrompt =
    `Review the following draft Australian legal document and return a structured JSON verification report.\n\n` +
    (docTypeEntry
      ? `Document type: ${docTypeEntry.name}\n` +
        `Key warnings for this document type:\n` +
        docTypeEntry.draftingWarnings.map((w) => `- ${w}`).join("\n") +
        `\n\n`
      : "") +
    `DRAFT DOCUMENT:\n\n${draftText}\n\n` +
    `Return ONLY the JSON verification report as specified in your instructions.`;

  try {
    const qaResult = await generateText({
      model: getPremiumModel(),
      system: QA_SYSTEM_PROMPT,
      messages: [{ role: "user", content: qaUserPrompt }],
      tools: {
        searchAustLII: tool<AustLIIInput, LegalSearchResponse>({
          description:
            "Search AustLII to verify whether a legal proposition or case citation in the draft is accurate.",
          inputSchema: jsonSchema<AustLIIInput>({
            type: "object",
            properties: {
              query: { type: "string", description: "Legal query to verify" },
              jurisdiction: { type: "string" },
            },
            required: ["query"],
          }),
          execute: async ({ query, jurisdiction }) =>
            searchAustLII(query, jurisdiction),
        }),
        searchLegislation: tool<LegisInput, LegalSearchResponse>({
          description:
            "Verify a section number or statutory provision on legislation.gov.au.",
          inputSchema: jsonSchema<LegisInput>({
            type: "object",
            properties: {
              query: { type: "string", description: "Legislation query to verify" },
            },
            required: ["query"],
          }),
          execute: async ({ query }) => searchLegislation(query),
        }),
        verifySection: tool<VerifySectionInput, LegalSearchResponse>({
          description: "Verify the exact text of a specific section of legislation.",
          inputSchema: jsonSchema<VerifySectionInput>({
            type: "object",
            properties: {
              act:     { type: "string" },
              section: { type: "string" },
            },
            required: ["act", "section"],
          }),
          execute: async ({ act, section }) => verifySection(act, section),
        }),
      },
      stopWhen: stepCountIs(6),
    });

    // Parse the JSON response
    const responseText = qaResult.text.trim();
    // Strip markdown code fences if the model added them despite instructions
    const jsonText = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(jsonText) as QAVerificationReport;
    return parsed;
  } catch (err) {
    // Return a safe fallback if QA parsing fails
    return {
      overallConfidence: 0,
      sections: [],
      criticalIssues: [
        `QA pass failed: ${String(err)}. Manual review of all clauses is required.`,
      ],
      recommendedChecks: [
        "Verify all legislative section references against legislation.gov.au",
        "Confirm all case citations exist and stand for the proposition cited",
        "Check all [VERIFY] markers in the draft",
        "Have a qualified Australian lawyer review the document before execution",
      ],
    };
  }
}
