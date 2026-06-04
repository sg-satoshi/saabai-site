"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";

const STORAGE_KEY = "tributum-law-v2-conversation";
const STORAGE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Brand colors
const NAVY = "#0F1B2E";
const NAVY_LIGHT = "#162440";
const GOLD = "#B8860B";
const IVORY = "#FAF8F5";
const TEXT_DARK = "#1A1A1A";
const TEXT_MUTED = "#6B7280";
const WHITE = "#ffffff";

const AVATAR_URL = "/sites/tributum-law-v2/mathew-brittingham.jpg";

const INITIAL_MESSAGES: UIMessage[] = [
  {
    id: "initial",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "Hello. I'm Mike, Tributum Law's AI assistant. I can help with questions about tax law, ATO disputes, trusts, estate planning — or get you connected with the team. How can I help?",
      },
    ],
  },
];

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
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ messages, timestamp: new Date().toISOString() })
    );
  } catch {
    // silently fail
  }
}

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

function MikeAvatar({
  size = 36,
  dotSize = 10,
  showDot = true,
}: {
  size?: number;
  dotSize?: number;
  showDot?: boolean;
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="rounded-full overflow-hidden w-full h-full"
        style={{ border: `2px solid ${GOLD}` }}
      >
        <img
          src={AVATAR_URL}
          alt="Mike"
          width={size}
          height={size}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = "none";
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `<span style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:${GOLD};font-weight:700;font-size:${Math.round(size * 0.38)}px">M</span>`;
            }
          }}
        />
      </div>
      {showDot && (
        <span
          className="absolute rounded-full bg-emerald-400"
          style={{
            width: dotSize,
            height: dotSize,
            bottom: 0,
            right: 0,
            border: `2px solid ${WHITE}`,
          }}
        />
      )}
    </div>
  );
}

