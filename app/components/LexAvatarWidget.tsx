"use client";

/**
 * LexAvatarWidget — Lex external intake widget
 * Navy/gold theme. Embeds on law firm websites for client intake.
 * Internal research tool → use /lex page directly.
 */

import { useRef, useState, useCallback, useEffect } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

const LEX_NAVY   = "#1B2B4B";
const LEX_GOLD   = "#C9A84C";
const LEX_GOLD_B = "#E0BC6A";
const LEX_BG     = "#0d1b2a";
const LEX_SURFACE= "#162236";

const STORAGE_KEY = "lex_widget_conversation";
const TTL_MS = 24 * 60 * 60 * 1000;

const QUICK_REPLY_POOL = [
  "I need help with a contract dispute",
  "I need a property lawyer",
  "I've been unfairly dismissed",
  "I need advice on my Will",
  "What areas do you practise in?",
  "How do I book a consultation?",
  "I need a family law lawyer",
  "I have a tax law question",
];

function pickReplies(pool: string[]): string[] {
  return [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
}

function renderContent(text: string) {
  text = text.replace(/([a-z\)])\. ?([A-Z])/g, "$1. $2");
  const paras = text.split(/\n{2,}/);
  const out: React.ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\[([^\]]+)\]\(((?:https?|mailto):\/\/[^\)]+)\))/g;
  paras.forEach((para, pi) => {
    if (pi > 0) out.push(<div key={`g${pi}`} style={{ height: 6 }} />);
    para.split("\n").forEach((line, li) => {
      if (li > 0) out.push(<br key={`br${pi}${li}`} />);
      const nodes: React.ReactNode[] = [];
      let last = 0, k = 0, m: RegExpExecArray | null;
      re.lastIndex = 0;
      while ((m = re.exec(line)) !== null) {
        if (m.index > last) nodes.push(line.slice(last, m.index));
        if (m[0].startsWith("**")) {
          nodes.push(<strong key={`b${pi}${li}${k++}`} style={{ color: LEX_GOLD_B }}>{m[2]}</strong>);
        } else {
          nodes.push(<a key={`a${pi}${li}${k++}`} href={m[4]} target="_blank" rel="noopener noreferrer"
            style={{ color: LEX_GOLD, textDecoration: "underline", fontWeight: 600 }}>{m[3]}</a>);
        }
        last = m.index + m[0].length;
      }
      if (last < line.length) nodes.push(line.slice(last));
      out.push(...nodes);
    });
  });
  return out;
}

function LexAvatar({ size = 28 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, ${LEX_GOLD_B} 0%, ${LEX_GOLD} 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      border: "1.5px solid rgba(201,168,76,0.5)",
    }}>
      <span style={{ fontSize: size * 0.42, fontWeight: 900, color: LEX_BG, fontFamily: "Georgia, serif" }}>L</span>
    </div>
  );
}

const GREETINGS = [
  "Good day. I'm Lex, your AI legal assistant. What can I help you with today?",
  "Hi there. I'm Lex. I can help with legal enquiries and connect you with the right lawyer. What's on your mind?",
  "Welcome. I'm Lex — here to help with your legal questions. How can I assist you today?",
];

