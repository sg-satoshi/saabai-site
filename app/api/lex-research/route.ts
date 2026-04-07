import { streamText, tool, jsonSchema, stepCountIs, type SystemModelMessage } from "ai";
import { getPremiumModel } from "../../../lib/chat-config";
import { getLexConfig } from "../../../lib/lex-config";
import {
  searchAustLII,
  searchATO,
  searchLegislation,
  searchInternational,
  type LegalSearchResponse,
} from "../../../lib/lex-tools";

// Lex Research always uses the premium model — legal accuracy is non-negotiable.
// Never route legal research to a cheaper model.

export const maxDuration = 60;

type AustLIIInput  = { query: string; jurisdiction?: string };
type ATOInput      = { query: string };
type LegisInput    = { query: string };
type IntlInput     = { query: string; source?: "bailii" | "nzlii" | "worldlii" };
type MatterInput   = { name: string; email: string; phone?: string; practiceArea: string; matterBrief: string };

export async function POST(req: Request) {
  try {
    const { messages, clientId } = await req.json();

    const config = getLexConfig(clientId);

    const coreMessages = (messages as Array<{ role: string; content: string }>)
      .filter(m => m.role !== "system" && typeof m.content === "string" && m.content.trim())
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    const cachedSystem: SystemModelMessage = {
      role: "system",
      content: config.systemPrompt,
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    };

    const enabledTools = new Set(config.tools);

    const result = streamText({
      model: getPremiumModel(),
      system: cachedSystem,
      messages: coreMessages,
      stopWhen: stepCountIs(6),
      tools: {

        ...(enabledTools.has("searchAustLII") && {
          searchAustLII: tool<AustLIIInput, LegalSearchResponse>({
            description:
              "Search AustLII for Australian case law, tribunal decisions, and legislation summaries. " +
              "Covers High Court, Federal Court, all State Supreme Courts, AAT, VCAT, NCAT, QCAT and 1000+ databases. " +
              "Use this for case law research and finding precedents.",
            inputSchema: jsonSchema<AustLIIInput>({
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Legal search query — include key legal terms, party names, or doctrine. E.g. 'duty of care negligence personal injury' or 'Donoghue v Stevenson'",
                },
                jurisdiction: {
                  type: "string",
                  description: "Optional court filter — e.g. 'HCA' (High Court), 'FCA' (Federal Court), 'NSWSC', 'VSC', 'QSC', 'WASC'",
                },
              },
              required: ["query"],
            }),
            execute: async ({ query, jurisdiction }) => searchAustLII(query, jurisdiction),
          }),
        }),

        ...(enabledTools.has("searchATO") && {
          searchATO: tool<ATOInput, LegalSearchResponse>({
            description:
              "Search the ATO for tax rulings (TRs, PCGs, LCRs), interpretive decisions, private rulings, " +
              "tax cases, and practical guidance. Use for any Australian tax law question.",
            inputSchema: jsonSchema<ATOInput>({
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Tax query — e.g. 'trust distribution CGT' or 'TR 2019/1 personal services income' or 'Division 7A loan deemed dividend'",
                },
              },
              required: ["query"],
            }),
            execute: async ({ query }) => searchATO(query),
          }),
        }),

        ...(enabledTools.has("searchLegislation") && {
          searchLegislation: tool<LegisInput, LegalSearchResponse>({
            description:
              "Search the Federal Register of Legislation (legislation.gov.au) for Commonwealth Acts, " +
              "Regulations, and Legislative Instruments. Use for exact text of federal legislation.",
            inputSchema: jsonSchema<LegisInput>({
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Act or regulation name or topic — e.g. 'Corporations Act 2001 section 180 director duties' or 'Fair Work Act unfair dismissal'",
                },
              },
              required: ["query"],
            }),
            execute: async ({ query }) => searchLegislation(query),
          }),
        }),

        ...(enabledTools.has("searchInternational") && {
          searchInternational: tool<IntlInput, LegalSearchResponse>({
            description:
              "Search international legal databases for comparative law and persuasive foreign authority. " +
              "BAILII for UK/Irish law, NZLII for New Zealand, WorldLII for broad multi-jurisdiction coverage. " +
              "Always distinguish binding Australian authority from persuasive foreign authority in your response.",
            inputSchema: jsonSchema<IntlInput>({
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Legal query — e.g. 'Hedley Byrne negligent misstatement' or 'good faith implied duty employment'",
                },
                source: {
                  type: "string",
                  enum: ["bailii", "nzlii", "worldlii"],
                  description: "Database — defaults to worldlii for broadest coverage",
                },
              },
              required: ["query"],
            }),
            execute: async ({ query, source }) => searchInternational(query, source),
          }),
        }),

        ...(enabledTools.has("captureMatter") && {
          captureMatter: tool<MatterInput, { ok: boolean }>({
            description: "Capture a new matter enquiry from a prospective client. Call after collecting name, email, practice area, and matter description.",
            inputSchema: jsonSchema<MatterInput>({
              type: "object",
              properties: {
                name:         { type: "string" },
                email:        { type: "string" },
                phone:        { type: "string" },
                practiceArea: { type: "string" },
                matterBrief:  { type: "string" },
              },
              required: ["name", "email", "practiceArea", "matterBrief"],
            }),
            execute: async ({ name, email, phone, practiceArea, matterBrief }) => {
              fetch(
                `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://saabai-site.vercel.app"}/api/rex-leads`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    clientId: config.id,
                    source: "lex_matter_enquiry",
                    name,
                    email,
                    mobile: phone,
                    note: `[${practiceArea}] ${matterBrief}`,
                    timestamp: new Date().toISOString(),
                  }),
                }
              ).catch(() => {});
              return { ok: true };
            },
          }),
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("[lex-research]", err);
    return new Response(String(err), { status: 500 });
  }
}
