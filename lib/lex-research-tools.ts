/**
 * Lex research tool set, shared by /api/lex-research and the model test harness.
 * Moved out of the route unchanged so every caller gets exactly the same tools.
 */
import { tool, jsonSchema } from "ai";
import type { LexClientConfig } from "./lex-config";
import {
  searchAustLII,
  searchATO,
  searchLegislation,
  searchInternational,
  verifySection,
  searchStateLegislation,
  searchASIC,
  searchART,
  searchFairWork,
  searchCorporationsLaw,
  searchFamilyLaw,
  checkLegislationStatus,
  type LegalSearchResponse,
  type ActStatusResponse,
} from "./lex-tools";
import { SourceRegistry, fetchSourceText, isAllowedSourceUrl, findPinpoint, excerptFor, MAX_READS_PER_ANSWER } from "./lex-sources";

/** Max model steps (tool rounds plus the answer) for one research question. */
export const LEX_RESEARCH_MAX_STEPS = 6;

type AustLIIInput        = { query: string; jurisdiction?: string };
type ATOInput            = { query: string };
type LegisInput          = { query: string };
type IntlInput           = { query: string; source?: "bailii" | "nzlii" | "worldlii" };
type VerifySectionInput  = { act: string; section: string };
type StateLegisInput     = { query: string; state: "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT" };
type SimpleQueryInput    = { query: string };
type MatterInput         = { name: string; email: string; phone?: string; practiceArea: string; matterBrief: string };

