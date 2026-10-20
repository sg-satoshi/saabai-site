/** Addresses a chatbot row opens. The slug is the canonical site slug. */

export function chatbotPagePath(slug: string): string {
  return `/saabai-admin/chatbots/${encodeURIComponent(slug)}`;
}

export function chatbotEditorPath(slug: string): string {
  return `${chatbotPagePath(slug)}#editor`;
}

export function chatbotPlanPath(slug: string): string {
  return `${chatbotPagePath(slug)}#plan`;
}

export function chatbotHistoryPath(slug: string): string {
  return `/saabai-admin/chatbots/history?bot=${encodeURIComponent(slug)}`;
}

/** Bespoke routes log under a short bot id, not the site slug. */
const LOG_ALIASES: Record<string, string[]> = {
  "bo-consultancy": ["bo"],
  "lmm-site": ["lmm"],
  "nico-moretti": ["nico"],
  "tributum-law": ["tributum"],
  "tributum-law-v2": ["tributum"],
  "Tributum Law": ["tributum"],
};

/** Bot ids to read when the history page is filtered to this site. */
export function historyBotIds(slug: string, extraSlugs: string[] = []): string[] {
  const ids = new Set<string>();
  for (const s of [slug, ...extraSlugs]) {
    const t = s.trim();
    if (!t) continue;
    ids.add(t);
    for (const alias of LOG_ALIASES[t] ?? []) ids.add(alias);
  }
  return [...ids];
}

export function rowForSlug<T extends { slug: string; folded?: { slug: string }[] }>(rows: T[], slug: string): T | null {
  let want = slug;
  try { want = decodeURIComponent(slug); } catch { /* keep the raw slug */ }
  want = want.trim();
  if (!want) return null;
  return rows.find((r) => r.slug === want) ?? rows.find((r) => (r.folded ?? []).some((f) => f.slug === want)) ?? null;
}
