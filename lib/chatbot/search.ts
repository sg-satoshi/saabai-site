/** Admin search: match a site by name, slug or any of its domains. Case-insensitive, all words must match. */
export function matchesSite(q: string, site: { name: string; slug: string; domains?: string[] }): boolean {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = [site.name, site.slug, ...(site.domains ?? [])].join(" ").toLowerCase();
  return words.every((w) => hay.includes(w));
}
