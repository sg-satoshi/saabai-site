"use client";

import { useRef, useState, useCallback, useEffect } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

// ── Brand — Gold primary theme ────────────────────────────────────────────────
const C = {
  navy:      "#0d1b2a",
  navyMid:   "#1a2d42",
  navyLight: "#243447",
  gold:      "#c9a84c",
  goldBright:"#e0bc6a",
  goldDeep:  "#a8873a",
  goldBg:    "#fdf8ee",      // warm cream background
  goldSurface:"#fef3d0",    // slightly richer for surfaces
  white:     "#ffffff",
  offWhite:  "#f0ece4",
  charcoal:  "#1c1a14",     // dark text on gold
  muted:     "#8b7d5a",     // warm muted text
  border:    "rgba(180,140,40,0.2)",
};

// ── Quick reply pools ─────────────────────────────────────────────────────────
const QUICK_REPLIES = [
  "I need help with an ATO audit",
  "I'm relocating overseas — what happens to my tax?",
  "I want to set up an asset protection structure",
  "I have assets in multiple countries — estate planning help",
  "How do I minimise CGT on a business sale?",
  "What's a discretionary trust and do I need one?",
  "I'm a foreign investor looking at Australian property",
  "Tell me about international tax treaties",
  "I need to update my will — I have overseas assets",
  "What are the SMSF rules I should know about?",
];

function pickReplies() {
  return [...QUICK_REPLIES].sort(() => Math.random() - 0.5).slice(0, 3);
}

