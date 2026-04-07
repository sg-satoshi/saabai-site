/**
 * Lex Legal Research Tools
 *
 * Real-time search across Australian (and international) legal databases:
 *   searchAustLII       — Australian case law, tribunal decisions, legislation summaries
 *   searchATO           — ATO rulings, interpretive decisions, tax cases, guides
 *   searchLegislation   — Federal Register of Legislation (Acts + Regulations)
 *   searchInternational — BAILII (UK), NZLII (NZ), WorldLII for comparative law
 *
 * Requires SERPER_API_KEY (serper.dev) — add to Vercel environment variables.
 * Without it every tool returns a graceful "not configured" message so Lex
 * can still answer from its training knowledge and tell the user to verify.
 */

export interface LegalSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface LegalSearchResponse {
  results: LegalSearchResult[];
  query: string;
  source: string;
  error?: string;
}

async function siteSearch(
  query: string,
  site: string,
  sourceLabel: string,
  numResults = 6
): Promise<LegalSearchResponse> {
  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey) {
    return {
      results: [],
      query,
      source: sourceLabel,
      error:
        "Search API not configured — add SERPER_API_KEY to Vercel environment variables to enable live legal database search.",
    };
  }

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: `site:${site} ${query}`, num: numResults }),
    });

    if (!res.ok) {
      return {
        results: [],
        query,
        source: sourceLabel,
        error: `Search returned HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const organic: Array<{ title?: string; link?: string; snippet?: string }> =
      data.organic ?? [];

    return {
      results: organic.map((r) => ({
        title: r.title ?? "",
        url: r.link ?? "",
        snippet: r.snippet ?? "",
        source: sourceLabel,
      })),
      query,
      source: sourceLabel,
    };
  } catch (err) {
    return {
      results: [],
      query,
      source: sourceLabel,
      error: String(err),
    };
  }
}

/**
 * Search AustLII — the Australasian Legal Information Institute.
 * Covers: High Court, Federal Court, all State/Territory Supreme Courts,
 * AAT, VCAT, NCAT, QCAT, and 1000+ other tribunals and databases.
 *
 * @param query     Free-text legal query
 * @param jurisdiction  Optional: "HCA" | "FCA" | "NSWSC" | "VSC" | "QSC" | "WASC" etc.
 */
export async function searchAustLII(
  query: string,
  jurisdiction?: string
): Promise<LegalSearchResponse> {
  const q = jurisdiction ? `${query} ${jurisdiction}` : query;
  return siteSearch(q, "austlii.edu.au", "AustLII");
}

/**
 * Search the Australian Taxation Office website.
 * Covers: public and private rulings, ATO interpretive decisions,
 * tax cases, guides, practice statements, and legislative instruments.
 */
export async function searchATO(query: string): Promise<LegalSearchResponse> {
  return siteSearch(query, "ato.gov.au", "ATO");
}

/**
 * Search the Federal Register of Legislation (legislation.gov.au).
 * Covers: Commonwealth Acts, Regulations, Legislative Instruments,
 * Notifiable Instruments, and Prerogative Instruments.
 *
 * @param query  Act name, regulation name, or topic
 */
export async function searchLegislation(
  query: string
): Promise<LegalSearchResponse> {
  return siteSearch(query, "legislation.gov.au", "Federal Register of Legislation");
}

/**
 * Search international legal databases for comparative law.
 * Covers: BAILII (UK/Ireland), NZLII (New Zealand), WorldLII (multi-jurisdiction).
 * Useful for common law comparisons, treaty interpretation, and international cases.
 *
 * @param query   Legal query
 * @param source  "bailii" | "nzlii" | "worldlii" — defaults to worldlii
 */
export async function searchInternational(
  query: string,
  source: "bailii" | "nzlii" | "worldlii" = "worldlii"
): Promise<LegalSearchResponse> {
  const sites: Record<string, { site: string; label: string }> = {
    bailii: { site: "bailii.org", label: "BAILII (UK/Ireland)" },
    nzlii: { site: "nzlii.org", label: "NZLII (New Zealand)" },
    worldlii: { site: "worldlii.org", label: "WorldLII" },
  };
  const { site, label } = sites[source];
  return siteSearch(query, site, label);
}
