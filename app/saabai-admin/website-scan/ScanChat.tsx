"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";

const inp: React.CSSProperties = { height: 40, padding: "0 12px", borderRadius: 8, border: "1px solid #6a6ec9", background: "#0b092e", color: "#fff", fontSize: 15, width: "100%" };
const btn: React.CSSProperties = { height: 40, padding: "0 18px", borderRadius: 8, border: 0, background: "#ffd23f", color: "#0b092e", fontWeight: 700, cursor: "pointer" };

function textOf(m: UIMessage): string {
  return m.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text" && typeof (p as { text?: unknown }).text === "string")
    .map((p) => p.text)
    .join("\n\n");
}

function toolLine(part: UIMessage["parts"][number]): string | null {
  const p = part as { type?: string; toolName?: string; state?: string; output?: { url?: string; error?: string; ok?: boolean }; input?: { url?: string } };
  const type = p.type ?? "";
  if (type !== "dynamic-tool" && !type.startsWith("tool-")) return null;
  const name = p.toolName || type.replace(/^tool-/, "");
  const pending = p.state && p.state !== "output-available" && p.state !== "output-error";
  if (name === "refetch_page") {
    if (pending) return "Re-fetching the live page.";
    if (p.output?.error) return `Re-fetch failed: ${p.output.error}`;
    return `Re-fetched ${p.output?.url || p.input?.url || "the page"}.`;
  }
  if (name === "flag_false_positive") {
    if (pending) return "Recording the false positive.";
    return p.output?.error ? `Flag failed: ${p.output.error}` : "False positive recorded.";
  }
  return null;
}

const CHIPS = [
  "Re-fetch the homepage and say which findings the live HTML supports. Quote the tags.",
  "Re-fetch the homepage and check the title and meta description. If the scan is wrong, say so.",
];

export default function ScanChat({ reportId, onFlagged }: { reportId: string; onFlagged?: () => void }) {
  const [input, setInput] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const seenFlags = useRef(new Set<string>());
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/admin/site-scan/chat", body: { reportId } }), [reportId]);
  const { messages, sendMessage, status, error } = useChat({ id: `scan-${reportId}`, transport });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => {
    for (const m of messages) {
      for (const part of m.parts) {
        const p = part as { type?: string; toolName?: string; toolCallId?: string; state?: string; output?: { ok?: boolean } };
        const name = p.toolName || (p.type ?? "").replace(/^tool-/, "");
        if (name !== "flag_false_positive" || p.state !== "output-available" || p.output?.ok === false) continue;
        const id = p.toolCallId || `${m.id}-flag`;
        if (seenFlags.current.has(id)) continue;
        seenFlags.current.add(id);
        onFlagged?.();
      }
    }
  }, [messages, onFlagged]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    await sendMessage({ text: t });
  };

  return (
    <section aria-label="Scan chat" style={{ marginTop: 18, background: "#14123a", border: "1px solid #62c5d138", borderRadius: 14, padding: 18 }}>
      <h2 style={{ fontSize: 20, margin: 0 }}>Ask about this scan</h2>
      <p style={{ color: "#a5b4fc", margin: "6px 0 12px", fontSize: 14 }}>Admin only. Mia uses this scan and the page HTML. Ask her to re-fetch a URL when a finding looks wrong. She quotes the evidence.</p>
      <div role="log" aria-live="polite" style={{ display: "grid", gap: 10, maxHeight: 420, overflow: "auto", marginBottom: 12 }}>
        {messages.length === 0 && <p style={{ color: "#8d9cc4", margin: 0, fontSize: 14 }}>No questions yet. Try one of the prompts, or ask about a specific check id.</p>}
        {messages.map((m) => (
          <div key={m.id} style={{ justifySelf: m.role === "user" ? "end" : "start", maxWidth: "92%", background: m.role === "user" ? "#2a2870" : "#0b092e", border: "1px solid #ffffff18", borderRadius: 10, padding: "8px 12px" }}>
            <div style={{ fontSize: 11, color: "#8d9cc4", marginBottom: 4 }}>{m.role === "user" ? "You" : "Mia"}</div>
            {m.parts.map((part, i) => {
              const line = toolLine(part);
              if (line) return <div key={i} style={{ fontSize: 12, color: "#62c5d1", marginBottom: 4 }}>{line}</div>;
              return null;
            })}
            {textOf(m) && <div style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.45 }}>{textOf(m)}</div>}
          </div>
        ))}
        <div ref={end} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {CHIPS.map((c) => <button key={c} type="button" disabled={busy} onClick={() => send(c)} style={{ ...btn, height: "auto", minHeight: 32, padding: "6px 10px", background: "#2a2870", color: "#fff", fontWeight: 600, fontSize: 12, textAlign: "left" }}>{c}</button>)}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} style={{ display: "flex", gap: 8 }}>
        <input aria-label="Question about this scan" style={inp} value={input} placeholder="Ask about a finding, or name a URL to re-fetch" onChange={(e) => setInput(e.target.value)} />
        <button style={btn} type="submit" disabled={busy}>{busy ? "Thinking..." : "Send"}</button>
      </form>
      {error && <p role="alert" style={{ color: "#fca5a5", fontSize: 13 }}>{error.message || "The chat failed."}</p>}
    </section>
  );
}
