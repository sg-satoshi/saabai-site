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

export function rowForSlug<T extends { slug: string; folded?: { slug: string }[] }>(rows: T[], slug: string): T | null {
  let want = slug;
  try { want = decodeURIComponent(slug); } catch { /* keep the raw slug */ }
  want = want.trim();
  if (!want) return null;
  return rows.find((r) => r.slug === want) ?? rows.find((r) => (r.folded ?? []).some((f) => f.slug === want)) ?? null;
}
