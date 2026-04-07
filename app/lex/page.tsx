"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ── Brand ─────────────────────────────────────────────────────────────────────
const C = {
  bg:           "#0d1b2a",   // deep navy background
  surface:      "#162236",   // card/panel surface
  surfaceRaised:"#1e3050",   // elevated surfaces
  border:       "#243550",   // subtle border
  borderAccent: "#2d4870",   // stronger border on focus
  navy:         "#1B2B4B",
  gold:         "#C9A84C",   // primary gold accent
  goldBright:   "#E0BC6A",
  goldDim:      "#8a6e30",
  goldBg:       "rgba(201,168,76,0.08)",
  goldBorder:   "rgba(201,168,76,0.2)",
  text:         "#e8edf5",   // primary text
  textMuted:    "#8fa3c0",   // secondary text
  textDim:      "#4a6080",   // tertiary / placeholders
  white:        "#ffffff",
  green:        "#22c55e",
  userBubble:   "#1e3050",
  aiBubble:     "#1B2B4B",
};

type ChatMessage  = { role: "user" | "assistant"; content: string };
type Thread       = { id: string; title: string; messages: ChatMessage[]; createdAt: number };

// ── Helpers ───────────────────────────────────────────────────────────────────
function threadTitle(msgs: ChatMessage[]): string {
  const first = msgs.find(m => m.role === "user")?.content ?? "New research";
  return first.length > 52 ? first.slice(0, 52) + "…" : first;
}

function fmtDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

// ── Lex avatar ────────────────────────────────────────────────────────────────
function LexMark({ size = 32 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${C.goldBright} 0%, ${C.gold} 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, border: `1.5px solid ${C.goldDim}`,
    }}>
      <span style={{ fontSize: size * 0.42, fontWeight: 900, color: C.bg, fontFamily: "Georgia, serif" }}>L</span>
    </div>
  );
}

