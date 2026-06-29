"use client";

import { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [input, setInput] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);

  const prompts = [
    "What's your approximate budget range?",
    "Which state or region are you targeting?",
    "Are you a first-home buyer or existing investor?",
    "Great. Drop your email and our principal advisor will reach out within 24 hours.",
  ];

  const submit = () => {
    if (!input.trim()) return;
    setAnswers((a) => [...a, input]);
    setInput("");
    setStep((s) => s + 1);
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-[#0891b2] px-5 py-3.5 text-sm font-medium text-white shadow-[0_30px_60px_-30px_rgba(26,43,60,0.35)] transition-transform hover:-translate-y-0.5"
        >
          <MessageCircle className="h-4 w-4" />
          Chat with us
        </button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[460px] w-[340px] flex-col overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white shadow-[0_30px_60px_-30px_rgba(26,43,60,0.35)]">
          <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.08)] bg-[#1A2B3C] px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Wholesale Homes</p>
              <p className="text-[11px] text-white/60">Typically replies in minutes</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-[#F7F8F9] p-4 text-sm">
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white p-3 shadow-sm">
              👋 Looking for house &amp; land packages? Let me help match you.
            </div>
            {prompts.slice(0, step + 1).map((p, i) => (
              <div key={`p${i}`} className="space-y-2">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white p-3 shadow-sm">{p}</div>
                {answers[i] && (
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#0891b2] p-3 text-white shadow-sm">
                    {answers[i]}
                  </div>
                )}
              </div>
            ))}
            {step >= prompts.length && (
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white p-3 shadow-sm">
                Thanks. We&apos;ll be in touch shortly with packages that match.
              </div>
            )}
          </div>
          {step < prompts.length && (
            <div className="flex items-center gap-2 border-t border-[rgba(0,0,0,0.08)] bg-white p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Type your reply..."
                className="flex-1 rounded-full border border-[rgba(0,0,0,0.12)] bg-[#f5f5f7] px-4 py-2 text-sm outline-none focus:border-[#0891b2]"
              />
              <button onClick={submit} className="rounded-full bg-[#0891b2] p-2 text-white" aria-label="Send">
                <Send className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
