/**
 * One chatbot row per client. Ranking comes from lib/site-dedupe.ts (the same helper the
 * Linked website dropdown uses). This file only decides which groups are chatbot rows and
 * which slugs to add together. It does not delete or rewrite anything.
 */
import type { SiteConfig } from "../site-registry";
import { canonicalGroups, customDomains, type SiteLinks } from "../site-dedupe";
import { BESPOKE_SLUGS, SEED_OFF } from "./core";
import { getPersona } from "./personas";
import type { Usage } from "./store";

export function isChatbotListingSite(s: Pick<SiteConfig, "slug" | "chatbot">): boolean {
  return !!s.chatbot?.enabled || SEED_OFF.includes(s.slug) || BESPOKE_SLUGS.includes(s.slug) || !!getPersona(s.slug);
}

export type FoldedCopy = { id: string; slug: string; name: string };

export type ChatbotCanonical = {
  site: SiteConfig;
  /** Distinct slugs. Shared slugs are counted once, because usage is stored per slug. */
  slugs: string[];
  /** Domains from every copy, so search still finds a folded slug's domain. */
  domains: string[];
  /** Copies hidden behind the canonical row. */
  folded: FoldedCopy[];
};

export function chatbotCanonicalRows(sites: SiteConfig[], links: (siteId: string) => SiteLinks, hardcodedIds?: Set<string>): ChatbotCanonical[] {
  return canonicalGroups(sites, links, hardcodedIds)
    .filter(({ copies }) => copies.some(isChatbotListingSite))
    .map(({ site, copies }) => ({
      site,
      slugs: [...new Set(copies.map((c) => c.slug).filter(Boolean))],
      domains: [...new Set(copies.flatMap((c) => [...(c.domains ?? []), ...customDomains(c)]))],
      folded: copies.slice(1).map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
    }));
}

export function sumUsage(parts: Usage[]): Usage {
  return parts.reduce(
    (a, u) => ({
      conversations: a.conversations + u.conversations,
      messages: a.messages + u.messages,
      inputTokens: a.inputTokens + u.inputTokens,
      outputTokens: a.outputTokens + u.outputTokens,
    }),
    { conversations: 0, messages: 0, inputTokens: 0, outputTokens: 0 },
  );
}
