"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { usePathname } from "next/navigation";
import type { UIMessage } from "ai";
import { track } from "../../lib/analytics";

const STORAGE_KEY = "saabai-conversation";
const STORAGE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function loadStoredConversation(): UIMessage[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { messages, timestamp } = JSON.parse(raw);
    if (Date.now() - new Date(timestamp).getTime() > STORAGE_TTL) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (!Array.isArray(messages) || messages.length <= 1) return null;
    return messages as UIMessage[];
  } catch {
    return null;
  }
}

function saveConversation(messages: UIMessage[]) {
  try {
    if (messages.length <= 1) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, timestamp: new Date().toISOString() }));
  } catch {}
}

const INITIAL_MESSAGES: UIMessage[] = [
  {
    id: "initial",
    role: "assistant",
    parts: [{ type: "text", text: "Hey, I'm Mia. What brings you to Saabai today?" }],
  },
];

// Pages where Mia proactively opens after a delay, with a page-specific opener
const PROACTIVE_PAGES: Record<string, string> = {
  "/calculator": "Looks like you've been running some numbers. What came up for you?",
  "/services": "Hey, Mia here. Anything on the services page I can help clarify?",
  "/use-cases": "Seeing anything in there that looks familiar for your business?",
  "/process": "Checking out how it all works? Happy to walk you through it.",
  "/about": "Hey, Mia here. Any questions about the team or how Saabai works?",
};

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n\n");
}

function renderMessageText(text: string): React.ReactNode[] {
  const parts = text.split(/(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline break-all opacity-80 hover:opacity-100 transition-opacity"
      >
        {part}
      </a>
    ) : (
      part
    )
  );
}

function MiaAvatar({ size = 36, dotSize = 10, showDot = true }: { size?: number; dotSize?: number; showDot?: boolean }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="rounded-full overflow-hidden border border-saabai-teal/30 bg-saabai-teal/10 w-full h-full">
        <img
          src="/brand/agent-avatar.png"
          alt="Mia"
          width={size}
          height={size}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = "none";
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `<span style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--saabai-teal);font-weight:700;font-size:${Math.round(size * 0.38)}px">M</span>`;
            }
          }}
        />
      </div>
      {showDot && (
        <span
          className="absolute rounded-full bg-emerald-400"
          style={{ width: dotSize, height: dotSize, bottom: 0, right: 0, border: "2px solid var(--saabai-bg)" }}
        />
      )}
    </div>
  );
}

function BouncingDots() {
  return (
    <>
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "120ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "240ms" }} />
    </>
  );
}