function BouncingDots() {
  return (
    <>
      <span
        className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
        style={{ animationDelay: "120ms" }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
        style={{ animationDelay: "240ms" }}
      />
    </>
  );
}

export default function TributumChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chatOptions: any = { messages: INITIAL_MESSAGES };
  const { messages, sendMessage, status, error, setMessages } =
    useChat(chatOptions);
  const isLoading = status === "submitted" || status === "streaming";

  // Restore stored conversation on mount
  useEffect(() => {
    const stored = loadStoredConversation();
    if (stored) setMessages(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist conversation to localStorage on every update
  useEffect(() => {
    if (messages.length > 1) saveConversation(messages);
  }, [messages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function openWidget() {
    setIsOpen(true);
  }

  function closeWidget() {
    setIsOpen(false);
  }

  function handleNewChat() {
    setMessages(INITIAL_MESSAGES);
    localStorage.removeItem(STORAGE_KEY);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || isLoading) return;
    setInputValue("");
    sendMessage({ text });
  }

  // Build display items from messages
  const displayItems = messages
    .filter((m) => m.id !== "initial" || messages.length === 1)
    .map((m) => ({
      key: m.id,
      role: m.role as "user" | "assistant",
      text: getMessageText(m),
    }));

  const userMessages = messages.filter((m) => m.role === "user");
  const showTypingIndicator = status === "submitted";

  return (
    <div className="fixed bottom-6 md:bottom-8 right-6 z-[60] flex flex-col items-end gap-3">
      {/* ── Chat panel ─────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="w-[380px] max-w-[calc(100vw-24px)] h-[520px] rounded-2xl flex flex-col overflow-hidden"
          style={{
            background: IVORY,
            border: `1px solid rgba(184,134,11,0.3)`,
            boxShadow:
              "0 8px 48px rgba(0,0,0,0.15), 0 0 20px rgba(15,27,46,0.1)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 shrink-0"
            style={{
              borderBottom: `1px solid rgba(184,134,11,0.2)`,
              background: NAVY,
            }}
          >
            <div className="flex items-center gap-3">
              <MikeAvatar size={40} dotSize={11} showDot={true} />
              <div>
                <p
                  className="text-sm font-semibold tracking-tight leading-none mb-0.5"
                  style={{ color: WHITE }}
                >
                  Mike
                </p>
                <p
                  className="text-[10px] tracking-wide leading-none mb-1"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  Tributum AI Assistant
                </p>
                <p
                  className="text-[10px] tracking-wide"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  Usually replies within a minute
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {userMessages.length > 0 && (
                <button
                  onClick={handleNewChat}
                  className="text-[10px] font-medium transition-colors tracking-wide"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = GOLD)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "rgba(255,255,255,0.5)")
                  }
                  title="Clear this conversation and start fresh"
                >
                  New chat
                </button>
              )}
              <button
                onClick={closeWidget}
                className="p-1 rounded-lg transition-colors"
                style={{ color: "rgba(255,255,255,0.5)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = WHITE;
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                  e.currentTarget.style.background = "transparent";
                }}
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
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
            {/* Initial message (always shown first as greeting) */}
            {messages.length >= 1 && (
              <div className="flex justify-start">
                <div
                  className="max-w-[85%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed"
                  style={{
                    background: WHITE,
                    color: TEXT_DARK,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  {renderMessageText(
                    "Hello. I'm Mike, Tributum Law's AI assistant. I can help with questions about tax law, ATO disputes, trusts, estate planning — or get you connected with the team. How can I help?"
                  )}
                </div>
              </div>
            )}

            {/* Conversation messages (skip the initial greeting) */}
            {displayItems
              .filter((item) => item.key !== "initial")
              .map((item) => (
                <div
                  key={item.key}
                  className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="max-w-[85%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed"
                    style={
                      item.role === "user"
                        ? {
                            background: NAVY,
                            color: WHITE,
                            fontWeight: 500,
                          }
                        : {
                            background: WHITE,
                            color: TEXT_DARK,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                          }
                    }
                  >
                    {renderMessageText(item.text)}
                  </div>
                </div>
              ))}

            {/* Typing indicator */}
            {showTypingIndicator && (
              <div className="flex justify-start">
                <div
                  className="px-4 py-3 rounded-2xl flex items-center gap-1.5"
                  style={{
                    background: WHITE,
                    color: TEXT_MUTED,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  <BouncingDots />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex justify-start">
                <div
                  className="max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
                  style={{ background: WHITE, color: "#dc2626" }}
                >
                  Something went wrong. Please try again.
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={onSubmit}
            className="px-4 py-3 flex items-center gap-2 shrink-0"
            style={{
              borderTop: `1px solid rgba(184,134,11,0.15)`,
              background: IVORY,
            }}
          >
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 rounded-xl px-4 py-2.5 text-[15px] focus:outline-none transition-colors"
              style={{
                background: WHITE,
                color: TEXT_DARK,
                border: `1px solid rgba(184,134,11,0.25)`,
                caretColor: TEXT_DARK,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = GOLD;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(184,134,11,0.25)";
              }}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              style={{ background: GOLD, color: WHITE }}
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

      {/* ── Launcher ─────────────────────────────────────────────────── */}
      {!isOpen && (
        <>
          {/* Desktop: pill with avatar + text */}
          <button
            onClick={openWidget}
            aria-label="Chat with Mike"
            className="hidden md:flex items-center gap-3 pl-2 pr-5 py-2 rounded-full transition-all duration-300 hover:-translate-y-0.5"
            style={{
              background: WHITE,
              border: `1.5px solid ${GOLD}`,
              boxShadow: `0 4px 24px rgba(184,134,11,0.15), 0 1px 4px rgba(0,0,0,0.08)`,
            }}
          >
            <MikeAvatar size={38} dotSize={11} />
            <span
              className="text-sm font-medium whitespace-nowrap"
              style={{ color: NAVY }}
            >
              Ask Mike about tax law
            </span>
          </button>

          {/* Mobile: gold circle with avatar */}
          <button
            onClick={openWidget}
            aria-label="Chat with Mike"
            className="flex md:hidden rounded-full transition-all duration-300 hover:-translate-y-0.5"
            style={{
              background: GOLD,
              padding: "3px",
              boxShadow: `0 4px 24px rgba(184,134,11,0.3), 0 1px 4px rgba(0,0,0,0.1)`,
            }}
          >
            <MikeAvatar size={52} dotSize={12} showDot={false} />
          </button>
        </>
      )}
    </div>
  );
}
