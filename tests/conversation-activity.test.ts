/**
 * Exit popup and other sales interrupts stay down during Lachie and text chat.
 *   npx tsx --test tests/conversation-activity.test.ts
 */
import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CHAT_RECENT_MS,
  LACHIE_GRACE_MS,
  applyConversationMessage,
  conversationHold,
  interruptBlocked,
  isExitIntentLeave,
  lachieGraceUntil,
  lachieHoldsPage,
  noteVisitorMessage,
  resetConversationActivity,
  setChatOpen,
  setLachiePhase,
  subscribeConversationActivity,
} from "../lib/conversation-activity";

const read = (file: string) => readFileSync(file, "utf8");

test("Lachie consent holds, and closing it releases, without locking the page", () => {
  resetConversationActivity();
  setLachiePhase("consent", 1_000);
  assert.equal(conversationHold(1_000)?.kind, "lachie-consent");
  assert.equal(lachieHoldsPage(), false);
  setLachiePhase("idle", 1_000);
  assert.equal(interruptBlocked(1_000), false);
});

test("a Lachie attempt locks the page through connect, live, end, cancel and mic denial", () => {
  resetConversationActivity();
  const start = 10_000;
  setLachiePhase("connecting", start);
  assert.equal(conversationHold(start)?.kind, "lachie-live");
  assert.equal(lachieHoldsPage(), true);

  setLachiePhase("live", start + 1_000);
  assert.equal(interruptBlocked(start + 30_000), true);

  setLachiePhase("ended", start + 40_000);
  assert.equal(lachieGraceUntil(), start + 40_000 + LACHIE_GRACE_MS);
  assert.equal(conversationHold(start + 40_000)?.kind, "lachie-page");
  assert.equal(interruptBlocked(start + 40_000 + LACHIE_GRACE_MS + 1), true);

  setLachiePhase("idle", start + 50_000);
  assert.equal(lachieHoldsPage(), true);
  assert.equal(interruptBlocked(start + 90_000), true);
});

test("mic denial and a cancelled connect still lock this page view", () => {
  resetConversationActivity();
  setLachiePhase("connecting", 1);
  setLachiePhase("error", 2);
  assert.equal(lachieHoldsPage(), true);
  assert.equal(lachieGraceUntil(), 2 + LACHIE_GRACE_MS);

  resetConversationActivity();
  setLachiePhase("connecting", 1);
  setLachiePhase("idle", 2);
  assert.equal(lachieHoldsPage(), true);
  assert.equal(interruptBlocked(), true);
});

test("an open chat holds, and a message holds for three minutes after close", () => {
  resetConversationActivity();
  const now = 5_000_000;
  setChatOpen("mia", true);
  assert.deepEqual(conversationHold(now), { kind: "chat-open", id: "mia" });

  noteVisitorMessage("mia", now);
  setChatOpen("mia", false);
  assert.equal(conversationHold(now + CHAT_RECENT_MS - 1)?.kind, "chat-recent");
  assert.equal(interruptBlocked(now + CHAT_RECENT_MS), false);

  resetConversationActivity();
  noteVisitorMessage("lex-demo", now - CHAT_RECENT_MS - 1);
  assert.equal(interruptBlocked(now), false);
});

test("chat grace wakes listeners when it expires", () => {
  mock.timers.enable({ apis: ["setTimeout", "Date"] });
  try {
    mock.timers.setTime(1_000_000);
    resetConversationActivity();
    let calls = 0;
    const unsub = subscribeConversationActivity(() => { calls += 1; });
    const now = Date.now();
    noteVisitorMessage("mia", now);
    setChatOpen("mia", false);
    const mid = calls;
    assert.equal(interruptBlocked(now + 1_000), true);
    mock.timers.tick(CHAT_RECENT_MS);
    assert.ok(calls > mid);
    assert.equal(interruptBlocked(), false);
    unsub();
  } finally {
    mock.timers.reset();
    resetConversationActivity();
  }
});

test("iframe messages apply on the same origin only", () => {
  resetConversationActivity();
  applyConversationMessage({ source: "saabai-conversation", id: "leadgen", open: true }, "https://evil.example", "https://www.saabai.ai");
  assert.equal(interruptBlocked(), false);
  applyConversationMessage({ source: "saabai-conversation", id: "leadgen", message: true }, "https://www.saabai.ai", "https://www.saabai.ai");
  assert.equal(conversationHold()?.kind, "chat-recent");
  applyConversationMessage({ source: "other", id: "mia", open: true }, "https://www.saabai.ai", "https://www.saabai.ai");
  assert.notEqual(conversationHold()?.kind, "chat-open");
  resetConversationActivity();
});

test("mouseleave at the top is exit intent only while the page is visible and focused", () => {
  const focused = { visibilityState: "visible", hasFocus: () => true };
  assert.equal(isExitIntentLeave({ clientY: 0 }, focused), true);
  assert.equal(isExitIntentLeave({ clientY: -8 }, focused), true);
  assert.equal(isExitIntentLeave({ clientY: 12 }, focused), false);
  assert.equal(isExitIntentLeave({ clientY: 0 }, { visibilityState: "hidden", hasFocus: () => true }), false);
  assert.equal(isExitIntentLeave({ clientY: 0 }, { visibilityState: "visible", hasFocus: () => false }), false);
});

test("the voice demo publishes Lachie before the mic prompt", () => {
  const widget = read("app/components/sb/VoiceDemo.tsx");
  const begin = widget.slice(widget.indexOf("async function begin"), widget.indexOf("function hangUp"));
  const signalAt = begin.indexOf('movePhase("connecting")');
  const micAt = begin.indexOf("getUserMedia");
  assert.ok(signalAt !== -1 && micAt !== -1 && signalAt < micAt);
  assert.match(widget, /function movePhase\(next: Phase\) \{\n\s+phaseRef\.current = next;\n\s+setLachiePhase\(next\);/);
  assert.match(widget, /movePhase\("consent"\)/);
  assert.match(widget, /movePhase\("ended"\)/);
  assert.match(widget, /movePhase\("error"\)/);
});

test("interrupts consult the shared hold", () => {
  const popup = read("app/components/EmailCapturePopup.tsx");
  assert.match(popup, /interruptBlocked\(/);
  assert.match(popup, /isExitIntentLeave\(/);
  assert.match(popup, /installConversationBridge\(/);
  assert.match(popup, /showsSaabaiChrome\(/);

  const card = read("app/components/AnnouncementBar.tsx");
  assert.match(card, /lachieHoldsPage\(/);
  assert.match(card, /interruptBlocked\(/);

  const mia = read("app/components/ChatWidget.tsx");
  assert.match(mia, /useChatOpen\("mia", isOpen\)/);
  assert.match(mia, /noteVisitorMessage\("mia"\)/);
  assert.match(mia, /interruptBlocked\(/);

  for (const [file, id] of [
    ["app/components/legal-demos/LexDemoPanel.tsx", "lex-demo"],
    ["app/components/LexWidget.tsx", "lex"],
    ["app/components/LexAvatarWidget.tsx", "lex-avatar"],
    ["app/components/BOChatWidget.tsx", "christina"],
    ["app/components/TributumChatWidget.tsx", "mike"],
    ["app/sites/wholesale-homes/_components/ChatWidget.tsx", "sophie"],
    ["app/lex-widget/page.tsx", "lex-widget"],
    ["app/leadgen-widget/page.tsx", "leadgen"],
  ] as const) {
    const src = read(file);
    assert.match(src, new RegExp(id), file);
    assert.match(src, /noteVisitorMessage|useChatOpen|setChatOpen|postConversationToParent/, file);
  }
});
