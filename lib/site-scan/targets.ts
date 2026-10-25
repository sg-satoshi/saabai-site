/**
 * Scanner target hygiene: one row per site.
 * Normalises URLs (lowercase host, no www, decoded and slugified /sites/<slug>, trailing slash)
 * and dedupes the factory list before scanning.
 */

export type ScanTarget = { slug: string; name: string; url: string; kind: "live" | "preview" };

const SHARED_HOSTS = new Set(["saabai.ai"]);

export function slugify(s: string): string {
  let d = s;
  try { d = decodeURIComponent(s); } catch { /* keep raw */ }
  return d.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Canonical form of a scan URL, or null if it is not a usable http(s) URL. */
export function normaliseScanUrl(raw: string): string | null {
  let u: URL;
  try { u = new URL(String(raw ?? "").trim()); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || !u.hostname) return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  if (SHARED_HOSTS.has(host)) {
    const m = u.pathname.match(/^\/sites\/([^/]+)/i);
    if (m) {
      const slug = slugify(m[1]);
      return slug ? `https://www.${host}/sites/${slug}/` : null;
    }
  }
  return `https://${host}/`;
}

/** Storage key used for score history: host plus /sites/<slug> on shared hosts. */
export function domainKey(url: string): string | null {
  const n = normaliseScanUrl(url);
  if (!n) return null;
  const u = new URL(n);
  const host = u.hostname.replace(/^www\./, "");
  const sub = u.pathname.match(/^\/sites\/[a-z0-9-]+/);
  return sub ? `${host}${sub[0]}` : host;
}

/** A plain slug name like "nico-moretti" is a worse label than a real business name. */
const nameScore = (n: string) => (/\s/.test(n) ? 2 : 0) + (/[A-Z]/.test(n) ? 1 : 0);

export function dedupeTargets(list: { slug: string; name: string; url: string }[]): ScanTarget[] {
  const by = new Map<string, ScanTarget>();
  for (const t of list) {
    const url = normaliseScanUrl(t.url);
    if (!url) continue;
    const kind: ScanTarget["kind"] = /^https:\/\/www\.saabai\.ai\/sites\//.test(url) ? "preview" : "live";
    const cur = by.get(url);
    const cand: ScanTarget = { slug: slugify(t.slug) || slugify(t.name) || url, name: (t.name || t.slug).trim(), url, kind };
    if (!cur || nameScore(cand.name) > nameScore(cur.name)) by.set(url, cand);
  }
  return [...by.values()];
}

/**
 * Cleanup plan for saved history keys. A key is kept when it is already canonical.
 * Pass knownSubSites (history keys of real factory sites) so bad-slug /sites/ keys are dropped, not renamed.
 * Non-canonical keys are either duplicates of a canonical key (merge then drop) or invalid (drop).
 */
export function planDomainCleanup(domains: string[], knownSubSites?: Set<string>): { keep: string[]; merge: { from: string; to: string }[]; drop: string[] } {
  const keep: string[] = []; const merge: { from: string; to: string }[] = []; const drop: string[] = [];
  for (const d of domains) {
    const key = domainKey(`https://${d}/`);
    // A /sites/ key must belong to a real factory site, else it came from a bad slug (e.g. "Tributum%20Law" saved as "Tributum").
    const unknownSub = !!key && key.startsWith("saabai.ai/sites/") && !!knownSubSites && !knownSubSites.has(key);
    if (key === d && !unknownSub) keep.push(d);
    else if (key && !unknownSub) merge.push({ from: d, to: key });
    else drop.push(d);
  }
  return { keep, merge, drop };
}
