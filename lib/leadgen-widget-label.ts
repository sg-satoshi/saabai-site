/** LeadGen widget button label. Comes from client settings, then businessHours. */
export const LEGACY_WIDGET_LABEL = "24/7 Emergency Help";
export const DEFAULT_WIDGET_LABEL = "Chat with us";
const MAX_LABEL_CHARS = 40;

/** True when businessHours starts with "24/7" (trimmed, case-insensitive). */
export function isAllHours(businessHours?: string): boolean {
  return (businessHours ?? "").trim().toLowerCase().startsWith("24/7");
}

export function widgetButtonLabel(client: { widgetButtonLabel?: string; businessHours?: string } | null | undefined): string {
  const custom = client?.widgetButtonLabel?.trim();
  // Array.from keeps emoji and surrogate pairs whole when capping length.
  if (custom) return Array.from(custom).slice(0, MAX_LABEL_CHARS).join("").trim();
  // No client found or lookup failed: never claim 24/7 help we cannot confirm.
  if (!client) return DEFAULT_WIDGET_LABEL;
  return isAllHours(client.businessHours) ? LEGACY_WIDGET_LABEL : DEFAULT_WIDGET_LABEL;
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
