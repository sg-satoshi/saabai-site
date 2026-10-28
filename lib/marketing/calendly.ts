/**
 * Calendly popup for saabai.ai booking links.
 * The script is loaded lazily. A normal click opens the popup so Calendly can
 * post calendly.event_scheduled. If the script fails, the link opens in a new tab.
 */

export const CALENDLY_WIDGET_SRC = "https://assets.calendly.com/assets/external/widget.js";
export const CALENDLY_WIDGET_CSS = "https://assets.calendly.com/assets/external/widget.css";

export function calendlyPopupUrl(href: string): string | null {
  try {
    const url = new URL(href);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:") return null;
    if (host !== "calendly.com" && host !== "www.calendly.com") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Popup only for a plain left click. Modified clicks keep the browser default. */
export function calendlyClickAction(input: {
  href: string;
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
  widgetReady: boolean;
  widgetFailed: boolean;
}): "popup" | "wait" | "native" {
  if (input.defaultPrevented || input.button !== 0) return "native";
  if (input.metaKey || input.ctrlKey || input.shiftKey || input.altKey) return "native";
  if (!calendlyPopupUrl(input.href)) return "native";
  if (input.widgetFailed) return "native";
  if (input.widgetReady) return "popup";
  return "wait";
}