export function buildLexResearchTools(config: LexClientConfig) {
  const enabledTools = new Set(config.tools);
  return {

    ...(enabledTools.has("searchAustLII") && {
      searchAustLII: tool<AustLIIInput, LegalSearchResponse>({
        description:
          "Search AustLII for Australian case law, tribunal decisions, and legislation summaries. " +
          "Covers High Court, Federal Court, all State Supreme Courts, the ART (formerly the AAT), VCAT, NCAT, QCAT and 1000+ databases. " +
          "Use this for case law research and finding precedents.",
        inputSchema: jsonSchema<AustLIIInput>({
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Legal search query: include key legal terms, party names, or doctrine. E.g. 'duty of care negligence personal injury' or 'Donoghue v Stevenson'",
            },
            jurisdiction: {
              type: "string",
              description: "Optional court filter: e.g. 'HCA' (High Court), 'FCA' (Federal Court), 'NSWSC', 'VSC', 'QSC', 'WASC'",
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
              description: "Tax query: e.g. 'trust distribution CGT' or 'TR 2019/1 personal services income' or 'Division 7A loan deemed dividend'",
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
              description: "Act or regulation name or topic: e.g. 'Corporations Act 2001 section 180 director duties' or 'Fair Work Act unfair dismissal'",
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
              description: "Legal query: e.g. 'Hedley Byrne negligent misstatement' or 'good faith implied duty employment'",
            },
            source: {
              type: "string",
              enum: ["bailii", "nzlii", "worldlii"],
              description: "Database: defaults to worldlii for broadest coverage",
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
          "Always call this before including a specific section number in a draft: prevents citation hallucinations.",
        inputSchema: jsonSchema<VerifySectionInput>({
          type: "object",
          properties: {
            act:     { type: "string", description: "Full Act name: e.g. 'Corporations Act 2001' or 'Income Tax Assessment Act 1997'" },
            section: { type: "string", description: "Section reference: e.g. '181' or '9' or '102AG'" },
          },
          required: ["act", "section"],
        }),
        execute: async ({ act, section }) => verifySection(act, section),
      }),
    }),

    // Saved firm configs predate this tool, so it also comes with verifySection.
    ...((enabledTools.has("checkLegislationStatus") || enabledTools.has("verifySection")) && {
      checkLegislationStatus: tool<{ act: string }, ActStatusResponse>({
        description:
          "Check whether a Commonwealth Act is in force, repealed or renamed, using the Federal Register of Legislation. " +
          "Also flags commenced amendments not yet in the compiled text and scheduled future changes. " +
          "Call this before relying on a Commonwealth Act. Pass the Act title only, e.g. 'Privacy Act 1988'. Not for State Acts.",
        inputSchema: jsonSchema<{ act: string }>({
          type: "object",
          properties: { act: { type: "string", description: "Commonwealth Act title only, e.g. 'Corporations Act 2001'" } },
          required: ["act"],
        }),
        execute: async ({ act }) => checkLegislationStatus(act),
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
            query: { type: "string", description: "Legislation query: e.g. 'Succession Act spouse entitlement'" },
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
            query: { type: "string", description: "ASIC regulatory query: e.g. 'RG 65 section 912A financial services licensee obligations'" },
          },
          required: ["query"],
        }),
        execute: async ({ query }) => searchASIC(query),
      }),
    }),

    ...(enabledTools.has("searchAAT") && {
      searchART: tool<SimpleQueryInput, LegalSearchResponse>({
        description:
          "Search Administrative Review Tribunal (ART) decisions, plus former Administrative Appeals Tribunal (AAT) decisions. " +
          "The ART replaced the AAT on 14 October 2024. Covers tax objections and ATO reviews, migration review, NDIS, " +
          "social security appeals, ATO private ruling reviews, and general administrative decisions.",
        inputSchema: jsonSchema<SimpleQueryInput>({
          type: "object",
          properties: {
            query: { type: "string", description: "ART or AAT query, e.g. 'income tax objection deductions work-related expenses'" },
          },
          required: ["query"],
        }),
        execute: async ({ query }) => searchART(query),
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
            query: { type: "string", description: "Employment law query: e.g. 'unfair dismissal valid reason procedural fairness' or 'Legal Services Award 2020 rates'" },
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
            query: { type: "string", description: "Corporations law query: e.g. 'director duty of care section 180 business judgment rule'" },
          },
          required: ["query"],
        }),
        execute: async ({ query }) => searchCorporationsLaw(query),
      }),
    }),

    ...(enabledTools.has("searchFamilyLaw") && {
      searchFamilyLaw: tool<SimpleQueryInput, LegalSearchResponse>({
        description:
          "Search Federal Circuit and Family Court of Australia decisions, plus the former Family Court of Australia (before Sept 2021). Use for property settlement, " +
          "parenting orders, spousal maintenance, binding financial agreements, divorce, and de facto matters.",
        inputSchema: jsonSchema<SimpleQueryInput>({
          type: "object",
          properties: {
            query: { type: "string", description: "Family law query: e.g. 'property settlement contributions assessment Stanford v Stanford'" },
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
  };
}

// ── Citation backend: source ids, readSource, real section checks ─────────────

type AnyTool = { description?: string; inputSchema?: unknown; execute?: (input: never, opts: never) => unknown };

async function cachedRead(url: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const { createHash } = await import("node:crypto");
  const { getRedis } = await import("./redis");
  const key = `lex:src:${createHash("sha256").update(url).digest("hex").slice(0, 40)}`;
  const redis = getRedis();
  try {
    const hit = redis ? await redis.get<string>(key) : null;
    if (typeof hit === "string" && hit.length > 200) return { ok: true, text: hit };
  } catch { /* cache is optional */ }
  const res = await fetchSourceText(url);
  if (res.ok && redis) {
    try { await redis.set(key, res.text.slice(0, 200_000), { ex: 7 * 86400 }); } catch { /* cache is optional */ }
  }
  return res;
}

/**
 * Wraps the research tools so every search result is registered with an id and a
 * server-decided type, adds readSource, and makes verifySection actually read the section.
 */
export function withSourceRegistry<T extends Record<string, unknown>>(tools: T, reg: SourceRegistry, read = cachedRead, checkStatus: (act: string) => Promise<ActStatusResponse> = checkLegislationStatus) {
  const out: Record<string, unknown> = {};
  for (const [name, t] of Object.entries(tools)) {
    const orig = t as AnyTool;
    if (name === "captureMatter" || typeof orig.execute !== "function") { out[name] = t; continue; }
    const exec = orig.execute as (input: unknown, opts: unknown) => Promise<LegalSearchResponse>;
    out[name] = {
      ...orig,
      execute: async (input: unknown, opts: unknown) => {
        const res = await exec(input, opts);
        if (!res || !Array.isArray(res.results)) return res;
        const registered = reg.register(res, name);
        if (name !== "verifySection") return registered;
        // verifySection used to be a search only. Now read the first legislation result and look for the section.
        const { section, act } = (input ?? {}) as { section?: string; act?: string };
        const statusP = act ? checkStatus(act).then((r) => (r.acts[0] ? { name: r.acts[0].name, status: r.acts[0].status, isInForce: r.acts[0].isInForce, formerName: r.acts[0].formerName, hasCommencedUnincorporatedAmendments: r.acts[0].hasCommencedUnincorporatedAmendments, statusPossibleFuture: r.acts[0].statusPossibleFuture } : { checked: false, note: r.error ?? "not found" })).catch(() => ({ checked: false, note: "status check failed" })) : Promise.resolve(undefined);
        const first = registered.results.map((r) => ("id" in r ? reg.get(String(r.id)) : undefined)).find((s) => s && s.type === "legislation" && isAllowedSourceUrl(s.url));
        if (!first || !section) return { ...registered, actStatus: await statusP, sectionCheck: { checked: false, note: "No readable legislation result to check" } };
        const page = await read(first.url);
        if (!page.ok) { reg.setReadError(first.id, page.error); return { ...registered, actStatus: await statusP, sectionCheck: { checked: false, id: first.id, note: page.error } }; }
        reg.setText(first.id, page.text);
        const f = findPinpoint(page.text, `s ${section}`);
        return { ...registered, actStatus: await statusP, sectionCheck: { checked: true, id: first.id, found: f.found, excerpt: f.excerpt?.slice(0, 1500) ?? null } };
      },
    };
  }
  out.readSource = tool<{ id: string; pinpoint?: string }, unknown>({
    description:
      `Read the actual text of a source a search returned, by its id (e.g. S3). Use before giving a paragraph or section pinpoint, ` +
      `and quote from what it returns. Works for AustLII, legislation.gov.au, ATO, ASIC, FWC and ART pages. Max ${MAX_READS_PER_ANSWER} reads per answer.`,
    inputSchema: jsonSchema<{ id: string; pinpoint?: string }>({
      type: "object",
      properties: {
        id: { type: "string", description: "Source id from a search result, e.g. S3" },
        pinpoint: { type: "string", description: "Optional paragraph or section to jump to, e.g. 'para 41' or 's 109D'" },
      },
      required: ["id"],
    }),
    execute: async ({ id, pinpoint }) => {
      const src = reg.get(String(id ?? ""));
      if (!src) return { ok: false, error: `No source ${id} in this answer. Use an id from a search result.` };
      if (!isAllowedSourceUrl(src.url)) { reg.setReadError(src.id, "site not on the read list"); return { ok: false, id: src.id, error: "Lex can't read this site. Cite it without a pinpoint." }; }
      if (!reg.text(src.id)) {
        if (reg.reads >= MAX_READS_PER_ANSWER) return { ok: false, id: src.id, error: "Read limit reached for this answer. Cite without a pinpoint." };
        reg.reads++;
        const page = await read(src.url);
        if (!page.ok) { reg.setReadError(src.id, page.error); return { ok: false, id: src.id, error: page.error }; }
        reg.setText(src.id, page.text);
      }
      const { excerpt, pinpointFound } = excerptFor(reg.text(src.id)!, pinpoint);
      return { ok: true, id: src.id, title: src.title, type: src.typeLabel, pinpointFound, text: excerpt };
    },
  });
  return out as T & { readSource: unknown };
}

/**
 * Last step answers instead of searching again. Without this a run that spends every step on
 * tool calls ends with no text at all (seen in the model eval on a penalty remission question).
 */
export function finalStepAnswers(maxSteps: number) {
  return ({ stepNumber }: { stepNumber: number }) =>
    stepNumber >= maxSteps - 1 ? { toolChoice: "none" as const } : undefined;
}