export default function ChatWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [returningVisitor, setReturningVisitor] = useState(false);

  // Conversation end state
  const [isEnded, setIsEnded] = useState(false);
  const [endEmail, setEndEmail] = useState("");
  const [endSubmitting, setEndSubmitting] = useState(false);
  const [endSubmitted, setEndSubmitted] = useState(false);

  // Mia tool-triggered states
  const [showBookingCTA, setShowBookingCTA] = useState(false);
  const [showLeadCapture, setShowLeadCapture] = useState(false);

  // Lead capture form
  const [leadForm, setLeadForm] = useState({ name: "", email: "", sendTranscript: true });
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);

  const [inputValue, setInputValue] = useState("");
  const [thinkingDelay, setThinkingDelay] = useState(false);
  const transcriptSentRef = useRef(false);
  const hasTrackedFirstMessage = useRef(false);
  const processedTools = useRef(new Set<string>());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const thinkingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamStartRef = useRef<number | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chatOptions: any = { messages: INITIAL_MESSAGES, body: { pageContext: pathname, returningVisitor } };
  const { messages, sendMessage, status, error, setMessages } = useChat(chatOptions);
  const isLoading = status === "submitted" || status === "streaming";

  // Restore stored conversation on mount
  useEffect(() => {
    const stored = loadStoredConversation();
    if (stored) {
      setMessages(stored);
      setReturningVisitor(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist conversation to localStorage on every update
  useEffect(() => {
    if (messages.length > 1) saveConversation(messages);
  }, [messages]);

  // Proportional thinking delay — longer for longer responses
  useEffect(() => {
    if (status === "submitted") {
      setThinkingDelay(true);
      streamStartRef.current = null;
      if (thinkingTimer.current) clearTimeout(thinkingTimer.current);
      // Base delay 1000–2200ms; will extend if response is short
      thinkingTimer.current = setTimeout(() => setThinkingDelay(false), 1000 + Math.random() * 1200);
    }
    if (status === "streaming" && !streamStartRef.current) {
      streamStartRef.current = Date.now();
    }
    if (status === "ready" && streamStartRef.current) {
      // If response streamed in under 400ms it was very short — add a little extra delay
      const streamDuration = Date.now() - streamStartRef.current;
      if (streamDuration < 400 && thinkingDelay) {
        if (thinkingTimer.current) clearTimeout(thinkingTimer.current);
        thinkingTimer.current = setTimeout(() => setThinkingDelay(false), 600);
      }
      streamStartRef.current = null;
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (thinkingTimer.current) clearTimeout(thinkingTimer.current); }, []);

  const showTypingIndicator = isLoading || thinkingDelay;

  const userMessages = messages.filter((m) => m.role === "user");
  const hasEnoughForTranscript = userMessages.length > 0;
  const hasGenuineDialogue = userMessages.length > 2;

  // During the thinking delay, hide the incoming assistant message so dots show instead
  const latestAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;
  const displayMessages = messages.filter((m) => {
    if (!getMessageText(m).trim()) return false;
    if (thinkingDelay && m.role === "assistant" && m.id === latestAssistantId && m.id !== "initial") return false;
    return true;
  });

  // ── Proactive bubble ─────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("saabai-chat-seen")) return;
    const timer = setTimeout(() => {
      setShowBubble(true);
      track("bubble_shown");
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // ── Pulse launcher ───────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) return;
    const interval = setInterval(() => {
      setPulsing(true);
      setTimeout(() => setPulsing(false), 900);
    }, 10000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // ── Proactive trigger — auto-opens on high-intent pages ──────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const proactiveMsg = PROACTIVE_PAGES[pathname];
    if (!proactiveMsg) return;
    if (isOpen) return;
    if (returningVisitor) return;
    if (sessionStorage.getItem("saabai-proactive-shown")) return;
    if (localStorage.getItem("saabai-chat-seen")) return;

    const timer = setTimeout(() => {
      sessionStorage.setItem("saabai-proactive-shown", "1");
      localStorage.setItem("saabai-chat-seen", "1");
      setMessages([{ id: "initial", role: "assistant", parts: [{ type: "text", text: proactiveMsg }] }]);
      setIsOpen(true);
      setShowBubble(false);
      track("proactive_trigger", { page: pathname });
    }, 10000);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isOpen, returningVisitor]);

  // ── Auto-scroll ──────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isEnded]);

  // ── Tool detection ───────────────────────────────────────────────────
  useEffect(() => {
    for (const message of messages) {
      for (const part of message.parts ?? []) {
        if (!part.type.startsWith("tool-")) continue;
        if ((part as { state?: string }).state !== "output-available") continue;
        const id = (part as { toolCallId?: string }).toolCallId;
        if (!id || processedTools.current.has(id)) continue;
        processedTools.current.add(id);
        const toolName = part.type.slice(5);
        if (toolName === "show_booking_cta") { setShowBookingCTA(true); track("cta_shown"); }
        if (toolName === "capture_lead") setShowLeadCapture(true);
        if (toolName === "qualify_lead") {
          const a = (part as { input?: Record<string, boolean> }).input ?? {};
          const score = [a.business_fit, a.pain_point_named, a.automation_potential].filter(Boolean).length;
          if (score >= 2) track("lead_qualified", { ...a, score });
        }
      }
    }
  }, [messages]);

  // ── Handlers ─────────────────────────────────────────────────────────

  function openWidget() {
    setIsOpen(true);
    setShowBubble(false);
    localStorage.setItem("saabai-chat-seen", "1");
    track("widget_opened");
  }

  function closeWidget() {
    setIsOpen(false);
  }

  function endConversation() {
    setIsEnded(true);
    localStorage.removeItem(STORAGE_KEY);
    track("conversation_ended", { messageCount: messages.length });
  }

  async function submitEndPanel(skipEmail: boolean) {
    if (transcriptSentRef.current) return;
    // Only send operator transcript if genuine dialogue (>2 user messages)
    if (!hasGenuineDialogue && skipEmail) { setEndSubmitted(true); return; }
    transcriptSentRef.current = true;
    setEndSubmitting(true);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: hasGenuineDialogue ? "chat_ended" : "chat_ended_short",
          email: skipEmail ? undefined : endEmail.trim() || undefined,
          sendTranscript: !skipEmail && !!endEmail.trim(),
          timestamp: new Date().toISOString(),
          conversation: messages.map((m) => ({ role: m.role, content: getMessageText(m) })),
        }),
      });
      if (!skipEmail && endEmail.trim()) {
        track("transcript_requested", { email: endEmail.trim() });
      }
      setEndSubmitted(true);
    } finally {
      setEndSubmitting(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || isLoading || thinkingDelay) return;
    if (!hasTrackedFirstMessage.current) {
      hasTrackedFirstMessage.current = true;
      track("first_message_sent");
    }
    setInputValue("");
    await sendMessage({ text });
  }

  async function submitLeadCapture() {
    if (!leadForm.name.trim() || !leadForm.email.trim()) return;
    setLeadSubmitting(true);
    transcriptSentRef.current = true;
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadForm.name,
          email: leadForm.email,
          sendTranscript: leadForm.sendTranscript,
          source: "chat_widget",
          timestamp: new Date().toISOString(),
          conversation: messages.map((m) => ({ role: m.role, content: getMessageText(m) })),
        }),
      });
      track("lead_captured", { email: leadForm.email });
      setLeadSubmitted(true);
    } finally {
      setLeadSubmitting(false);
    }
  }

  const launcherShadow = pulsing
    ? "0 0 0 5px rgba(98,197,209,0.15), 0 8px 36px rgba(98,197,209,0.45), 0 4px 16px rgba(0,0,0,0.35)"
    : "0 0 28px rgba(98,197,209,0.28), 0 4px 16px rgba(0,0,0,0.3)";

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="fixed bottom-6 md:bottom-14 right-6 z-[60] flex flex-col items-end gap-3">

      {/* ── Proactive bubble ─────────────────────────────────────────── */}
      {showBubble && !isOpen && (
        <div className="w-80 border border-saabai-teal/25 rounded-2xl relative overflow-hidden" style={{ background: "#1c1a52", boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 32px rgba(98,197,209,0.2)" }}>
          <div className="h-px absolute top-0 left-8 right-8 bg-gradient-to-r from-transparent via-saabai-teal/40 to-transparent" />
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-saabai-teal/15">
            <div className="flex items-center gap-3">
              <MiaAvatar size={36} dotSize={10} />
              <div>
                <p className="text-sm font-semibold text-saabai-text tracking-tight leading-none mb-0.5">Mia</p>
                <p className="text-[10px] text-saabai-text-dim tracking-wide leading-none mb-1">AI Automation Advisor</p>
                <p className="text-[10px] text-saabai-text-dim tracking-wide">Usually replies within a minute</p>
              </div>
            </div>
            <button onClick={() => setShowBubble(false)} className="w-5 h-5 flex items-center justify-center text-saabai-text-dim hover:text-saabai-text transition-colors text-lg leading-none" aria-label="Dismiss">×</button>
          </div>
          <div className="p-4">
            <p className="text-sm text-saabai-text-muted leading-relaxed mb-3">Quick question — are you exploring how automation could save your team time?</p>
            <button onClick={openWidget} className="text-xs font-semibold text-saabai-teal hover:text-saabai-teal-bright transition-colors tracking-wide">Yes, tell me more →</button>
          </div>
        </div>
      )}

      {/* ── Chat panel ───────────────────────────────────────────────── */}
      {isOpen && (
        <div className="w-[380px] max-w-[calc(100vw-24px)] h-[520px] rounded-2xl flex flex-col overflow-hidden" style={{ background: "#1c1a52", border: "1px solid rgba(98,197,209,0.25)", boxShadow: "0 8px 48px rgba(0,0,0,0.7), 0 0 40px rgba(98,197,209,0.2)" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 shrink-0 relative" style={{ borderBottom: "1px solid rgba(98,197,209,0.15)", background: "#201e5c" }}>
            <div className="h-px absolute top-0 left-8 right-8 bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent" />
            <div className="flex items-center gap-3">
              <MiaAvatar size={40} dotSize={11} showDot={!isEnded} />
              <div>
                <p className="text-sm font-semibold text-saabai-text tracking-tight leading-none mb-0.5">Mia</p>
                <p className="text-[10px] text-saabai-text-dim tracking-wide leading-none mb-1">AI Automation Advisor</p>
                <p className="text-[10px] text-saabai-text-dim tracking-wide">
                  {isEnded ? "Conversation ended" : "Usually replies within a minute"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* End chat — only show once user has sent a message and conversation isn't ended */}
              {hasEnoughForTranscript && !isEnded && (
                <button
                  onClick={endConversation}
                  className="text-[10px] font-medium text-saabai-text-dim hover:text-saabai-teal transition-colors tracking-wide"
                >
                  End chat
                </button>
              )}
              <button
                onClick={closeWidget}
                className="text-saabai-text-dim hover:text-saabai-text transition-colors p-1 rounded-lg hover:bg-saabai-surface-raised"
                aria-label="Minimise chat"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 4l5 6 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={closeWidget}
                className="text-saabai-text-dim hover:text-saabai-text transition-colors p-1 rounded-lg hover:bg-saabai-surface-raised"
                aria-label="Close chat"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">

            {displayMessages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] px-4 py-3 rounded-xl text-sm leading-relaxed ${
                    message.role === "user" ? "bg-saabai-teal text-saabai-bg font-medium" : "text-saabai-text-muted"
                  }`}
                  style={message.role !== "user" ? { background: "#272466" } : {}}
                >
                  {renderMessageText(getMessageText(message))}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {showTypingIndicator && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-xl flex items-center gap-1.5" style={{ background: "#272466" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-saabai-text-dim animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-saabai-text-dim animate-bounce" style={{ animationDelay: "120ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-saabai-text-dim animate-bounce" style={{ animationDelay: "240ms" }} />
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-start">
                <div className="max-w-[82%] px-4 py-3 rounded-xl text-sm bg-saabai-surface-raised text-saabai-text-dim leading-relaxed">
                  Something went wrong. Please try again.
                </div>
              </div>
            )}

            {/* ── Booking CTA (tool-triggered) ── */}
            {showBookingCTA && !isEnded && (
              <div className="mx-1 mt-1">
                <div className="h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent mb-3" />
                <a
                  href="https://calendly.com/shanegoldberg/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("cta_clicked")}
                  className="block w-full text-center bg-saabai-teal text-saabai-bg px-4 py-3 rounded-xl font-semibold text-sm hover:bg-saabai-teal-bright transition-colors tracking-wide shadow-[0_0_20px_var(--saabai-glow-mid)]"
                >
                  Book a Free Strategy Call →
                </a>
                <p className="text-[10px] text-saabai-text-dim text-center mt-2 tracking-wide">Free · 30 minutes · No obligation</p>
              </div>
            )}

            {/* ── Lead capture form (tool-triggered) ── */}
            {showLeadCapture && !leadSubmitted && !isEnded && (
              <div className="mx-1 mt-1 bg-saabai-surface-raised border border-saabai-border rounded-xl overflow-hidden">
                <div className="h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent" />
                <div className="p-4 flex flex-col gap-3">
                  <p className="text-[10px] font-medium tracking-[0.15em] text-saabai-text-dim uppercase">Your Details</p>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={leadForm.name}
                    onChange={(e) => setLeadForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full bg-saabai-bg border border-saabai-border rounded-lg px-3 py-2 text-sm text-saabai-text placeholder:text-saabai-text-dim focus:outline-none focus:border-saabai-teal/60 transition-colors"
                  />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={leadForm.email}
                    onChange={(e) => setLeadForm((f) => ({ ...f, email: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") submitLeadCapture(); }}
                    className="w-full bg-saabai-bg border border-saabai-border rounded-lg px-3 py-2 text-sm text-saabai-text placeholder:text-saabai-text-dim focus:outline-none focus:border-saabai-teal/60 transition-colors"
                  />
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={leadForm.sendTranscript}
                      onChange={(e) => setLeadForm((f) => ({ ...f, sendTranscript: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded accent-saabai-teal cursor-pointer shrink-0"
                    />
                    <span className="text-[11px] text-saabai-text-dim leading-relaxed">Email me a copy of this conversation</span>
                  </label>
                  <button
                    onClick={submitLeadCapture}
                    disabled={!leadForm.name.trim() || !leadForm.email.trim() || leadSubmitting}
                    className="w-full bg-saabai-teal text-saabai-bg px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-saabai-teal-bright transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    {leadSubmitting ? <BouncingDots /> : "Send my details"}
                  </button>
                </div>
              </div>
            )}

            {leadSubmitted && !isEnded && (
              <div className="mx-1 mt-1 bg-saabai-surface-raised border border-saabai-border rounded-xl p-4 text-center">
                <div className="w-6 h-6 rounded-full bg-saabai-teal/20 flex items-center justify-center mx-auto mb-2">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1 6l3.5 3.5L11 2" stroke="var(--saabai-teal)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm text-saabai-text-muted leading-relaxed">Got it — we&apos;ll be in touch within 24 hours.</p>
              </div>
            )}

            {/* ── End conversation panel ── */}
            {isEnded && (
              <div className="mx-1 mt-2 flex flex-col gap-3">

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-saabai-border" />
                  <span className="text-[10px] text-saabai-text-dim tracking-widest uppercase">Conversation ended</span>
                  <div className="flex-1 h-px bg-saabai-border" />
                </div>

                {endSubmitted ? (
                  /* Confirmation state */
                  <div className="bg-saabai-surface-raised border border-saabai-border rounded-xl p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-saabai-teal/20 flex items-center justify-center shrink-0">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M1 6l3.5 3.5L11 2" stroke="var(--saabai-teal)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <p className="text-sm text-saabai-text-muted leading-relaxed">
                        {endEmail.trim() ? "Transcript sent — check your inbox." : "Thanks for chatting with Mia."}
                      </p>
                    </div>
                    <div className="h-px bg-saabai-border" />
                    <p className="text-xs text-saabai-text-dim leading-relaxed">Ready to see what automation could look like for your business?</p>
                    <a
                      href="https://calendly.com/shanegoldberg/30min"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => track("cta_clicked_end")}
                      className="block w-full text-center bg-saabai-teal text-saabai-bg px-4 py-3 rounded-xl font-semibold text-sm hover:bg-saabai-teal-bright transition-colors tracking-wide"
                    >
                      Book a Free Strategy Call →
                    </a>
                    <p className="text-[10px] text-saabai-text-dim text-center tracking-wide">Free · 30 minutes · No obligation</p>
                  </div>
                ) : (
                  /* Email capture state */
                  <div className="bg-saabai-surface-raised border border-saabai-border rounded-xl overflow-hidden">
                    <div className="h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent" />
                    <div className="p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2.5">
                        <MiaAvatar size={28} dotSize={0} showDot={false} />
                        <p className="text-sm text-saabai-text-muted leading-relaxed">
                          Want me to email you a copy of this conversation?
                        </p>
                      </div>
                      <input
                        type="email"
                        placeholder="Your email address"
                        value={endEmail}
                        onChange={(e) => setEndEmail(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && endEmail.trim()) submitEndPanel(false); }}
                        className="w-full bg-saabai-bg border border-saabai-border rounded-lg px-3 py-2 text-sm text-saabai-text placeholder:text-saabai-text-dim focus:outline-none focus:border-saabai-teal/60 transition-colors"
                      />
                      <button
                        onClick={() => submitEndPanel(false)}
                        disabled={!endEmail.trim() || endSubmitting}
                        className="w-full bg-saabai-teal text-saabai-bg px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-saabai-teal-bright transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        {endSubmitting ? <BouncingDots /> : "Send me the transcript"}
                      </button>
                      <button
                        onClick={() => submitEndPanel(true)}
                        disabled={endSubmitting}
                        className="text-[11px] text-saabai-text-dim hover:text-saabai-text-muted transition-colors text-center"
                      >
                        No thanks
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input — hidden when conversation is ended */}
          {!isEnded && (
            <form
              onSubmit={onSubmit}
              className="px-4 py-3 flex items-center gap-2 shrink-0"
              style={{ borderTop: "1px solid rgba(98,197,209,0.15)", background: "#201e5c" }}
            >
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 rounded-xl px-4 py-2.5 text-sm text-saabai-text placeholder:text-saabai-text-dim focus:outline-none transition-colors"
                style={{ background: "#2a2870", border: "1px solid rgba(98,197,209,0.2)" }}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading || thinkingDelay}
                className="w-9 h-9 rounded-xl bg-saabai-teal flex items-center justify-center hover:bg-saabai-teal-bright transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                aria-label="Send"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── Launcher ─────────────────────────────────────────────────── */}
      {!isOpen && (
        <>
          <button
            onClick={openWidget}
            aria-label="Chat with Mia"
            className="hidden md:flex items-center gap-3 pl-2 pr-5 py-2 rounded-full transition-all duration-300 hover:-translate-y-0.5"
            style={{
              background: "var(--saabai-surface)",
              border: "1px solid rgba(98,197,209,0.35)",
              boxShadow: launcherShadow,
              transform: pulsing ? "scale(1.025) translateY(-1px)" : undefined,
            }}
          >
            <MiaAvatar size={38} dotSize={11} />
            <span className="text-sm font-medium text-saabai-text whitespace-nowrap">Ask Mia about automation</span>
          </button>

          <button
            onClick={openWidget}
            aria-label="Chat with Mia"
            className="flex md:hidden rounded-full transition-all duration-300 hover:-translate-y-0.5"
            style={{
              boxShadow: launcherShadow,
              transform: pulsing ? "scale(1.04) translateY(-1px)" : undefined,
            }}
          >
            <MiaAvatar size={56} dotSize={13} />
          </button>
        </>
      )}
    </div>
  );
}
