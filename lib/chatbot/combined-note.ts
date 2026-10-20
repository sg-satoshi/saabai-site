/** Short line under a combined chatbot row. No em dashes. */

export function combinedCopyNote(slug: string, folded: { slug: string }[]): string {
  if (!folded.length) return "";
  const copies = folded.length === 1 ? "1 other copy is combined into this row." : `${folded.length} other copies are combined into this row.`;
  const slugs = [...new Set(folded.map((f) => f.slug).filter((s) => s && s !== slug))];
  return slugs.length ? `${copies} Counts include ${slugs.join(", ")}.` : copies;
}
