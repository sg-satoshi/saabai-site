/** LeadGen widget button label. Comes from client settings, then businessHours. */
export const LEGACY_WIDGET_LABEL = "24/7 Emergency Help";
export const DEFAULT_WIDGET_LABEL = "Chat with us";

export function widgetButtonLabel(client: { widgetButtonLabel?: string; businessHours?: string } | null | undefined): string {
  const custom = client?.widgetButtonLabel?.trim();
  if (custom) return custom.slice(0, 40);
  // No client found (or lookup failed): keep the label every widget showed before this change.
  if (!client) return LEGACY_WIDGET_LABEL;
  return client.businessHours?.trim() === "24/7" ? LEGACY_WIDGET_LABEL : DEFAULT_WIDGET_LABEL;
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
