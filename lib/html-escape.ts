/** Escape text for safe interpolation into HTML (body text or attribute values). */
export function escapeHtml(input: unknown): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Normalise a person's display name from an untrusted form: strip control
 * characters and markup characters, collapse whitespace, cap the length.
 */
export function sanitizeName(input: unknown, max = 60): string {
  return String(input ?? "")
    .replace(/[\u0000-\u001f\u007f<>"'`{}]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Short free-text field (industry, source): same rules, longer cap. */
export function sanitizeShortText(input: unknown, max = 80): string {
  return sanitizeName(input, max);
}
