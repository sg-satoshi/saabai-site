"use client";
/**
 * In-app Lex Assist panel. Clearly labelled as an AI assistant; product help only.
 * When the assistant offers to log a problem or idea, nothing is sent until the user taps "Yes, log it",
 * which files it in the feedback inbox (/api/lex-feedback, source "assistant").
 */
import { useState } from "react";
import { usePathname } from "next/navigation";
import { enabledAssistModes, type LexAssistMode } from "@/lib/lex-help-modes";

type Msg = { role: "user" | "assistant"; content: string };
type Offer = { type: "bug" | "idea" | "question"; summary: string };
const navy = { background: "#1b2559", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer", fontWeight: 600 } as const;
const OFFER_LABEL = { bug: "problem", idea: "feature idea", question: "question" };

export default function HelpAssistant() {
  const path = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [offer, setOffer] = useState<(Offer & { id: string }) | null>(null);
  const modes = enabledAssistModes();
  const [mode, setMode] = useState<LexAssistMode>("ask");
  const [cid] = useState(() => Math.random().toString(36).slice(2, 12));
  if (path.startsWith("/lex/signup")) return null;

  async function send() {
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs(next); setText(""); setBusy(true); setOffer(null);
    try {
      const r = await fetch("/api/lex-help", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next, conversationId: cid, page: path }) });
      const d = await r.json().catch(() => ({}));
      setMsgs([...next, { role: "assistant", content: d.reply || d.error || d.content || "Sorry, I couldn't answer that. Please try again." }]);
      setOffer(d.offer && d.offerId ? { ...d.offer, id: d.offerId } : null);
    } catch { setMsgs([...next, { role: "assistant", content: "Sorry, help is unavailable right now." }]); }
    setBusy(false);
  }

  async function confirmLog(o: Offer & { id: string }) {
    setOffer(null);
    const r = await fetch("/api/lex-help", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmOffer: o.id, page: path }) });
    setMsgs((m) => [...m, { role: "assistant", content: r.ok ? `Logged your ${OFFER_LABEL[o.type]} for the Saabai team. Thanks.` : "Sorry, I couldn't log that. You can use Report an issue instead." }]);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} style={{ ...navy, position: "fixed", right: 16, bottom: 136, zIndex: 60, borderRadius: 999, padding: "6px 12px", fontSize: 12 }}aria-label="Open Lex Assist">Lex Assist</button>
      {open ? (
        <section role="dialog" aria-label="Lex Assist" style={{ position: "fixed", right: 16, bottom: 176, zIndex: 61, width: "min(380px, calc(100vw - 32px))", height: "min(520px, 70vh)", display: "flex", flexDirection: "column", background: "#fff", color: "#111827", border: "1px solid #d8dce5", borderRadius: 14, boxShadow: "0 12px 32px rgba(0,0,0,0.18)" }}>
          <header style={{ padding: "10px 14px", borderBottom: "1px solid #eef0f4", display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 }}>
            <div><strong style={{ fontSize: 14 }}>Lex Assist</strong><div style={{ fontSize: 11, color: "#6b7280" }}>AI assistant for using Lex. Not legal advice. Don&apos;t include client details.</div></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close help" style={{ background: "none", border: 0, fontSize: 18, cursor: "pointer" }}>×</button>
          </header>
          {modes.length > 1 ? (
            <div role="tablist" aria-label="Lex Assist mode" style={{ display: "flex", gap: 4, padding: "6px 10px", borderBottom: "1px solid #eef0f4" }}>
              {modes.map((m) => <button key={m.id} type="button" role="tab" aria-selected={mode === m.id} onClick={() => setMode(m.id)} style={mode === m.id ? { ...navy, padding: "4px 10px", fontSize: 12 } : { background: "none", border: "1px solid #cfd4dd", borderRadius: 8, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>{m.label}</button>)}
            </div>
          ) : null}
          {mode === "ask" ? (<>
          <div style={{ flex: 1, overflowY: "auto", padding: 12, fontSize: 13, lineHeight: 1.45 }} aria-live="polite">
            {msgs.length === 0 ? <p style={{ color: "#6b7280" }}>Ask how to do something in Lex, or tell me about a problem or a feature you&apos;d like.</p> : null}
            {msgs.map((m, i) => <p key={i} style={{ whiteSpace: "pre-wrap", margin: "0 0 8px", padding: 8, borderRadius: 8, background: m.role === "user" ? "#eef1fb" : "#f7f7f9" }}><span style={{ fontSize: 10, color: "#6b7280", display: "block" }}>{m.role === "user" ? "You" : "Assistant (AI)"}</span>{m.content}</p>)}
            {busy ? <p style={{ color: "#6b7280" }}>Thinking…</p> : null}
            {offer ? (
              <div style={{ border: "1px solid #d8dce5", borderRadius: 8, padding: 8 }}>
                <p style={{ margin: "0 0 6px" }}>Log this {OFFER_LABEL[offer.type]} for the Saabai team?<br /><em>{offer.summary}</em></p>
                <button type="button" style={{ ...navy, padding: "5px 10px", fontSize: 12, marginRight: 6 }} onClick={() => confirmLog(offer)}>Yes, log it</button>
                <button type="button" style={{ background: "none", border: "1px solid #cfd4dd", borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer" }} onClick={() => setOffer(null)}>No thanks</button>
              </div>
            ) : null}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); void send(); }} style={{ display: "flex", gap: 6, padding: 10, borderTop: "1px solid #eef0f4" }}>
            <input aria-label="Ask Lex Assist" value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} placeholder="How do I…" style={{ flex: 1, padding: 8, border: "1px solid #cfd4dd", borderRadius: 8, fontSize: 13 }} />
            <button type="submit" disabled={busy || !text.trim()} style={{ ...navy, padding: "6px 12px", fontSize: 13, opacity: busy ? 0.6 : 1 }}>Send</button>
          </form>
          </>) : null /* phase 2: report / suggest panes slot in here */}
        </section>
      ) : null}
    </>
  );
}
