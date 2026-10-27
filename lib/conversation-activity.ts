/**
 * Shared hold for sales interrupts (exit popup, slide-in cards, nudge bubbles).
 *
 * Lachie: the browser mic prompt and a tab switch both fire document mouseleave
 * with clientY <= 0. That is the exit-intent trigger. A call also outlasts the
 * 35s timer. Once a call attempt starts, this page view stays held.
 * Text chat: held while the widget is open, and for a few minutes after a
 * visitor message. Same signal for Mia and the other widgets.
 */

export const LACHIE_GRACE_MS = 60_000;
export const CHAT_RECENT_MS = 3 * 60_000;

export type LachiePhase = "idle" | "consent" | "connecting" | "live" | "ended" | "error";

export type ConversationHold =
  | { kind: "lachie-live" }
  | { kind: "lachie-consent" }
  | { kind: "lachie-page" }
  | { kind: "lachie-grace"; until: number }
  | { kind: "chat-open"; id: string }
  | { kind: "chat-recent"; id: string; until: number };

type ChatHold = { open: boolean; lastMessageAt: number };

const lachie = {
  consent: false,
  live: false,
  pageLocked: false,
  graceUntil: 0,
};

const chats = new Map<string, ChatHold>();
const listeners = new Set<() => void>();
let recheck: ReturnType<typeof setTimeout> | null = null;

function chatHold(id: string): ChatHold {
  let row = chats.get(id);
  if (!row) {
    row = { open: false, lastMessageAt: 0 };
    chats.set(id, row);
  }
  return row;
}

function clearRecheck() {
  if (recheck) clearTimeout(recheck);
  recheck = null;
}

/** When the current hold can expire on its own, wake listeners so a waiting popup can decide again. */
function scheduleRecheck(now: number) {
  clearRecheck();
  if (lachie.live || lachie.consent || lachie.pageLocked) return;
  let at: number | null = lachie.graceUntil > now ? lachie.graceUntil : null;
  for (const chat of chats.values()) {
    if (chat.open) return;
    if (chat.lastMessageAt > 0) {
      const until = chat.lastMessageAt + CHAT_RECENT_MS;
      if (until > now && (at === null || until < at)) at = until;
    }
  }
  if (at === null) return;
  recheck = setTimeout(() => {
    recheck = null;
    emit();
  }, Math.max(0, at - now));
}

function emit() {
  for (const listener of [...listeners]) listener();
  scheduleRecheck(Date.now());
}

export function conversationHold(now = Date.now()): ConversationHold | null {
  if (lachie.live) return { kind: "lachie-live" };
  if (lachie.consent) return { kind: "lachie-consent" };
  if (lachie.pageLocked) return { kind: "lachie-page" };
  if (lachie.graceUntil > now) return { kind: "lachie-grace", until: lachie.graceUntil };
  for (const [id, chat] of chats) {
    if (chat.open) return { kind: "chat-open", id };
    if (chat.lastMessageAt > 0 && now - chat.lastMessageAt < CHAT_RECENT_MS) {
      return { kind: "chat-recent", id, until: chat.lastMessageAt + CHAT_RECENT_MS };
    }
  }
  return null;
}

export function interruptBlocked(now = Date.now()): boolean {
  return conversationHold(now) !== null;
}

/** True after a Lachie attempt in this document. The exit popup stays off for the rest of the view. */
export function lachieHoldsPage(): boolean {
  return lachie.pageLocked;
}

export function lachieGraceUntil(): number {
  return lachie.graceUntil;
}

export function setLachiePhase(phase: LachiePhase, now = Date.now()): void {
  if (phase === "consent") {
    lachie.consent = true;
  } else if (phase === "connecting" || phase === "live") {
    lachie.consent = false;
    lachie.live = true;
    lachie.pageLocked = true;
    lachie.graceUntil = 0;
  } else if (phase === "ended" || phase === "error") {
    lachie.consent = false;
    lachie.live = false;
    lachie.pageLocked = true;
    lachie.graceUntil = now + LACHIE_GRACE_MS;
  } else {
    lachie.consent = false;
    lachie.live = false;
  }
  emit();
}

export function setChatOpen(id: string, open: boolean): void {
  chatHold(id).open = open;
  emit();
}

export function noteVisitorMessage(id: string, at = Date.now()): void {
  const row = chatHold(id);
  if (at > row.lastMessageAt) row.lastMessageAt = at;
  emit();
}

export function subscribeConversationActivity(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetConversationActivity(): void {
  lachie.consent = false;
  lachie.live = false;
  lachie.pageLocked = false;
  lachie.graceUntil = 0;
  chats.clear();
  clearRecheck();
  emit();
}

/**
 * Real exit intent is the pointer leaving through the top while the page still has focus.
 * A mic permission prompt and a tab switch also produce mouseleave at clientY <= 0,
 * but the document has lost focus or is hidden. Those are not exit intent.
 */
export function isExitIntentLeave(
  event: { clientY: number },
  doc: { visibilityState?: string; hasFocus?: () => boolean } = {},
): boolean {
  if (event.clientY > 0) return false;
  if (doc.visibilityState === "hidden") return false;
  if (doc.hasFocus && !doc.hasFocus()) return false;
  return true;
}

/** Iframe chats (the LeadGen demo) publish into the parent page, same origin only. */
export function applyConversationMessage(data: unknown, origin: string, pageOrigin: string): void {
  if (!pageOrigin || origin !== pageOrigin) return;
  if (!data || typeof data !== "object") return;
  const msg = data as { source?: unknown; id?: unknown; open?: unknown; message?: unknown };
  if (msg.source !== "saabai-conversation") return;
  if (typeof msg.id !== "string" || !msg.id) return;
  if (typeof msg.open === "boolean") setChatOpen(msg.id, msg.open);
  if (msg.message === true) noteVisitorMessage(msg.id);
}

export function postConversationToParent(message: { id: string; open?: boolean; message?: boolean }): void {
  if (typeof window === "undefined" || window.parent === window) return;
  window.parent.postMessage({ source: "saabai-conversation", ...message }, window.location.origin);
}

export function installConversationBridge(): () => void {
  if (typeof window === "undefined") return () => {};
  const onMessage = (event: MessageEvent) => {
    applyConversationMessage(event.data, event.origin, window.location.origin);
  };
  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
}