function getFollowUpChips(response: string): string[] {
  const r = response.toLowerCase();
  const pick = (arr: string[]) => [...arr].sort(() => Math.random() - 0.5).slice(0, 3);

  if (/cgt|capital gain/.test(r))
    return pick(["What's the 50% CGT discount?", "How does the main residence exemption work?", "Small business CGT concessions?"]);
  if (/trust|discretionary/.test(r))
    return pick(["Do I need a corporate trustee?", "How are trusts taxed?", "Can a trust protect my assets from creditors?"]);
  if (/relocat|overseas|expat|residen/.test(r))
    return pick(["When do I stop being an Australian tax resident?", "What happens to my super if I leave?", "Do I still pay CGT on Australian assets?"]);
  if (/estate|will|probate/.test(r))
    return pick(["What is a testamentary trust?", "How are overseas assets handled in an Australian will?", "What is a binding death benefit nomination?"]);
  if (/audit|ato/.test(r))
    return pick(["What are my rights in an ATO audit?", "How long does an ATO audit take?", "Can I negotiate with the ATO?"]);
  if (/smsf|super/.test(r))
    return pick(["What are the SMSF contribution limits?", "Can my SMSF borrow to buy property?", "How is pension phase taxed?"]);

  return pick(["How can Tributum Law help me?", "Book a confidential consultation", "Tell me more about this"]);
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function LexAvatar({ size = 40 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${C.goldBright} 0%, ${C.gold} 100%)`,
      border: `2px solid ${C.goldDeep}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
      boxShadow: `0 2px 8px rgba(180,140,40,0.35)`,
    }}>
      <span style={{ fontSize: size * 0.38, fontWeight: 900, color: C.charcoal, fontFamily: "Georgia, serif", letterSpacing: -0.5 }}>L</span>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "10px 14px" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: "50%", background: C.goldDeep,
          animation: `lexDot 1.2s ease-in-out ${i * 0.2}s infinite`,
          display: "inline-block", opacity: 0.6,
        }} />
      ))}
      <style>{`@keyframes lexDot{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg, isLast }: { msg: ChatMessage; isLast: boolean }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", flexDirection: isUser ? "row-reverse" : "row", alignItems: "flex-end", gap: 8, marginBottom: 12 }}>
      {!isUser && <LexAvatar size={28} />}
      <div style={{
        maxWidth: "78%",
        padding: "10px 14px",
        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        background: isUser
          ? `linear-gradient(135deg, ${C.gold} 0%, ${C.goldBright} 100%)`
          : C.white,
        color: isUser ? C.charcoal : C.charcoal,
        fontSize: 13.5,
        lineHeight: 1.65,
        fontWeight: isUser ? 600 : 400,
        border: isUser ? "none" : `1px solid ${C.border}`,
        boxShadow: isUser ? "0 2px 8px rgba(201,168,76,0.25)" : "0 1px 4px rgba(0,0,0,0.3)",
        wordBreak: "break-word" as const,
        whiteSpace: "pre-wrap" as const,
      }}>
        {msg.content}
      </div>
    </div>
  );
}

// ── Main Widget ───────────────────────────────────────────────────────────────
export default function LexWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chips, setChips] = useState<string[]>(() => pickReplies());
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", email: "", matterType: "", jurisdiction: "Australia" });
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [sessionId] = useState(() => `lex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);

  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Restore session
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("lex_conv");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (messages.length) sessionStorage.setItem("lex_conv", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (!open || (!messages.length && !loading)) return;
    const c = messagesContainerRef.current;
    if (c) c.scrollTop = c.scrollHeight;
  }, [messages, loading, open]);

  // Opening greeting
  useEffect(() => {
    if (open && messages.length === 0) {
      setTimeout(() => {
        setMessages([{
          role: "assistant",
          content: "Good day. I'm Lex, Tributum Law's AI legal assistant.\n\nI'm here to help with Australian and international tax law, asset protection, estate planning, and cross-border legal matters.\n\nHow can I assist you today? Everything discussed is confidential.",
        }]);
      }, 300);
    }
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    setChips([]);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/lex-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
        signal: abortRef.current.signal,
      });

      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      let buffer = "";
      let streamingStarted = false;

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
              assistantText += parsed.delta;
              if (!streamingStarted) {
                streamingStarted = true;
                setMessages(prev => [...prev, { role: "assistant", content: assistantText }]);
              } else {
                setMessages(prev => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { role: "assistant", content: assistantText };
                  return copy;
                });
              }
            }
          } catch { /* ignore */ }
        }
      }
      // flush remaining buffer
      if (buffer.startsWith("data: ")) {
        try {
          const parsed = JSON.parse(buffer.slice(6));
          if (parsed.type === "text-delta" && parsed.delta) assistantText += parsed.delta;
        } catch { /* ignore */ }
      }
      if (!streamingStarted && assistantText) {
        setMessages(prev => [...prev, { role: "assistant", content: assistantText }]);
      }

      setChips(getFollowUpChips(assistantText));

      // Show lead form after 2 exchanges if not captured
      if (!leadCaptured && updated.filter(m => m.role === "user").length >= 2) {
        setShowLeadForm(true);
      }
    } catch (e: unknown) {
      if ((e as Error)?.name !== "AbortError") {
        setMessages(prev => [...prev, { role: "assistant", content: "I apologise — there's been a technical issue. Please try again or contact Tributum Law directly at hello@tributumlaw.com." }]);
      }
    } finally {
      setLoading(false);
    }
  }, [messages, loading, leadCaptured]);

  async function submitLead() {
    if (!leadForm.name || !leadForm.email) return;
    setLeadSubmitting(true);
    try {
      await fetch("/api/lex-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...leadForm,
          sessionId,
          conversationSnippet: messages.slice(-4).map(m => `${m.role}: ${m.content.slice(0, 200)}`).join("\n"),
        }),
      });
      setLeadCaptured(true);
      setShowLeadForm(false);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Thank you, ${leadForm.name}. A Tributum Law lawyer will be in touch at ${leadForm.email}.\n\nIn the meantime, feel free to continue asking questions.`,
      }]);
    } finally {
      setLeadSubmitting(false);
    }
  }

  // ── Launcher ────────────────────────────────────────────────────────────────
  if (!open) {
    return (
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999 }}>
        <button
          onClick={() => setOpen(true)}
          aria-label="Chat with Lex"
          style={{
            width: 64, height: 64, borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.goldBright} 0%, ${C.gold} 100%)`,
            border: `2px solid ${C.goldDeep}`,
            boxShadow: `0 8px 32px rgba(180,140,40,0.45), 0 0 0 1px rgba(201,168,76,0.3)`,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.06)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
        >
          <span style={{ fontSize: 26, fontWeight: 900, color: C.charcoal, fontFamily: "Georgia, serif" }}>L</span>
        </button>
        <div style={{
          position: "absolute", bottom: 72, right: 0,
          background: C.charcoal, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: "8px 14px", whiteSpace: "nowrap" as const,
          fontSize: 12, fontWeight: 600, color: C.offWhite,
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          pointerEvents: "none",
        }}>
          <span style={{ color: C.goldBright }}>Lex</span> · Tributum Law AI
        </div>
      </div>
    );
  }

  // ── Chat window ──────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      width: 400, height: 620,
      display: "flex", flexDirection: "column",
      background: C.goldBg,
      border: `1px solid rgba(180,140,40,0.25)`,
      borderRadius: 20,
      boxShadow: "0 24px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(201,168,76,0.15)",
      overflow: "hidden",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>

      {/* Header — gold primary */}
      <div style={{
        background: `linear-gradient(135deg, ${C.goldBright} 0%, ${C.gold} 100%)`,
        borderBottom: `1px solid ${C.goldDeep}`,
        padding: "14px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LexAvatar size={38} />
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.charcoal, letterSpacing: 0.3 }}>
              Lex <span style={{ color: C.navyMid }}>·</span> Tributum Law
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#166534", display: "inline-block" }} />
              <p style={{ margin: 0, fontSize: 11, color: C.charcoal, opacity: 0.65 }}>AI Legal Assistant · Online now</p>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a
            href="https://tributumlaw.com/contact-us"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 11, fontWeight: 700, color: C.charcoal,
              background: "rgba(0,0,0,0.1)", border: `1px solid rgba(0,0,0,0.15)`,
              borderRadius: 6, padding: "4px 10px", textDecoration: "none",
            }}
          >
            Book a Call
          </a>
          <button
            onClick={() => setOpen(false)}
            style={{ background: "none", border: "none", color: C.charcoal, opacity: 0.5, cursor: "pointer", fontSize: 18, lineHeight: 1 }}
            aria-label="Close"
          >×</button>
        </div>
      </div>

      {/* Disclaimer strip */}
      <div style={{
        background: "rgba(180,140,40,0.08)",
        borderBottom: `1px solid rgba(180,140,40,0.15)`,
        padding: "6px 14px",
        flexShrink: 0,
      }}>
        <p style={{ margin: 0, fontSize: 10.5, color: C.muted, letterSpacing: 0.2 }}>
          ⚖️ General legal information only — not legal advice. All matters are confidential.
        </p>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} style={{ flex: 1, overflowY: "auto", padding: "16px 14px 8px", display: "flex", flexDirection: "column" }}>
        {messages.map((msg, i) => (
          <Bubble key={i} msg={msg} isLast={i === messages.length - 1} />
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 12 }}>
            <LexAvatar size={28} />
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "16px 16px 16px 4px" }}>
              <TypingDots />
            </div>
          </div>
        )}

        {/* Lead capture form */}
        {showLeadForm && !leadCaptured && (
          <div style={{
            background: C.goldSurface, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "14px 16px", marginBottom: 12,
          }}>
            <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: 0.5 }}>
              GET EXPERT ADVICE
            </p>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: C.muted }}>
              Leave your details and a Tributum lawyer will follow up personally.
            </p>
            {[
              { key: "name", placeholder: "Your name", type: "text" },
              { key: "email", placeholder: "Email address", type: "email" },
              { key: "matterType", placeholder: "Matter type (e.g. Tax, Estate, Relocation)", type: "text" },
            ].map(({ key, placeholder, type }) => (
              <input
                key={key}
                type={type}
                placeholder={placeholder}
                value={leadForm[key as keyof typeof leadForm]}
                onChange={e => setLeadForm(prev => ({ ...prev, [key]: e.target.value }))}
                style={{
                  width: "100%", marginBottom: 8, padding: "9px 12px",
                  background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`,
                  borderRadius: 8, color: C.white, fontSize: 12,
                  outline: "none", boxSizing: "border-box" as const,
                }}
              />
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                onClick={submitLead}
                disabled={!leadForm.name || !leadForm.email || leadSubmitting}
                style={{
                  flex: 1, padding: "10px", borderRadius: 8, border: "none",
                  background: leadForm.name && leadForm.email ? C.gold : "rgba(201,168,76,0.3)",
                  color: C.navy, fontSize: 12, fontWeight: 800,
                  cursor: leadForm.name && leadForm.email ? "pointer" : "not-allowed",
                }}
              >
                {leadSubmitting ? "Sending…" : "Request Follow-Up"}
              </button>
              <button
                onClick={() => setShowLeadForm(false)}
                style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "none", color: C.muted, fontSize: 12, cursor: "pointer" }}
              >
                Later
              </button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick reply chips */}
      {chips.length > 0 && !loading && (
        <div style={{ padding: "6px 14px 2px", display: "flex", flexWrap: "wrap" as const, gap: 6, flexShrink: 0 }}>
          {chips.map(chip => (
            <button
              key={chip}
              onClick={() => sendMessage(chip)}
              style={{
                padding: "5px 12px", borderRadius: 20,
                background: "rgba(201,168,76,0.08)",
                border: `1px solid rgba(201,168,76,0.2)`,
                color: C.gold, fontSize: 11, fontWeight: 600,
                cursor: "pointer", whiteSpace: "nowrap" as const,
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: "10px 14px 14px",
        borderTop: `1px solid rgba(180,140,40,0.2)`,
        display: "flex", gap: 8, alignItems: "flex-end",
        background: C.goldSurface, flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }}}
          placeholder="Ask a legal question…"
          disabled={loading}
          style={{
            flex: 1, padding: "11px 14px",
            background: C.white,
            border: `1px solid rgba(180,140,40,0.25)`,
            borderRadius: 12, color: C.charcoal, fontSize: 13,
            outline: "none", resize: "none" as const,
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          style={{
            width: 42, height: 42, borderRadius: 12, border: "none",
            background: input.trim() && !loading ? C.gold : "rgba(201,168,76,0.2)",
            cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.2s",
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke={C.navy} strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M22 2L15 22L11 13L2 9L22 2z" stroke={C.navy} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Footer */}
      <div style={{ background: C.goldSurface, padding: "6px 14px 10px", textAlign: "center", flexShrink: 0, borderTop: `1px solid rgba(180,140,40,0.12)` }}>
        <p style={{ margin: 0, fontSize: 10, color: "rgba(139,125,90,0.7)" }}>
          Powered by <a href="https://saabai.ai" style={{ color: C.muted, textDecoration: "none" }}>Saabai.ai</a> · <a href="https://tributumlaw.com" style={{ color: C.muted, textDecoration: "none" }}>tributumlaw.com</a>
        </p>
      </div>
    </div>
  );
}
