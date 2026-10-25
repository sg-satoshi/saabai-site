"use client";

import { useRef, useState } from "react";
import { trackMarketingLead } from "../../../lib/marketing/browser";
import { contactInText } from "../../../lib/marketing/public";

type Role = "user" | "assistant";
type Msg = { role: Role; content: string };

const GREETING =
  "Good day. I'm Lex, an AI demo for Harbour Street Legal, an example firm. I can't give legal advice.";

const STARTERS: { label: string; text: string }[] = [
  { label: "New client enquiry", text: "I have a new client enquiry." },
  { label: "What does a will cost?", text: "What does a will cost?" },
  { label: "Book a consult", text: "I would like to book a consult." },
  { label: "After-hours enquiry", text: "It is after hours. Can someone help me?" },
];

const TROUBLE =
  "Lex is having trouble responding. Please try again, or use the button below to talk to Saabai.";

export default function LexDemoPanel() {
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const userTurns = messages.filter((m) => m.role === "user").length;

  function scrollLog() {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const history = [...messages, { role: "user" as const, content: trimmed }];
    const contact = contactInText(trimmed);
    if (contact.email || contact.phone) {
      trackMarketingLead({ source: "lex", email: contact.email, phone: contact.phone, contentName: "Lex chat" });
    }
    setMessages(history);
    setInput("");
    setLoading(true);
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    requestAnimationFrame(scrollLog);

    const fail = (content: string) => {
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    };

    try {
      const res = await fetch("/api/legal-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: abort.signal,
      });
      const type = res.headers.get("content-type") || "";
      if (type.includes("application/json") || !res.body) {
        const data = (await res.json().catch(() => null)) as { content?: string } | null;
        fail(data?.content || TROUBLE);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistant = "";
      let started = false;

      const apply = (next: string, replace: boolean) => {
        assistant = replace ? next : assistant + next;
        if (!started) {
          started = true;
          setMessages((prev) => [...prev, { role: "assistant", content: assistant }]);
        } else {
          setMessages((prev) => {
            const copy = prev.slice();
            copy[copy.length - 1] = { role: "assistant", content: assistant };
            return copy;
          });
        }
        requestAnimationFrame(scrollLog);
      };

      const take = (line: string) => {
        if (!line.startsWith("data: ")) return;
        try {
          const parsed = JSON.parse(line.slice(6)) as { type?: string; delta?: string; text?: string };
          if (parsed.type === "text-delta" && parsed.delta) apply(parsed.delta, false);
          if (parsed.type === "replace" && typeof parsed.text === "string") apply(parsed.text, true);
        } catch {
          /* ignore a partial frame */
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) take(line);
      }
      if (buffer) take(buffer);
      if (!started) fail(TROUBLE);
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") fail(TROUBLE);
    } finally {
      setLoading(false);
      requestAnimationFrame(scrollLog);
    }
  }

  return (
    <div className="lx-chat">
      <div className="lx-chat-bar">
        <span className="lx-chat-mark" aria-hidden="true">L</span>
        <span className="lx-chat-who">
          <strong>Lex</strong>
          <span>Harbour Street Legal · Example firm</span>
        </span>
        <span className="lx-chat-pill">AI demo</span>
      </div>
      <p className="lx-chat-note">AI demo only. Not legal advice. Nothing you type is sent to a lawyer.</p>
      <div className="lx-chat-log" ref={logRef} role="log" aria-live="polite" aria-relevant="additions">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === "user" ? "lx-chat-row lx-chat-me" : "lx-chat-row"}>
            {msg.role === "assistant" && <span className="lx-chat-mark lx-chat-mark-sm" aria-hidden="true">L</span>}
            <p className={msg.role === "user" ? "lx-bubble lx-bubble-me" : "lx-bubble"}>{msg.content}</p>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role === "user" && (
          <div className="lx-chat-row">
            <span className="lx-chat-mark lx-chat-mark-sm" aria-hidden="true">L</span>
            <p className="lx-bubble lx-typing" aria-label="Lex is replying"><i /><i /><i /></p>
          </div>
        )}
      </div>
      {userTurns === 0 && !loading && (
        <div className="lx-chat-starters">
          {STARTERS.map((s) => (
            <button key={s.label} type="button" onClick={() => send(s.text)}>{s.label}</button>
          ))}
        </div>
      )}
      <form
        className="lx-chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about a consult, fees or a new enquiry"
          aria-label="Message Lex"
          disabled={loading}
          maxLength={600}
        />
        <button type="submit" disabled={loading || !input.trim()}>Send</button>
      </form>
      {userTurns > 0 && !loading && (
        <button
          type="button"
          className="lx-chat-reset"
          onClick={() => {
            abortRef.current?.abort();
            setMessages([{ role: "assistant", content: GREETING }]);
            setInput("");
          }}
        >
          Start again
        </button>
      )}
    </div>
  );
}
