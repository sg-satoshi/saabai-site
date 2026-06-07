"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// ── Brand colours ──────────────────────────────────────────────────────────────
const C = {
  bg: "#0B0E21",
  surface: "#13163A",
  surfaceRaised: "#1C2050",
  border: "#2A2D5A",
  gold: "#C9A84C",
  goldBright: "#E0BC6A",
  goldBg: "rgba(201,168,76,0.08)",
  goldBorder: "rgba(201,168,76,0.2)",
  text: "#E8EDF5",
  textMuted: "#8FA3C0",
  textDim: "#4A6080",
};

type Message = { role: "user" | "assistant"; content: string };

// ── Jack avatar mark ─────────────────────────────────────────────────────────
function JackMark({ size = 24 }: { size?: number }) {
  return (
    <img
      src="/leadgen/jack-avatar.png"
      alt="Jack"
      style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        objectFit: "cover",
      }}
    />
  );
}

// ── Widget ──────────────────────────────────────────────────────────────────
function WidgetInner() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "bne-emergency-plumbing";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const QUICK_CHIPS = [
    "Hey I need a plumber, my pipe burst",
    "How much to fix a hot water system?",
    "Can you come to Woolloongabba?",
  ];

  async function sendMessage(text: string) {
    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/leadgen/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, messages: updated }),
      });
      const data = await res.json();
      const reply = data.content || "I'm here to help! Could you tell me more about what you need?";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && input.trim() && !loading) {
      e.preventDefault();
      sendMessage(input.trim());
    }
  }

  return (
    <div style={{
      width: "100%", height: "100%", background: C.bg,
      display: "flex", flexDirection: "column", fontFamily: "'Inter', system-ui, sans-serif",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 16px", borderBottom: `1px solid ${C.border}`,
      }}>
        <JackMark size={32} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Jack</div>
          <div style={{ fontSize: 10, color: C.textMuted }}>Lead Capture Agent</div>
        </div>
        <button style={{
          fontSize: 9, background: C.goldBg, border: `1px solid ${C.goldBorder}`,
          borderRadius: 6, padding: "3px 8px", color: C.gold, fontWeight: 600,
          cursor: "pointer",
        }}>
          ON
        </button>
      </div>

      {/* Chat area */}
      <div ref={containerRef} style={{
        flex: 1, overflowY: "auto", padding: 16,
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {messages.length === 0 && !loading && (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 16,
          }}>
            <JackMark size={48} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                Hi, I'm Jack! 👋
              </div>
              <div style={{ fontSize: 10, color: C.textMuted }}>
                Plumbing · Electrical · Hot water · Gas
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: 260 }}>
              {QUICK_CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={() => sendMessage(chip)}
                  style={{
                    padding: "8px 12px", background: C.goldBg,
                    border: `1px solid ${C.goldBorder}`, borderRadius: 10,
                    color: C.gold, fontSize: 11, fontWeight: 600,
                    textAlign: "left", lineHeight: 1.3, cursor: "pointer",
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex", gap: 8,
            flexDirection: msg.role === "user" ? "row-reverse" as const : "row" as const,
            alignItems: "flex-start",
          }}>
            {msg.role === "assistant" && <JackMark size={22} />}
            <div style={{
              maxWidth: "75%", padding: "8px 12px", borderRadius: 12,
              background: msg.role === "user" ? C.goldBg : C.surface,
              border: `1px solid ${msg.role === "user" ? C.goldBorder : C.border}`,
              color: C.text, fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap",
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <JackMark size={22} />
            <div style={{ color: C.textMuted, fontSize: 12 }}>Typing...</div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        padding: "10px 12px", borderTop: `1px solid ${C.border}`,
        display: "flex", gap: 8,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a plumbing question..."
          disabled={loading}
          style={{
            flex: 1, background: C.surface,
            border: `1px solid ${C.border}`, borderRadius: 10,
            padding: "8px 12px", fontSize: 12, color: C.text,
            outline: "none",
          }}
        />
        <button
          onClick={() => input.trim() && sendMessage(input.trim())}
          disabled={!input.trim() || loading}
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: C.gold, border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: input.trim() && !loading ? "pointer" : "default",
            opacity: input.trim() && !loading ? 1 : 0.4,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke={C.bg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div style={{ textAlign: "center", padding: "6px 0", fontSize: 8, color: C.textDim }}>
        ✦ Privacy Mode active — client identifiers are anonymized
      </div>
    </div>
  );
}

export default function JackWidgetPage() {
  return (
    <Suspense fallback={<div style={{ width: "100%", height: "100%", background: C.bg }} />}>
      <WidgetInner />
    </Suspense>
  );
}
