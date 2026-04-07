"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ── Brand ──────────────────────────────────────────────────────────────────────
const C = {
  bg:            "#0d1b2a",
  surface:       "#162236",
  surfaceRaised: "#1e3050",
  border:        "#243550",
  gold:          "#C9A84C",
  goldBright:    "#E0BC6A",
  goldDim:       "#8a6e30",
  goldBg:        "rgba(201,168,76,0.08)",
  goldBorder:    "rgba(201,168,76,0.2)",
  text:          "#e8edf5",
  textMuted:     "#8fa3c0",
  textDim:       "#4a6080",
};

type ChatMessage = { role: "user" | "assistant"; content: string };

// ── LexMark avatar ────────────────────────────────────────────────────────────
function LexMark({ size = 24 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, ${C.goldBright} 0%, ${C.gold} 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      border: `1.5px solid ${C.goldDim}`,
    }}>
      <span style={{
        fontSize: size * 0.44, fontWeight: 900, color: C.bg,
        fontFamily: "Georgia, serif", lineHeight: 1,
      }}>L</span>
    </div>
  );
}

// ── ThinkingDots ──────────────────────────────────────────────────────────────
function ThinkingDots({ label }: { label: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "10px 14px",
      background: C.surfaceRaised,
      borderRadius: "14px 14px 14px 4px",
      border: `1px solid ${C.border}`,
      maxWidth: 200,
    }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 5, height: 5, borderRadius: "50%",
            background: C.gold, display: "block",
            animation: `lexDot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: C.textMuted }}>{label}</span>
    </div>
  );
}

// ── Render assistant content ──────────────────────────────────────────────────
function renderContent(text: string): React.ReactNode[] {
  text = text.replace(/([a-z\)])\. ?([A-Z])/g, "$1. $2");
  const paras = text.split(/\n{2,}/);
  const out: React.ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\[([^\]]+)\]\(((?:https?|mailto):\/\/[^\)]+)\))/g;
  paras.forEach((para, pi) => {
    if (pi > 0) out.push(<div key={`g${pi}`} style={{ height: 7 }} />);
    para.split("\n").forEach((line, li) => {
      if (li > 0) out.push(<br key={`br${pi}${li}`} />);
      const nodes: React.ReactNode[] = [];
      let last = 0, k = 0, m: RegExpExecArray | null;
      re.lastIndex = 0;
      while ((m = re.exec(line)) !== null) {
        if (m.index > last) nodes.push(line.slice(last, m.index));
        if (m[0].startsWith("**")) {
          nodes.push(
            <strong key={`b${pi}${li}${k++}`} style={{ color: C.goldBright }}>
              {m[2]}
            </strong>
          );
        } else {
          nodes.push(
            <a key={`a${pi}${li}${k++}`} href={m[4]} target="_blank" rel="noopener noreferrer"
              style={{ color: C.gold, textDecoration: "underline", fontWeight: 600 }}>
              {m[3]}
            </a>
          );
        }
        last = m.index + m[0].length;
      }
      if (last < line.length) nodes.push(line.slice(last));
      out.push(...nodes);
    });
  });
  return out;
}

// ── Quick reply chips ─────────────────────────────────────────────────────────
const QUICK_CHIPS = [
  "What is a director's duty of care?",
  "Explain the elements of negligence",
  "What does the ACL say about misleading conduct?",
];

// ── Main widget page ──────────────────────────────────────────────────────────
export default function LexWidgetPage() {
  const [clientId, setClientId] = useState("lex-external");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinkLabel, setThinkLabel] = useState("Researching…");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const msgsRef   = useRef<ChatMessage[]>([]);

  // Read clientId from URL search params (client-side only)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("clientId");
    if (id) setClientId(id);
    // Notify parent that widget is ready
    try { window.parent.postMessage({ lexWidget: "ready" }, "*"); } catch {}
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "auto";
    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 72) + "px";
  }, [input]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const updated: ChatMessage[] = [...msgsRef.current, userMsg];
    msgsRef.current = updated;
    setMessages([...updated]);
    setInput("");
    setLoading(true);

    // Pick thinking label based on query content
    const l = trimmed.toLowerCase();
    if (/austlii|case law|case|judgment|tribunal/.test(l)) setThinkLabel("Searching AustLII…");
    else if (/ato|tax|ruling|gst|cgt|income/.test(l))      setThinkLabel("Checking ATO…");
    else if (/legislation|act|section|regulation/.test(l)) setThinkLabel("Searching legislation…");
    else if (/draft|write|letter|advice|memo/.test(l))     setThinkLabel("Drafting…");
    else                                                    setThinkLabel("Researching…");

    try {
      const res = await fetch("/api/lex-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, clientId }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer   = "";
      let started  = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === "text-delta" && parsed.delta) {
              fullText += parsed.delta;
              if (!started) {
                started = true;
                setLoading(false);
                setMessages([...updated, { role: "assistant", content: fullText }]);
              } else {
                setMessages(prev => {
                  const c = [...prev];
                  c[c.length - 1] = { role: "assistant", content: fullText };
                  return c;
                });
              }
            }
          } catch {}
        }
      }

      if (fullText.trim()) {
        const final: ChatMessage[] = [...updated, { role: "assistant", content: fullText.trim() }];
        msgsRef.current = final;
        setMessages(final);
      }
    } catch {
      const errMsgs: ChatMessage[] = [
        ...updated,
        { role: "assistant", content: "There was a problem reaching the research API. Please try again." },
      ];
      msgsRef.current = errMsgs;
      setMessages(errMsgs);
    } finally {
      setLoading(false);
    }
  }, [loading, clientId]);

  const hasMessages = messages.length > 0;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          height: 100%; width: 100%;
          background: ${C.bg};
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: ${C.text};
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
        @keyframes lexDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1; }
        }
        @keyframes lexFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        textarea { resize: none; }
        textarea:focus { outline: none; }
        button { cursor: pointer; }
        a { color: ${C.gold}; }
      `}</style>

      {/* Root layout: header + chat + input */}
      <div style={{
        display: "flex", flexDirection: "column",
        height: "100dvh", width: "100%",
        background: C.bg,
      }}>

        {/* ── Header ── */}
        <div style={{
          height: 48, flexShrink: 0,
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
        }}>
          {/* Left: avatar + name */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LexMark size={24} />
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Lex</div>
              <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>
                Legal Research Assistant
              </div>
            </div>
          </div>
          {/* Right: powered by */}
          <a
            href="https://saabai.ai"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 8, color: C.textDim,
              textDecoration: "none", letterSpacing: 0.2,
            }}
          >
            Powered by Saabai.ai
          </a>
        </div>

        {/* ── Chat area ── */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: 12,
          display: "flex", flexDirection: "column", gap: 10,
        }}>

          {/* Welcome state */}
          {!hasMessages && !loading && (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 14, paddingBottom: 16,
              animation: "lexFadeIn 0.4s ease",
            }}>
              <LexMark size={48} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                  Ask me anything about Australian law
                </div>
                <div style={{ fontSize: 11, color: C.textMuted }}>
                  Statutes · Case law · ATO rulings · Legal drafting
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, width: "100%", maxWidth: 280 }}>
                {QUICK_CHIPS.map(chip => (
                  <button
                    key={chip}
                    onClick={() => sendMessage(chip)}
                    style={{
                      padding: "9px 14px",
                      background: C.goldBg,
                      border: `1px solid ${C.goldBorder}`,
                      borderRadius: 10,
                      color: C.gold,
                      fontSize: 11.5,
                      fontWeight: 600,
                      textAlign: "left",
                      lineHeight: 1.4,
                      transition: "background 0.15s",
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: isUser ? "row-reverse" : "row",
                  alignItems: "flex-end",
                  gap: 7,
                  animation: "lexFadeIn 0.25s ease",
                }}
              >
                {!isUser && (
                  <div style={{ flexShrink: 0, marginBottom: 2 }}>
                    <LexMark size={20} />
                  </div>
                )}
                <div style={{
                  maxWidth: "84%",
                  padding: "9px 12px",
                  borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: isUser ? C.surfaceRaised : C.surface,
                  border: isUser ? `1px solid ${C.goldBorder}` : `1px solid ${C.border}`,
                  color: C.text,
                  fontSize: 13,
                  lineHeight: 1.65,
                  wordBreak: "break-word" as const,
                }}>
                  {isUser ? msg.content : renderContent(msg.content)}
                </div>
              </div>
            );
          })}

          {/* Thinking indicator */}
          {loading && (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 7, animation: "lexFadeIn 0.2s ease" }}>
              <div style={{ flexShrink: 0, marginBottom: 2 }}>
                <LexMark size={20} />
              </div>
              <ThinkingDots label={thinkLabel} />
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input area ── */}
        <div style={{
          flexShrink: 0,
          background: C.surface,
          borderTop: `1px solid ${C.border}`,
          padding: "10px 10px 8px",
        }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Ask a legal question…"
              disabled={loading}
              rows={1}
              style={{
                flex: 1,
                padding: "9px 12px",
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                color: C.text,
                fontSize: 13,
                lineHeight: 1.5,
                maxHeight: 72,
                overflowY: "auto",
                fontFamily: "inherit",
                caretColor: C.gold,
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              style={{
                width: 36, height: 36,
                borderRadius: 9,
                border: "none",
                flexShrink: 0,
                background: input.trim() && !loading ? C.gold : C.goldBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M13 2L6.5 8.5" stroke={C.bg} strokeWidth="1.8" strokeLinecap="round" />
                <path d="M13 2L8.5 13L6.5 8.5L2 6.5L13 2z"
                  stroke={C.bg} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div style={{
            marginTop: 5, fontSize: 8,
            color: C.textDim, textAlign: "center",
          }}>
            Not legal advice. Verify all citations.
          </div>
        </div>
      </div>
    </>
  );
}