export default function LexAvatarWidget({ clientId, firmName, quickReplies: pool }: {
  clientId?: string;
  firmName?: string;
  quickReplies?: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chips, setChips] = useState<string[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const bottomRef      = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const msgsRef        = useRef<ChatMessage[]>([]);
  const msgsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Restore from storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (Date.now() - saved.savedAt > TTL_MS) { localStorage.removeItem(STORAGE_KEY); return; }
      if (saved.messages?.length > 0) {
        msgsRef.current = saved.messages;
        setMessages(saved.messages);
        setIsStarted(true);
        // Don't auto-open when embedded in an iframe — it causes the parent
        // page to scroll to the widget on load. User can still click to open.
        const inIframe = (() => { try { return window !== window.parent; } catch { return true; } })();
        if (saved.isOpen && !inIframe) setIsOpen(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, isOpen, savedAt: Date.now() }));
    } catch {}
  }, [messages, isOpen]);

  useEffect(() => {
    // Scroll within the container only — avoid scrollIntoView which propagates
    // up through same-origin iframe boundaries and jumps the parent page.
    const c = msgsContainerRef.current;
    if (c) c.scrollTop = c.scrollHeight;
  }, [messages, loading]);

  // Pulse glow every 12s
  useEffect(() => {
    if (isOpen) return;
    const iv = setInterval(() => {
      setPulsing(true);
      setTimeout(() => setPulsing(false), 900);
    }, 12000);
    return () => clearInterval(iv);
  }, [isOpen]);

  useEffect(() => {
    try {
      window.parent.postMessage({ lexWidget: isOpen ? "open" : "closed" }, "*");
    } catch {}
  }, [isOpen]);

  function startChat() {
    const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    const msg: ChatMessage = { role: "assistant", content: greeting };
    msgsRef.current = [msg];
    setMessages([msg]);
    setIsStarted(true);
    setChips(pickReplies(pool ?? QUICK_REPLY_POOL));
  }

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setChips([]);
    const updated: ChatMessage[] = [...msgsRef.current, { role: "user", content: text.trim() }];
    msgsRef.current = updated;
    setMessages([...updated]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/lex-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, clientId: clientId ?? "lex-external" }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";
      let started = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const p = JSON.parse(line.slice(6));
            if (p.type === "text-delta" && p.delta) {
              fullText += p.delta;
              if (!started) {
                started = true;
                setLoading(false);
                setMessages(prev => [...prev, { role: "assistant", content: fullText }]);
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
        const final: ChatMessage[] = [...updated, { role: "assistant" as const, content: fullText.trim() }];
        msgsRef.current = final;
        setMessages(final);
      }
    } catch {
      setLoading(false);
      const errMsgs: ChatMessage[] = [...updated, { role: "assistant" as const, content: "Sorry, there was a technical issue. Please try again." }];
      msgsRef.current = errMsgs;
      setMessages(errMsgs);
    } finally {
      setLoading(false);
    }
  }, [loading, clientId]);

  const lexVars = {
    "--lex-bg":      "#ffffff",
    "--lex-surface": "#f9f7f3",
    "--lex-border":  "rgba(180,140,40,0.15)",
    "--lex-text":    "#0d1b2a",
    "--lex-muted":   "#5a6a7a",
  } as React.CSSProperties;

  if (!isOpen) {
    return (
      <div style={{ ...lexVars, pointerEvents: "auto" }}>
        <button
          onClick={() => { setIsOpen(true); if (!isStarted) startChat(); }}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-full pl-3 pr-5 py-2.5 transition-all duration-300 hover:-translate-y-0.5"
          style={{
            background: LEX_NAVY,
            boxShadow: pulsing ? `0 0 0 4px rgba(201,168,76,0.25)` : "none",
            transform: pulsing ? "scale(1.025) translateY(-1px)" : undefined,
          }}
        >
          <LexAvatar size={36} />
          <div className="text-left">
            <p className="text-xs font-semibold text-white leading-none">Talk to Lex</p>
            <p className="text-[10px] mt-0.5" style={{ color: LEX_GOLD }}>
              {firmName ? `${firmName} AI` : "AI Legal Assistant"}
            </p>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div style={{ ...lexVars, pointerEvents: "auto" }}>
      <div
        className="fixed z-50 overflow-hidden flex flex-col"
        style={{
          ...(isMobile ? {
            top: 0, left: 0, width: "100vw", height: "100dvh",
            borderRadius: 0, border: "none",
          } : {
            bottom: 0, right: 0, width: "100%", borderRadius: "1rem",
          }),
          background: "#ffffff",
          border: `1px solid rgba(180,140,40,0.2)`,
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          animation: isMobile ? "none" : "lexSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <style>{`@keyframes lexSlideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        {/* Header */}
        <div style={{ background: LEX_NAVY, padding: "14px 16px", display: "flex",
          alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LexAvatar size={34} />
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#fff" }}>Lex</p>
              <p style={{ margin: 0, fontSize: 10, color: LEX_GOLD }}>
                {firmName ? `${firmName} · AI Legal Assistant` : "AI Legal Assistant · Online"}
              </p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)",
              cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {/* Disclaimer */}
        <div style={{ padding: "6px 14px", background: "rgba(201,168,76,0.06)",
          borderBottom: "1px solid rgba(201,168,76,0.15)", flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 10.5, color: "#8b7d5a" }}>
            ⚖️ General legal information only — not legal advice. All matters are confidential.
          </p>
        </div>

        {/* Messages */}
        <div ref={msgsContainerRef} style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex",
          flexDirection: "column", gap: 10, background: "#fff" }}>
          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            const isLast = i === messages.length - 1;
            return (
              <div key={i} style={{ display: "flex", flexDirection: isUser ? "row-reverse" : "row",
                alignItems: "flex-end", gap: 8 }}>
                {!isUser && isLast && <LexAvatar size={24} />}
                {!isUser && !isLast && <div style={{ width: 24, flexShrink: 0 }} />}
                <div style={{
                  maxWidth: "82%", padding: "10px 13px",
                  borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: isUser ? LEX_NAVY : "#f4f0e8",
                  color: isUser ? "#fff" : "#0d1b2a",
                  fontSize: 13.5, lineHeight: 1.65, wordBreak: "break-word" as const,
                  border: isUser ? "none" : "1px solid rgba(180,140,40,0.2)",
                }}>
                  {isUser ? msg.content : renderContent(msg.content)}
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <LexAvatar size={24} />
              <div style={{ padding: "10px 14px", background: "#f4f0e8",
                borderRadius: "16px 16px 16px 4px", border: "1px solid rgba(180,140,40,0.2)" }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0,1,2].map(i => (
                    <span key={i} style={{ width: 5, height: 5, borderRadius: "50%",
                      background: LEX_GOLD, display: "block",
                      animation: `lexDot 1.2s ease-in-out ${i*0.2}s infinite`,
                    }} />
                  ))}
                </div>
                <style>{`@keyframes lexDot{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}`}</style>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Chips */}
        {chips.length > 0 && !loading && (
          <div style={{ padding: "6px 12px 2px", display: "flex", flexWrap: "wrap" as const,
            gap: 6, flexShrink: 0, background: "#fff" }}>
            {chips.map(chip => (
              <button key={chip} onClick={() => sendMessage(chip)} style={{
                padding: "5px 12px", borderRadius: 20, cursor: "pointer",
                background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)",
                color: "#a8873a", fontSize: 11, fontWeight: 600,
              }}>{chip}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding: "10px 12px 14px", borderTop: "1px solid rgba(180,140,40,0.15)",
          display: "flex", gap: 8, alignItems: "center", background: "#fdf8ee", flexShrink: 0 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }}}
            placeholder="Ask a legal question…"
            disabled={loading}
            style={{
              flex: 1, padding: "10px 14px", background: "#fff",
              border: "1px solid rgba(180,140,40,0.25)", borderRadius: 12,
              color: "#0d1b2a", fontSize: 13, outline: "none",
            }}
          />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading} style={{
            width: 40, height: 40, borderRadius: 10, border: "none", flexShrink: 0,
            background: input.trim() && !loading ? LEX_GOLD : "rgba(201,168,76,0.2)",
            cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 2L7 9" stroke="#0d1b2a" strokeWidth="2" strokeLinecap="round"/>
              <path d="M14 2L9.5 14L7 9L2 6.5L14 2z" stroke="#0d1b2a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Footer */}
        <div style={{ padding: "5px 14px 8px", background: "#fdf8ee",
          textAlign: "center", borderTop: "1px solid rgba(180,140,40,0.1)", flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 10, color: "#b0a070" }}>
            Powered by <a href="https://saabai.ai" style={{ color: "#a8873a", textDecoration: "none" }}>Saabai.ai</a>
          </p>
        </div>
      </div>
    </div>
  );
}
