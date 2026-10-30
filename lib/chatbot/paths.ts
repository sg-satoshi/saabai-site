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

/** Chat history lives at /saabai-admin/chat-history and filters with ?bot=. */
export function chatbotHistoryPath(slug: string): string {
  return `/saabai-admin/chat-history?bot=${encodeURIComponent(slug)}`;
}

/**
 * Log ids for one site. Platform chats are stored under the site slug.
 * Older bespoke routes stored the same chats under a short id (lmm, nico, tributum, bo).
 */
const LOG_ALIASES: Record<string, readonly string[]> = {
  "bo-consultancy": ["bo"],
  "lmm-site": ["lmm"],
  "nico-moretti": ["nico"],
  "tributum-law": ["tributum"],
  "tributum-law-v2": ["tributum"],
  "tributum law": ["tributum"],
};

/** Bot ids to read when chat history is filtered to this site. */
export function historyBotIds(slug: string, extraSlugs: string[] = []): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const add = (value: string) => {
    const t = value.trim();
    if (!t || t.length > 80 || seen.has(t)) return;
    seen.add(t);
    ids.push(t);
  };
  for (const s of [slug, ...extraSlugs]) {
    add(s);
    for (const alias of LOG_ALIASES[s.trim().toLowerCase()] ?? []) add(alias);
  }
  return ids;
}

export function rowForSlug<T extends { slug: string; folded?: { slug: string }[] }>(rows: T[], slug: string): T | null {
  let want = slug;
  try { want = decodeURIComponent(slug); } catch { /* keep the raw slug */ }
  want = want.trim();
  if (!want) return null;
  return rows.find((r) => r.slug === want) ?? rows.find((r) => (r.folded ?? []).some((f) => f.slug === want)) ?? null;
}
