/**
 * One canonical site record per client.
 *
 * Client key: a real custom domain (not *.saabai.ai / *.vercel.app) when there is one, else the
 * normalised business name ("Tributum Law", "tributum-law", "tributum-law-v2" all become "tributumlaw").
 * Records that share a custom domain or a name key are one client.
 *
 * Canonical pick: factory record with a real custom domain, then one with linked users or billing,
 * then the newest. Everything else in the group is a duplicate.
 */
import type { SiteConfig } from "./site-registry";

const PLATFORM_HOST = /(^|\.)(saabai\.ai|vercel\.app|localhost)$/i;

export function normaliseSlug(s: string): string {
  return (s || "").trim().toLowerCase().replace(/%20/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function nameKey(s: Pick<SiteConfig, "name" | "slug" | "business">): string {
  const base = s.business?.name || s.name || s.slug || "";
  return base.toLowerCase().replace(/%20/g, " ").replace(/\bv\d+\b/g, "").replace(/[^a-z0-9]/g, "");
}

function host(u?: string): string {
  try { return u ? new URL(u.includes("://") ? u : `https://${u}`).host.toLowerCase().replace(/^www\./, "") : ""; } catch { return ""; }
}

export function customDomains(s: SiteConfig): string[] {
  const all = [...(s.domains ?? []), s.externalUrl, s.url].map((d) => host(d || "")).filter(Boolean);
  return [...new Set(all.filter((h) => !PLATFORM_HOST.test(h)))];
}

export type SiteLinks = { users: string[]; billing: boolean };
export type DedupeGroup = {
  client: string;
  keep: { id: string; slug: string; name: string; why: string };
  merge: { id: string; slug: string; name: string; hardcoded: boolean }[];
  repointUsers: { userId: string; from: string; to: string }[];
  /** Duplicates that hold a billing record: kept until billing is moved by hand (billing logic is untouched). */
  billingHold: string[];
};

export function planDedupe(sites: SiteConfig[], links: (siteId: string) => SiteLinks, hardcodedIds: Set<string> = new Set()): DedupeGroup[] {
  // Union-find over shared name keys and shared custom domains.
  const parent = new Map<string, string>();
  const find = (x: string): string => { const p = parent.get(x) ?? x; if (p === x) return x; const r = find(p); parent.set(x, r); return r; };
  const union = (a: string, b: string) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(rb, ra); };
  const seen = new Map<string, string>();
  for (const s of sites) {
    parent.set(s.id, s.id);
    for (const k of [`n:${nameKey(s)}`, ...customDomains(s).map((d) => `d:${d}`)]) {
      if (k === "n:") continue;
      const prev = seen.get(k);
      if (prev) union(prev, s.id); else seen.set(k, s.id);
    }
  }
  const groups = new Map<string, SiteConfig[]>();
  for (const s of sites) { const r = find(s.id); groups.set(r, [...(groups.get(r) ?? []), s]); }

  const rank = (s: SiteConfig) => {
    const l = links(s.id);
    const real = s.source === "factory" && customDomains(s).length > 0 && !hardcodedIds.has(s.id) ? 1 : 0;
    const linked = l.users.length > 0 || l.billing ? 1 : 0;
    const archived = s.status === "archived" ? 0 : 1;
    return [real, linked, archived, s.createdAt || 0] as const;
  };
  const cmp = (a: SiteConfig, b: SiteConfig) => { const ra = rank(a), rb = rank(b); for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return rb[i] - ra[i]; return a.id.localeCompare(b.id); };

  const out: DedupeGroup[] = [];
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const sorted = [...members].sort(cmp);
    const keep = sorted[0];
    const r = rank(keep);
    const why = r[0] ? "factory record with a custom domain" : r[1] ? "has linked users or billing" : "newest";
    const dupes = sorted.slice(1);
    out.push({
      client: keep.business?.name || keep.name,
      keep: { id: keep.id, slug: keep.slug, name: keep.name, why },
      merge: dupes.map((d) => ({ id: d.id, slug: d.slug, name: d.name, hardcoded: hardcodedIds.has(d.id) })),
      repointUsers: dupes.flatMap((d) => links(d.id).users.map((u) => ({ userId: u, from: d.id, to: keep.id }))),
      billingHold: dupes.filter((d) => links(d.id).billing).map((d) => d.id),
    });
  }
  return out.sort((a, b) => a.client.localeCompare(b.client));
}

/** Sites with duplicates folded into their canonical record (for listings and the Linked website dropdown). */
export function canonicalOnly(sites: SiteConfig[], links: (siteId: string) => SiteLinks, hardcodedIds?: Set<string>): SiteConfig[] {
  const drop = new Set(planDedupe(sites, links, hardcodedIds).flatMap((g) => g.merge.map((m) => m.id)));
  return sites.filter((s) => !drop.has(s.id));
}
