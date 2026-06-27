"use client";

import { useState, useEffect, useRef } from "react";
import type { UIMessage } from "ai";

const STORAGE_KEY = "bo-consultancy-conversation";
const STORAGE_TTL = 7 * 24 * 60 * 60 * 1000;

const NAVY = "#123B5D";
const ORANGE = "#F58220";
const LIGHT = "#F4F5F6";
const TEXT = "#1A2B3C";
const WHITE = "#ffffff";

function loadStored(): UIMessage[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { messages, timestamp } = JSON.parse(raw);
    if (Date.now() - new Date(timestamp).getTime() > STORAGE_TTL) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return messages as UIMessage[];
  } catch {
    return null;
  }
}

function saveStored(messages: UIMessage[]) {
  try {
    if (messages.length <= 1) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, timestamp: new Date().toISOString() }));
  } catch {}
}

function getText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n\n");
}

export default function BOChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([
    {
      id: "init",
      role: "assistant",
      parts: [{ type: "text", text: "G'day! I'm Alex, the BO Consulting assistant. Whether you're looking to hire skilled workers or searching for your next role, I can help point you in the right direction. What can I do for you?" }],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = loadStored();
    if (stored && stored.length > 1) setMessages(stored);
  }, []);

  useEffect(() => {
    saveStored(messages);
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: UIMessage = { id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text }] };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/bo-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.map((m) => ({ role: m.role, content: getText(m) })) }),
      });
      if (res.ok) {
        const data = await res.json();
        const replyText = data.content || "Sorry, I didn't catch that. Try again or call us on info@boconsulting.com.au.";
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", parts: [{ type: "text", text: replyText }] }]);
      } else {
        throw new Error("API error");
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", parts: [{ type: "text", text: "Having a bit of trouble connecting right now. Give us a call or send an email to info@boconsulting.com.au and we'll get back to you fast." }] },
      ]);
    }
    setLoading(false);
  }

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
      {/* Chat Panel */}
      {isOpen && (
        <div
          style={{
            width: 380,
            maxWidth: "calc(100vw - 48px)",
            borderRadius: 20,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            height: 520,
            maxHeight: "calc(100vh - 120px)",
            background: WHITE,
            boxShadow: "0 24px 80px rgba(18,59,93,0.25)",
          }}
        >
          {/* Header */}
          <div style={{ background: NAVY, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: ORANGE,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 700,
                color: WHITE,
                flexShrink: 0,
                border: "2px solid rgba(255,255,255,0.2)",
              }}
            >
              A
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: WHITE, fontSize: 14, fontWeight: 700 }}>Alex</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>BO Consulting Assistant</div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "0 4px" }}
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: "flex", gap: 10, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                {msg.role === "assistant" && (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: ORANGE,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      color: WHITE,
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    A
                  </div>
                )}
                <div
                  style={{
                    maxWidth: "75%",
                    padding: "10px 14px",
                    borderRadius: 16,
                    fontSize: 14,
                    lineHeight: 1.6,
                    background: msg.role === "user" ? NAVY : LIGHT,
                    color: msg.role === "user" ? WHITE : TEXT,
                  }}
                >
                  {getText(msg)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: ORANGE,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    color: WHITE,
                    flexShrink: 0,
                  }}
                >
                  A
                </div>
                <div style={{ padding: "10px 14px", borderRadius: 16, background: LIGHT, display: "flex", gap: 4, alignItems: "center" }}>
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: ORANGE,
                        display: "inline-block",
                        animation: "bounce 1s infinite",
                        animationDelay: `${delay}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px", borderTop: `1px solid ${LIGHT}`, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                placeholder="Type a message…"
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #E2E6EA",
                  fontSize: 14,
                  color: TEXT,
                  outline: "none",
                  background: WHITE,
                }}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                style={{
                  padding: "10px 18px",
                  borderRadius: 12,
                  border: "none",
                  background: ORANGE,
                  color: WHITE,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                  opacity: loading || !input.trim() ? 0.4 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Launcher */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Chat with Alex"
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: ORANGE,
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(245,130,32,0.45)",
          fontSize: 22,
          fontWeight: 700,
          color: WHITE,
          transition: "transform 0.2s",
        }}
        onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
        onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {isOpen ? "×" : "💬"}
      </button>
    </div>
  );
}
