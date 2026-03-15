"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { track } from "../../lib/analytics";

// Static greeting — shown instantly before any API call.
// In AI SDK v6, UIMessage has no `content` field — text lives in parts.
const INITIAL_MESSAGES: UIMessage[] = [
  {
    id: "initial",
    role: "assistant",
    parts: [{ type: "text", text: "Hey, I'm Mia — what brings you to Saabai today?" }],
  },
];

// Extract the visible text content from a UIMessage's parts array.
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n\n");
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);

  // Derived from tool invocation results in message.parts
  const [showBookingCTA, setShowBookingCTA] = useState(false);
  const [showLeadCapture, setShowLeadCapture] = useState(false);

  // Lead capture form state
  const [leadForm, setLeadForm] = useState({ name: "", email: "" });
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);

  // Input is managed locally in AI SDK v6 (not part of useChat)
  const [inputValue, setInputValue] = useState("");

  const hasTrackedFirstMessage = useRef(false);
  const processedTools = useRef(new Set<string>());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // AI SDK v6 API: sendMessage + status. Defaults to /api/chat.
  const { messages, sendMessage, status, error } = useChat({
    messages: INITIAL_MESSAGES,
  });

  const isLoading = status === "submitted" || status === "streaming";

  // ── Proactive bubble — show after 12s on first visit only ───────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("saabai-chat-seen")) return;
    const timer = setTimeout(() => {
      setShowBubble(true);
      track("bubble_shown");
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // ── Auto-scroll to latest message ───────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // ── Detect completed tool calls via message.parts (AI SDK v6) ───────
  // Tool parts: type "tool-{toolName}", state "output-available" = done.
  useEffect(() => {
    for (const message of messages) {
      for (const part of message.parts ?? []) {
        if (!part.type.startsWith("tool-")) continue;
        if ((part as { state?: string }).state !== "output-available") continue;

        const id = (part as { toolCallId?: string }).toolCallId;
        if (!id || processedTools.current.has(id)) continue;
        processedTools.current.add(id);

        const toolName = part.type.slice(5); // strip "tool-" prefix

        if (toolName === "show_booking_cta") {
          setShowBookingCTA(true);
          track("cta_shown");
        }

        if (toolName === "capture_lead") {
          setShowLeadCapture(true);
        }

        if (toolName === "qualify_lead") {
          const a = (part as { input?: Record<string, boolean> }).input ?? {};
          const score = [a.business_fit, a.pain_point_named, a.automation_potential].filter(
            Boolean
          ).length;
          if (score >= 2) {
            track("lead_qualified", { ...a, score });
          }
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
    const userMessages = messages.filter((m) => m.role === "user");
    if (userMessages.length > 0) {
      track("conversation_abandoned", { messageCount: messages.length });
    }
    setIsOpen(false);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || isLoading) return;

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
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...leadForm,
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

  // Only render messages that have visible text content
  const displayMessages = messages.filter(
    (m) => getMessageText(m).trim() !== ""
  );

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-3">

      {/* ── Proactive bubble ─────────────────────────────────────────── */}
      {showBubble && !isOpen && (
        <div className="w-72 bg-saabai-surface border border-saabai-border rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div className="h-px absolute top-0 left-6 right-6 bg-gradient-to-r from-transparent via-saabai-teal/40 to-transparent" />
          <div className="p-4">
            <button
              onClick={() => setShowBubble(false)}
              className="absolute top-3 right-3 w-5 h-5 flex items-center justify-center text-saabai-text-dim hover:text-saabai-text transition-colors text-lg leading-none"
              aria-label="Dismiss"
            >
              ×
            </button>
            <p className="text-sm text-saabai-text-muted leading-relaxed mb-3 pr-5">
              Quick question — are you exploring how automation could save your team time?
            </p>
            <button
              onClick={openWidget}
              className="text-xs font-semibold text-saabai-teal hover:text-saabai-teal-bright transition-colors tracking-wide"
            >
              Yes, tell me more →
            </button>
          </div>
        </div>
      )}

      {/* ── Chat panel ───────────────────────────────────────────────── */}
      {isOpen && (
        <div className="w-[380px] max-w-[calc(100vw-24px)] h-[520px] bg-saabai-surface border border-saabai-border rounded-2xl shadow-[0_8px_48px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-saabai-border shrink-0 relative">
            <div className="h-px absolute top-0 left-8 right-8 bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent" />
            <div className="flex items-center gap-3">
              {/* Avatar — replace /public/brand/agent-avatar.png with Mia's headshot */}
              <div className="w-9 h-9 rounded-full overflow-hidden border border-saabai-teal/30 shrink-0 bg-saabai-teal/10">
                <img
                  src="/brand/agent-avatar.png"
                  alt="Mia"
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to initial if image not yet added
                    const target = e.currentTarget;
                    target.style.display = "none";
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML =
                        '<span class="w-full h-full flex items-center justify-center text-saabai-teal text-sm font-bold">M</span>';
                    }
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-saabai-text tracking-tight leading-none mb-0.5">
                  Mia
                </p>
                <p className="text-[10px] text-saabai-text-dim tracking-wide leading-none mb-1">
                  Saabai AI
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  <span className="text-[10px] text-saabai-text-dim tracking-wide">Online now</span>
                </div>
              </div>
            </div>
            <button
              onClick={closeWidget}
              className="text-saabai-text-dim hover:text-saabai-text transition-colors p-1 rounded-lg hover:bg-saabai-surface-raised"
              aria-label="Close chat"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1 1l12 12M13 1L1 13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">

            {displayMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[82%] px-4 py-3 rounded-xl text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-saabai-teal text-saabai-bg font-medium"
                      : "bg-saabai-surface-raised text-saabai-text-muted"
                  }`}
                >
                  {getMessageText(message)}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-saabai-surface-raised px-4 py-3 rounded-xl flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-saabai-text-dim animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-saabai-text-dim animate-bounce"
                    style={{ animationDelay: "120ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-saabai-text-dim animate-bounce"
                    style={{ animationDelay: "240ms" }}
                  />
                </div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="flex justify-start">
                <div className="max-w-[82%] px-4 py-3 rounded-xl text-sm bg-saabai-surface-raised text-saabai-text-dim leading-relaxed">
                  Something went wrong. Please try again.
                </div>
              </div>
            )}

            {/* ── Booking CTA ── */}
            {showBookingCTA && (
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
                <p className="text-[10px] text-saabai-text-dim text-center mt-2 tracking-wide">
                  Free · 20 minutes · No obligation
                </p>
              </div>
            )}

            {/* ── Lead capture form ── */}
            {showLeadCapture && !leadSubmitted && (
              <div className="mx-1 mt-1 bg-saabai-surface-raised border border-saabai-border rounded-xl overflow-hidden">
                <div className="h-px bg-gradient-to-r from-transparent via-saabai-teal/30 to-transparent" />
                <div className="p-4 flex flex-col gap-3">
                  <p className="text-[10px] font-medium tracking-[0.15em] text-saabai-text-dim uppercase">
                    Your Details
                  </p>
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
                  <button
                    onClick={submitLeadCapture}
                    disabled={!leadForm.name.trim() || !leadForm.email.trim() || leadSubmitting}
                    className="w-full bg-saabai-teal text-saabai-bg px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-saabai-teal-bright transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {leadSubmitting ? "Sending…" : "Send my details"}
                  </button>
                </div>
              </div>
            )}

            {/* Lead capture confirmation */}
            {leadSubmitted && (
              <div className="mx-1 mt-1 bg-saabai-surface-raised border border-saabai-border rounded-xl p-4 text-center">
                <div className="w-6 h-6 rounded-full bg-saabai-teal/20 flex items-center justify-center mx-auto mb-2">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M1 6l3.5 3.5L11 2"
                      stroke="var(--saabai-teal)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-sm text-saabai-text-muted leading-relaxed">
                  Got it — we&apos;ll be in touch within 24 hours.
                </p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={onSubmit}
            className="px-4 py-3 border-t border-saabai-border flex items-center gap-2 shrink-0"
          >
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 bg-saabai-bg border border-saabai-border rounded-xl px-4 py-2.5 text-sm text-saabai-text placeholder:text-saabai-text-dim focus:outline-none focus:border-saabai-teal/60 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="w-9 h-9 rounded-xl bg-saabai-teal flex items-center justify-center hover:bg-saabai-teal-bright transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              aria-label="Send"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1 7h12M7 1l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* ── Floating button ──────────────────────────────────────────── */}
      {!isOpen && (
        <button
          onClick={openWidget}
          className="w-14 h-14 rounded-full bg-saabai-teal hover:bg-saabai-teal-bright transition-all shadow-[0_4px_24px_var(--saabai-glow-strong)] flex items-center justify-center"
          aria-label="Open chat"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
