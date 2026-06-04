"use client";

import { useState, useEffect, useRef } from "react";
import type { UIMessage } from "ai";

const STORAGE_KEY = "tributum-law-v2-conversation";
const STORAGE_TTL = 7 * 24 * 60 * 60 * 1000;

const NAVY = "#0F1B2E";
const GOLD = "#B8860B";
const IVORY = "#FAF8F5";
const TEXT_DARK = "#1A1A1A";
const WHITE = "#ffffff";

const AVATAR_URL = "/sites/tributum-law-v2/mathew-brittingham.jpg";

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

export default function TributumChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([
    { id: "init", role: "assistant", parts: [{ type: "text", text: "Hello. I'm Mike, Tributum Law's AI assistant. I can help with questions about tax law, ATO disputes, trusts, estate planning — or get you connected with the team. How can I help?" }] },
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
      const res = await fetch("/api/tributum-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: getText(m) })) }),
      });
      if (res.ok) {
        const data = await res.json();
        const replyText = data.content || "I apologise, I didn't catch that. Could you rephrase?";
        const botMsg: UIMessage = { id: crypto.randomUUID(), role: "assistant", parts: [{ type: "text", text: replyText }] };
        setMessages(prev => [...prev, botMsg]);
      } else {
        throw new Error("API error");
      }
    } catch {
      const errMsg: UIMessage = { id: crypto.randomUUID(), role: "assistant", parts: [{ type: "text", text: "I'm having trouble connecting right now. Please call us on +61 405 014 888 or try again shortly." }] };
      setMessages(prev => [...prev, errMsg]);
    }
    setLoading(false);
  }

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-3">
      {/* Chat Panel */}
      {isOpen && (
        <div
          className="w-[380px] max-w-[calc(100vw-48px)] rounded-2xl overflow-hidden flex flex-col"
          style={{ background: IVORY, boxShadow: "0 24px 80px rgba(15,27,46,0.3)", height: "520px", maxHeight: "calc(100vh - 120px)" }}
        >
          {/* Header */}
          <div className="px-5 py-4 flex items-center gap-3 shrink-0" style={{ background: NAVY }}>
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0" style={{ border: `2px solid ${GOLD}` }}>
              <img src={AVATAR_URL} alt="Mike" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = "none"; }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">Mike</div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Tributum AI Assistant</div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white text-xl leading-none px-1">×</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mt-0.5" style={{ border: `1.5px solid ${GOLD}` }}>
                    <img src={AVATAR_URL} alt="Mike" className="w-full h-full object-cover" />
                  </div>
                )}
                <div
                  className="max-w-[75%] px-3.5 py-2.5 text-sm leading-relaxed rounded-2xl"
                  style={{
                    background: msg.role === "user" ? NAVY : WHITE,
                    color: msg.role === "user" ? WHITE : TEXT_DARK,
                    border: msg.role === "assistant" ? `1px solid rgba(15,27,46,0.08)` : "none",
                  }}
                >
                  {getText(msg)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5">
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mt-0.5" style={{ border: `1.5px solid ${GOLD}` }}>
                  <img src={AVATAR_URL} alt="Mike" className="w-full h-full object-cover" />
                </div>
                <div className="px-3.5 py-2.5 rounded-2xl" style={{ background: WHITE, border: "1px solid rgba(15,27,46,0.08)" }}>
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: GOLD, animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: GOLD, animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: GOLD, animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 shrink-0" style={{ borderTop: "1px solid rgba(15,27,46,0.08)" }}>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") send(); }}
                placeholder="Type a message…"
                className="flex-1 px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: WHITE,
                  color: TEXT_DARK,
                  border: "1px solid rgba(15,27,46,0.12)",
                  caretColor: TEXT_DARK,
                }}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40"
                style={{ background: GOLD }}
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
        className="w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-105"
        style={{ background: GOLD, boxShadow: "0 4px 20px rgba(184,134,11,0.4)" }}
        aria-label="Chat with Mike"
      >
        <img src={AVATAR_URL} alt="Chat with Mike" className="w-11 h-11 rounded-full object-cover" style={{ border: "2px solid white" }} />
      </button>
    </div>
  );
}