// ── Thinking dots ─────────────────────────────────────────────────────────────
function ThinkingDots({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px",
      background: C.aiBubble, borderRadius: "16px 16px 16px 4px",
      border: `1px solid ${C.border}`, maxWidth: 220 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[0,1,2].map(i => (
          <span key={i} style={{
            width: 5, height: 5, borderRadius: "50%", background: C.gold, display: "block",
            animation: `lexDot 1.2s ease-in-out ${i*0.2}s infinite`,
          }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: C.textMuted }}>{label}</span>
    </div>
  );
}

// ── Render message content (markdown-lite) ────────────────────────────────────
function renderLex(text: string): React.ReactNode[] {
  // Fix period-space
  text = text.replace(/([a-z\)])\. ?([A-Z])/g, "$1. $2");
  const paragraphs = text.split(/\n{2,}/);
  const out: React.ReactNode[] = [];
  const linkRe = /(\*\*([^*]+)\*\*|\[([^\]]+)\]\(((?:https?|mailto):\/\/[^\)]+)\))/g;

  paragraphs.forEach((para, pi) => {
    if (pi > 0) out.push(<div key={`gap-${pi}`} style={{ height: 8 }} />);
    para.split("\n").forEach((line, li) => {
      if (li > 0) out.push(<br key={`br-${pi}-${li}`} />);
      const nodes: React.ReactNode[] = [];
      let last = 0, key = 0, m: RegExpExecArray | null;
      linkRe.lastIndex = 0;
      while ((m = linkRe.exec(line)) !== null) {
        if (m.index > last) nodes.push(line.slice(last, m.index));
        if (m[0].startsWith("**")) {
          nodes.push(<strong key={`b-${pi}-${li}-${key++}`} style={{ color: C.goldBright }}>{m[2]}</strong>);
        } else {
          nodes.push(
            <a key={`a-${pi}-${li}-${key++}`} href={m[4]} target="_blank" rel="noopener noreferrer"
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

// ── Thinking label from query ─────────────────────────────────────────────────
function thinkingFor(msg: string): string {
  const l = msg.toLowerCase();
  if (/austlii|case law|case|judgment|tribunal/.test(l)) return "Searching AustLII…";
  if (/ato|tax|ruling|gst|cgt|income/.test(l)) return "Checking ATO…";
  if (/legislation|act|section|regulation|statute/.test(l)) return "Searching legislation…";
  if (/uk|england|new zealand|nz|ireland|international/.test(l)) return "Searching international databases…";
  if (/draft|write|letter|advice|memo/.test(l)) return "Drafting…";
  return "Researching…";
}

// ── Quick replies ─────────────────────────────────────────────────────────────
const QUICK_REPLIES = [
  "What are the elements of negligence under Australian law?",
  "Summarise the duty of care test from Donoghue v Stevenson",
  "What does s 180 Corporations Act say about director duties?",
  "Search AustLII for recent unfair dismissal cases",
  "What are the CGT implications of a trust distribution?",
  "What is the test for unconscionable conduct under the ACL?",
  "Draft a short letter of advice on a breach of contract",
  "Search ATO rulings on Division 7A and loan repayments",
  "What is the reasonable person standard in negligence?",
  "Explain the difference between binding and persuasive authority",
];

function pickReplies() {
  return [...QUICK_REPLIES].sort(() => Math.random() - 0.5).slice(0, 4);
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LexPage() {
  const clientId = "lex-internal";

  const [threads, setThreads] = useState<Thread[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("lex_threads") ?? "[]") as Thread[];
    } catch { return []; }
  });

  const [activeId, setActiveId] = useState<string | null>(() =>
    threads.length > 0 ? threads[0].id : null
  );

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinkLabel, setThinkLabel] = useState("Researching…");
  const [chips, setChips] = useState<string[]>(() => pickReplies());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const abortRef   = useRef<AbortController | null>(null);

  const activeThread = threads.find(t => t.id === activeId) ?? null;
  const messages = activeThread?.messages ?? [];

  // Persist threads
  useEffect(() => {
    try { localStorage.setItem("lex_threads", JSON.stringify(threads)); } catch {}
  }, [threads]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "auto";
    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
  }, [input]);

  function newThread() {
    const id = `t_${Date.now()}`;
    const thread: Thread = { id, title: "New research", messages: [], createdAt: Date.now() };
    setThreads(prev => [thread, ...prev]);
    setActiveId(id);
    setInput("");
    setChips(pickReplies());
  }

  function deleteThread(id: string) {
    setThreads(prev => prev.filter(t => t.id !== id));
    if (activeId === id) {
      const remaining = threads.filter(t => t.id !== id);
      setActiveId(remaining[0]?.id ?? null);
    }
  }

  function updateThreadMessages(id: string, msgs: ChatMessage[]) {
    setThreads(prev => prev.map(t =>
      t.id === id
        ? { ...t, messages: msgs, title: threadTitle(msgs) }
        : t
    ));
  }

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    let tid = activeId;
    // Create a new thread if none active
    if (!tid) {
      tid = `t_${Date.now()}`;
      const newT: Thread = { id: tid, title: "New research", messages: [], createdAt: Date.now() };
      setThreads(prev => [newT, ...prev]);
      setActiveId(tid);
    }

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const prevMsgs = threads.find(t => t.id === tid)?.messages ?? [];
    const updated = [...prevMsgs, userMsg];

    updateThreadMessages(tid, updated);
    setInput("");
    setLoading(true);
    setChips([]);
    setThinkLabel(thinkingFor(text));

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/lex-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, clientId }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";
      let started = false;
      const finalId = tid;

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
              const withAI: ChatMessage[] = [...updated, { role: "assistant", content: fullText }];
              if (!started) {
                started = true;
                setLoading(false);
              }
              updateThreadMessages(finalId, withAI);
            }
          } catch {}
        }
      }

      if (fullText.trim()) {
        const final: ChatMessage[] = [...updated, { role: "assistant", content: fullText.trim() }];
        updateThreadMessages(finalId, final);
        // Follow-up chips
        setChips(pickReplies());
      }
    } catch (e: unknown) {
      if ((e as Error)?.name !== "AbortError") {
        const errMsgs: ChatMessage[] = [
          ...updated,
          { role: "assistant", content: "There was a problem reaching the research API. Please try again." },
        ];
        if (tid) updateThreadMessages(tid, errMsgs);
      }
    } finally {
      setLoading(false);
    }
  }, [activeId, threads, loading, clientId]);

  function copyLast() {
    const last = [...messages].reverse().find(m => m.role === "assistant");
    if (!last) return;
    navigator.clipboard.writeText(last.content).then(() => {
      setCopyFeedback("Copied!");
      setTimeout(() => setCopyFeedback(null), 1500);
    });
  }

  const showWelcome = messages.length === 0;

  return (
    <div style={{
      display: "flex", height: "100dvh", overflow: "hidden",
      background: C.bg, color: C.text,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif",
    }}>
      <style>{`
        @keyframes lexDot{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px}
        * { box-sizing: border-box; }
      `}</style>

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <aside style={{
          width: 260, flexShrink: 0, display: "flex", flexDirection: "column",
          background: C.surface, borderRight: `1px solid ${C.border}`,
        }}>
          {/* Brand */}
          <div style={{ padding: "18px 16px 12px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <LexMark size={34} />
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.text, letterSpacing: 0.2 }}>Lex</p>
                <p style={{ margin: 0, fontSize: 10, color: C.textMuted }}>Australian Legal Research</p>
              </div>
            </div>
          </div>

          {/* New thread button */}
          <div style={{ padding: "10px 12px" }}>
            <button onClick={newThread} style={{
              width: "100%", padding: "9px 12px", borderRadius: 10,
              background: C.goldBg, border: `1px solid ${C.goldBorder}`,
              color: C.gold, fontSize: 12, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              New Research Thread
            </button>
          </div>

          {/* Thread list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
            {threads.length === 0 && (
              <p style={{ textAlign: "center", color: C.textDim, fontSize: 11, marginTop: 24, padding: "0 12px" }}>
                No threads yet. Start a new research session above.
              </p>
            )}
            {threads.map(thread => (
              <div
                key={thread.id}
                onClick={() => { setActiveId(thread.id); setChips(pickReplies()); }}
                style={{
                  padding: "9px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 2,
                  background: activeId === thread.id ? C.surfaceRaised : "transparent",
                  border: activeId === thread.id ? `1px solid ${C.borderAccent}` : "1px solid transparent",
                  display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: activeId === thread.id ? C.text : C.textMuted,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {thread.title}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 10, color: C.textDim }}>{fmtDate(thread.createdAt)}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteThread(thread.id); }}
                  style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer",
                    padding: 2, borderRadius: 4, flexShrink: 0, lineHeight: 1, fontSize: 14 }}
                  title="Delete thread"
                >×</button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
            <a href="/client-portal" style={{ display: "block", fontSize: 11, color: C.textMuted,
              textDecoration: "none", padding: "6px 0" }}>
              ⚙ Firm Dashboard
            </a>
            <a href="https://saabai.ai" target="_blank" rel="noopener noreferrer"
              style={{ display: "block", fontSize: 10, color: C.textDim, textDecoration: "none", marginTop: 4 }}>
              Powered by Saabai.ai
            </a>
          </div>
        </aside>
      )}

      {/* ── Main panel ───────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Toolbar */}
        <div style={{
          height: 52, borderBottom: `1px solid ${C.border}`, padding: "0 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: C.surface, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setSidebarOpen(v => !v)}
              style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 4 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            {!sidebarOpen && <LexMark size={26} />}
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.textMuted }}>
              {activeThread ? activeThread.title : "Lex — Australian Legal Research"}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {messages.some(m => m.role === "assistant") && (
              <button onClick={copyLast} style={{
                background: "none", border: `1px solid ${C.border}`, borderRadius: 6,
                color: C.textMuted, fontSize: 11, cursor: "pointer", padding: "4px 10px",
              }}>
                {copyFeedback ?? "Copy last response"}
              </button>
            )}
            <button onClick={newThread} style={{
              background: C.goldBg, border: `1px solid ${C.goldBorder}`,
              borderRadius: 6, color: C.gold, fontSize: 11, fontWeight: 700,
              cursor: "pointer", padding: "4px 12px",
            }}>+ New Thread</button>
          </div>
        </div>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 0" }}>
          <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px" }}>

            {/* Welcome screen */}
            {showWelcome && (
              <div style={{ textAlign: "center", paddingTop: 40 }}>
                <LexMark size={56} />
                <h1 style={{ margin: "16px 0 8px", fontSize: 26, fontWeight: 800, color: C.text }}>
                  Lex — Australian Legal Research
                </h1>
                <p style={{ margin: "0 0 32px", fontSize: 14, color: C.textMuted, lineHeight: 1.6 }}>
                  Real-time research across AustLII, ATO, Federal Legislation, and international databases.
                  <br/>Every response cites its source.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 560, margin: "0 auto 32px" }}>
                  {chips.map(chip => (
                    <button key={chip} onClick={() => sendMessage(chip)}
                      style={{
                        padding: "12px 14px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                        background: C.surface, border: `1px solid ${C.border}`,
                        color: C.textMuted, fontSize: 12, lineHeight: 1.4, fontWeight: 400,
                      }}>
                      {chip}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center",
                  flexWrap: "wrap", fontSize: 11, color: C.textDim }}>
                  {["AustLII case law", "ATO rulings", "Federal legislation", "International law"].map(tag => (
                    <span key={tag} style={{
                      padding: "4px 10px", borderRadius: 20,
                      background: C.goldBg, border: `1px solid ${C.goldBorder}`, color: C.gold,
                    }}>{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: "flex", gap: 12, marginBottom: 20,
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
              }}>
                {msg.role === "assistant" && <LexMark size={28} />}
                <div style={{
                  maxWidth: msg.role === "user" ? "70%" : "100%",
                  padding: "12px 16px",
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: msg.role === "user" ? C.userBubble : C.aiBubble,
                  border: `1px solid ${C.border}`,
                  fontSize: 14, lineHeight: 1.7, color: C.text,
                }}>
                  {renderLex(msg.content)}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                <LexMark size={28} />
                <ThinkingDots label={thinkLabel} />
              </div>
            )}

            {/* Follow-up chips after response */}
            {!loading && !showWelcome && chips.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, marginLeft: 40 }}>
                {chips.map(chip => (
                  <button key={chip} onClick={() => sendMessage(chip)} style={{
                    padding: "6px 14px", borderRadius: 20, cursor: "pointer",
                    background: C.goldBg, border: `1px solid ${C.goldBorder}`,
                    color: C.gold, fontSize: 11, fontWeight: 500,
                  }}>
                    {chip}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input area */}
        <div style={{
          borderTop: `1px solid ${C.border}`, background: C.surface,
          padding: "14px 24px 18px", flexShrink: 0,
        }}>
          <div style={{ maxWidth: 780, margin: "0 auto" }}>
            <div style={{
              display: "flex", gap: 10, alignItems: "flex-end",
              background: C.bg, border: `1.5px solid ${C.borderAccent}`,
              borderRadius: 14, padding: "10px 12px",
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
                }}
                placeholder="Ask a legal research question… (Shift+Enter for new line)"
                disabled={loading}
                rows={1}
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  color: C.text, fontSize: 14, resize: "none", lineHeight: 1.6,
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                style={{
                  width: 36, height: 36, borderRadius: 10, border: "none", flexShrink: 0,
                  background: input.trim() && !loading ? C.gold : C.goldBg,
                  cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M14 2L7 9" stroke={C.bg} strokeWidth="2" strokeLinecap="round"/>
                  <path d="M14 2L9.5 14L7 9L2 6.5L14 2z" stroke={C.bg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 10.5, color: C.textDim, textAlign: "center" }}>
              Lex searches AustLII, ATO, and legislation.gov.au in real-time. Always cite-check before use in practice. •{" "}
              <a href="https://austlii.edu.au" target="_blank" rel="noopener noreferrer" style={{ color: C.textDim }}>AustLII</a>{" "}
              <a href="https://ato.gov.au" target="_blank" rel="noopener noreferrer" style={{ color: C.textDim }}>ATO</a>{" "}
              <a href="https://legislation.gov.au" target="_blank" rel="noopener noreferrer" style={{ color: C.textDim }}>legislation.gov.au</a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
