/** Monitoring events for a client bot. Stored as counts. Nothing here sends a message. */

export const CHAT_EVENTS = ["conversation_started", "not_sure", "handoff"] as const;
export type ChatEventName = (typeof CHAT_EVENTS)[number];

/** Events a widget may report. "not_sure" is decided from the reply on the server. */
export const WIDGET_EVENTS = ["handoff"] as const;
export type WidgetEventName = (typeof WIDGET_EVENTS)[number];

export function isChatEvent(value: unknown): value is ChatEventName {
  return typeof value === "string" && (CHAT_EVENTS as readonly string[]).includes(value);
}

export function isWidgetEvent(value: unknown): value is WidgetEventName {
  return value === "handoff";
}

/** A reply that should be counted as "not sure". */
export function isNotSureReply(text: string): boolean {
  return /\bnot sure\b/i.test(text);
}

export function eventKey(slug: string, month: string): string {
  return `saabai:chatbot:events:${slug}:${month}`;
}
