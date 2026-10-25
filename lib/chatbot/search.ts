/** Admin search: match a site by name, slug, domain, or a folded copy's name or slug. Case-insensitive, all words must match. */
export function matchesSite(q: string, site: { name: string; slug: string; domains?: string[]; aliases?: string[] }): boolean {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = [site.name, site.slug, ...(site.domains ?? []), ...(site.aliases ?? [])].join(" ").toLowerCase();
  return words.every((w) => hay.includes(w));
}
