"use client";

import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "wholesale-homes-conversation";
const STORAGE_TTL = 7 * 24 * 60 * 60 * 1000;
const SLUG = "wholesale-homes";

const TEAL = "#0891b2";
const TEAL_DK = "#0369a1";
const NAVY = "#1A2B3C";
const LIGHT = "#f5f5f7";
const TEXT = "#1A2B3C";
const WHITE = "#ffffff";

const AVATAR = "/sites/wholesale-homes/chat-avatar.png";
const AGENT_NAME = "Sophie";

function loadStored(): { role: string; content: string }[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { messages, timestamp } = JSON.parse(raw);
    if (Date.now() - new Date(timestamp).getTime() > STORAGE_TTL) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return messages as { role: string; content: string }[];
  } catch {
    return null;
  }
}

function saveStored(messages: { role: string; content: string }[]) {
  try {
    if (messages.length <= 1) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, timestamp: new Date().toISOString() }));
  } catch {}
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    { role: "assistant", content: "👋 Hi, I'm Sophie! Looking for house & land packages? I can help match you with the right property. Ask me about available packages, pricing, or how the wholesale process works." },
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

    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/site-factory-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: SLUG,
          messages: newMessages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const reply = data.content || "I'm not sure about that — could you rephrase?";
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      } else {
        throw new Error("API error");
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Having trouble connecting. Please call us on 1300 000 000 or email hello@wholesalehomes.com.au." },
      ]);
    }
    setLoading(false);
  }

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
      {isOpen && (
        <div style={{ width: 380, maxWidth: "calc(100vw - 48px)", borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column", height: 520, maxHeight: "calc(100vh - 120px)", background: WHITE, boxShadow: "0 24px 80px rgba(26,43,60,0.25)" }}>
          {/* Header */}
          <div style={{ background: NAVY, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <img src={AVATAR} alt={AGENT_NAME} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ color: WHITE, fontSize: 14, fontWeight: 700 }}>{AGENT_NAME}</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Online now</div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "0 4px" }}>×</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", gap: 10, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                {msg.role === "assistant" && (
                  <img src={AVATAR} alt={AGENT_NAME} style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", flexShrink: 0, marginTop: 2 }} />
                )}
                <div style={{ maxWidth: "75%", padding: "10px 14px", borderRadius: 16, fontSize: 14, lineHeight: 1.6, background: msg.role === "user" ? TEAL : LIGHT, color: msg.role === "user" ? WHITE : TEXT, borderBottomLeftRadius: msg.role === "assistant" ? 4 : 16, borderBottomRightRadius: msg.role === "user" ? 4 : 16 }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 10 }}>
                <img src={AVATAR} alt={AGENT_NAME} style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                <div style={{ padding: "10px 14px", borderRadius: 16, background: LIGHT, display: "flex", gap: 4, alignItems: "center", borderBottomLeftRadius: 4 }}>
                  {[0, 150, 300].map((delay) => (
                    <span key={delay} style={{ width: 7, height: 7, borderRadius: "50%", background: TEAL, display: "inline-block", animation: "wh-bounce 1s infinite", animationDelay: `${delay}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px", borderTop: `1px solid ${LIGHT}`, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Type a message…" style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: "1px solid #E2E6EA", fontSize: 14, color: TEXT, outline: "none", background: WHITE }} />
              <button onClick={send} disabled={loading || !input.trim()} style={{ padding: "10px 18px", borderRadius: 12, border: "none", background: TEAL, color: WHITE, fontSize: 14, fontWeight: 700, cursor: loading || !input.trim() ? "not-allowed" : "pointer", opacity: loading || !input.trim() ? 0.4 : 1, transition: "opacity 0.2s" }}>Send</button>
            </div>
          </div>
        </div>
      )}

      {/* Launcher — pill CTA */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        aria-label="Chat with us"
        style={{
          padding: "0 24px",
          height: 56,
          borderRadius: 28,
          border: "none",
          background: TEAL,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          boxShadow: "0 4px 20px rgba(8,145,178,0.45)",
          fontSize: 15,
          fontWeight: 700,
          color: WHITE,
          flexShrink: 0,
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = TEAL_DK)}
        onMouseLeave={(e) => (e.currentTarget.style.background = TEAL)}
      >
        {isOpen ? (
          <span style={{ fontSize: 20, lineHeight: 1, pointerEvents: "none" }}>×</span>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style={{ pointerEvents: "none", flexShrink: 0 }}>
              <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/>
            </svg>
            <span style={{ pointerEvents: "none" }}>Chat with us</span>
          </>
        )}
      </button>

      <style>{`@keyframes wh-bounce { 0%,80%,100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );
}

