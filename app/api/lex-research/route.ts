import { streamText, tool, jsonSchema, stepCountIs, type SystemModelMessage } from "ai";
import { getPremiumModel } from "../../../lib/chat-config";
import { getLexConfig } from "../../../lib/lex-config";
import { getPortalSettings, buildSystemPromptAddition } from "../../../lib/portal-config";
import { verifySession } from "../../../lib/portal-session";
import {
  searchAustLII,
  searchATO,
  searchLegislation,
  searchInternational,
  verifySection,
  searchStateLegislation,
  searchASIC,
  searchAAT,
  searchFairWork,
  searchCorporationsLaw,
  searchFamilyLaw,
  type LegalSearchResponse,
} from "../../../lib/lex-tools";

// Lex Research always uses the premium model — legal accuracy is non-negotiable.
// Never route legal research to a cheaper model.

export const runtime = "nodejs";
export const maxDuration = 60;

type AustLIIInput        = { query: string; jurisdiction?: string };
type ATOInput            = { query: string };
type LegisInput          = { query: string };
type IntlInput           = { query: string; source?: "bailii" | "nzlii" | "worldlii" };
type VerifySectionInput  = { act: string; section: string };
type StateLegisInput     = { query: string; state: "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT" };
type SimpleQueryInput    = { query: string };
type MatterInput         = { name: string; email: string; phone?: string; practiceArea: string; matterBrief: string };

export async function POST(req: Request) {
  try {
    const { messages, clientId } = await req.json();

    const config = getLexConfig(clientId);

    // Load portal settings for the logged-in user.
    // Use the session cookie email (the firm's login) — settings are saved per login email.
    // Fall back to config.email.teamEmail for non-browser callers.
    let systemPromptContent = config.systemPrompt;
    try {
      const cookieHeader = req.headers.get("cookie") ?? "";
      const sessionToken = cookieHeader
        .split(";")
        .map(p => p.trim())
        .find(p => p.startsWith("portal_session="))
        ?.slice("portal_session=".length);
      const session = sessionToken ? verifySession(sessionToken) : null;
      const settingsEmail = session?.email ?? config.email.teamEmail;

      const portalSettings = await getPortalSettings(settingsEmail);
      if (portalSettings) {
        systemPromptContent = config.systemPrompt + buildSystemPromptAddition(portalSettings);
      }
    } catch {
      // Non-fatal — fall back to base system prompt if Redis is unavailable
    }

    const coreMessages = (messages as Array<{ role: string; content: string }>)
      .filter(m => m.role !== "system" && typeof m.content === "string" && m.content.trim())
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    const cachedSystem: SystemModelMessage = {
      role: "system",
      content: systemPromptContent,
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

        ...(enabledTools.has("verifySection") && {
          verifySection: tool<VerifySectionInput, LegalSearchResponse>({
            description:
              "Verify the exact text of a specific section from legislation.gov.au BEFORE citing it in any document or advice. " +
              "Always call this before including a specific section number in a draft — prevents citation hallucinations.",
            inputSchema: jsonSchema<VerifySectionInput>({
              type: "object",
              properties: {
                act:     { type: "string", description: "Full Act name — e.g. 'Corporations Act 2001' or 'Income Tax Assessment Act 1997'" },
                section: { type: "string", description: "Section reference — e.g. '181' or '9' or '102AG'" },
              },
              required: ["act", "section"],
            }),
            execute: async ({ act, section }) => verifySection(act, section),
          }),
        }),

        ...(enabledTools.has("searchStateLegislation") && {
          searchStateLegislation: tool<StateLegisInput, LegalSearchResponse>({
            description:
              "Search state and territory legislation on AustLII. Use for state-specific Acts: Property Law Act, " +
              "Conveyancing Act, Duties Act, Succession Act, Retail Leases Act, Workers Compensation, etc.",
            inputSchema: jsonSchema<StateLegisInput>({
              type: "object",
              properties: {
                query: { type: "string", description: "Legislation query — e.g. 'Succession Act spouse entitlement'" },
                state: {
                  type: "string",
                  enum: ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"],
                  description: "The Australian state or territory",
                },
              },
              required: ["query", "state"],
            }),
            execute: async ({ query, state }) => searchStateLegislation(query, state),
          }),
        }),

        ...(enabledTools.has("searchASIC") && {
          searchASIC: tool<SimpleQueryInput, LegalSearchResponse>({
            description:
              "Search ASIC for regulatory guides, information sheets, legislative instruments, and compliance guidance. " +
              "Use for corporate governance, financial services licensing, managed investments, market conduct.",
            inputSchema: jsonSchema<SimpleQueryInput>({
              type: "object",
              properties: {
                query: { type: "string", description: "ASIC regulatory query — e.g. 'RG 65 section 912A financial services licensee obligations'" },
              },
              required: ["query"],
            }),
            execute: async ({ query }) => searchASIC(query),
          }),
        }),

        ...(enabledTools.has("searchAAT") && {
          searchAAT: tool<SimpleQueryInput, LegalSearchResponse>({
            description:
              "Search Administrative Appeals Tribunal decisions. Covers tax objections, migration review, NDIS, " +
              "social security appeals, ATO private ruling reviews, and general administrative decisions.",
            inputSchema: jsonSchema<SimpleQueryInput>({
              type: "object",
              properties: {
                query: { type: "string", description: "AAT query — e.g. 'income tax objection deductions work-related expenses'" },
              },
              required: ["query"],
            }),
            execute: async ({ query }) => searchAAT(query),
          }),
        }),

        ...(enabledTools.has("searchFairWork") && {
          searchFairWork: tool<SimpleQueryInput, LegalSearchResponse>({
            description:
              "Search Fair Work Commission decisions, awards, and determinations. Use for unfair dismissal, " +
              "enterprise agreements, general protections, modern award rates, anti-bullying, and right of entry.",
            inputSchema: jsonSchema<SimpleQueryInput>({
              type: "object",
              properties: {
                query: { type: "string", description: "Employment law query — e.g. 'unfair dismissal valid reason procedural fairness' or 'Legal Services Award 2020 rates'" },
              },
              required: ["query"],
            }),
            execute: async ({ query }) => searchFairWork(query),
          }),
        }),

        ...(enabledTools.has("searchCorporationsLaw") && {
          searchCorporationsLaw: tool<SimpleQueryInput, LegalSearchResponse>({
            description:
              "Search Corporations Act case law and ASIC decisions on AustLII. Use for directors' duties, " +
              "corporate governance, insolvency, managed investment schemes, takeovers, and market misconduct.",
            inputSchema: jsonSchema<SimpleQueryInput>({
              type: "object",
              properties: {
                query: { type: "string", description: "Corporations law query — e.g. 'director duty of care section 180 business judgment rule'" },
              },
              required: ["query"],
            }),
            execute: async ({ query }) => searchCorporationsLaw(query),
          }),
        }),

        ...(enabledTools.has("searchFamilyLaw") && {
          searchFamilyLaw: tool<SimpleQueryInput, LegalSearchResponse>({
            description:
              "Search Family Court and Federal Circuit Court decisions. Use for property settlement, " +
              "parenting orders, spousal maintenance, binding financial agreements, divorce, and de facto matters.",
            inputSchema: jsonSchema<SimpleQueryInput>({
              type: "object",
              properties: {
                query: { type: "string", description: "Family law query — e.g. 'property settlement contributions assessment Stanford v Stanford'" },
              },
              required: ["query"],
            }),
            execute: async ({ query }) => searchFamilyLaw(query),
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
