"use client";

import { useRef, useState, useCallback } from "react";

const PETER_VOICE_ID = "txdmFzaxxwmYbb99FY4D";

const PETER_SYSTEM_PROMPT = `You are Pete, founder of Saabai.ai — an AI automation company helping trade and professional services businesses save time and scale without hiring.

You're speaking with someone at PlasticOnline (also known as PLON or Holland Plastics), a plastics distribution business in Australia. You recently completed an AI audit for them and are now scoping out a full AI agent build.

Your role: have a natural, confident conversation. Help them think through the scoping form on this page. Answer questions about what the AI agent will do, how it integrates with WooCommerce and Pipedrive, and what kind of results they can expect.

Keep replies short — 2–3 sentences max. Be warm and direct.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function PeterAvatarWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobUrlRef = useRef<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);
  const isStartedRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if (audioBlobUrlRef.current) {
      URL.revokeObjectURL(audioBlobUrlRef.current);
      audioBlobUrlRef.current = null;
    }
    isSpeakingRef.current = false;
    setIsSpeaking(false);
  }

  const startListening = useCallback(() => {
    if (recognitionRef.current || isSpeakingRef.current || !isStartedRef.current) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-AU";

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as any)
        .map((r: any) => r[0].transcript)
        .join("");
      setInputValue(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      setInputValue((current) => {
        const text = current.trim();
        if (text) {
          handleUserMessage(text);
          return "";
        }
        // Silence timeout — restart
        if (isStartedRef.current && !isSpeakingRef.current) {
          setTimeout(() => {
            if (isStartedRef.current && !recognitionRef.current && !isSpeakingRef.current) {
              startListening();
            }
          }, 500);
        }
        return current;
      });
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }

  async function playVoice(text: string) {
    if (!text.trim()) return;
    stopAudio();
    stopListening();
    setError(null);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId: PETER_VOICE_ID }),
      });
      if (!res.ok) { setError(`Voice error: ${res.status}`); return; }

      const blob = await res.blob();
      if (!blob.size) { setError("Empty audio"); return; }

      const url = URL.createObjectURL(blob);
      audioBlobUrlRef.current = url;

      // Ensure audio element is unlocked (created during user gesture in handleStart)
      const audio = audioRef.current!;
      audio.src = url;
      isSpeakingRef.current = true;
      setIsSpeaking(true);

      await audio.play();

      audio.onended = () => {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        if (audioBlobUrlRef.current === url) audioBlobUrlRef.current = null;
        // Auto-listen after speaking
        if (isStartedRef.current) {
          setTimeout(() => {
            if (isStartedRef.current && !recognitionRef.current && !isSpeakingRef.current) {
              startListening();
            }
          }, 350);
        }
      };
    } catch (err) {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      setError(String(err).slice(0, 100));
    }
  }

  async function handleUserMessage(text: string) {
    if (!text.trim()) return;

    const updated: ChatMessage[] = [...messagesRef.current, { role: "user", content: text }];
    messagesRef.current = updated;
    setIsThinking(true);
    stopListening();

    try {
      const res = await fetch("/api/pete-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });

      if (!res.ok) throw new Error(`Chat error ${res.status}: ${await res.text()}`);

      // AI SDK v6 SSE format: data: {"type":"text-delta","delta":"..."}
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.type === "text-delta" && parsed.delta) fullText += parsed.delta;
            } catch {}
          }
        }
      }

      if (fullText.trim()) {
        messagesRef.current = [...updated, { role: "assistant", content: fullText.trim() }];
        setIsThinking(false);
        await playVoice(fullText.trim());
      } else {
        setIsThinking(false);
        startListening();
      }
    } catch (err) {
      setError(String(err).slice(0, 120));
      setIsThinking(false);
    }
  }

  async function handleStart() {
    // Pre-unlock audio element during user gesture
    const audio = new Audio();
    audio.volume = 0;
    audio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAVFYAAFRWAAABAAgAZGF0YQAAAAA=";
    audio.play().catch(() => {});
    audio.volume = 1;
    audioRef.current = audio;

    isStartedRef.current = true;
    setIsStarted(true);

    // Greeting
    const greeting = "Hey — Peter here. I'm here if you have any questions while you're filling in the form. What are you thinking so far?";
    messagesRef.current = [{ role: "assistant", content: greeting }];
    await playVoice(greeting);
  }

  function handleClose() {
    stopAudio();
    stopListening();
    isStartedRef.current = false;
    setIsStarted(false);
    setIsOpen(false);
    setError(null);
    setInputValue("");
    messagesRef.current = [];
  }

  async function handleSend() {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue("");
    await handleUserMessage(text);
  }

  const statusLabel = isSpeaking ? "Speaking" : isListening ? "Listening" : isThinking ? "Thinking…" : isStarted ? "Ready" : "";
  const statusColor = isSpeaking ? "bg-saabai-teal" : isListening ? "bg-green-400" : isThinking ? "bg-yellow-400" : "bg-white/20";

  return (
    <>
      {/* Launcher */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-saabai-surface border border-saabai-teal/30 rounded-full pl-3 pr-5 py-2.5 shadow-lg hover:border-saabai-teal/60 transition-all"
          style={{ boxShadow: "0 0 24px rgba(98,197,209,0.15)" }}
        >
          {/* Avatar circle */}
          <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-saabai-teal/30 to-indigo-700/40 border border-saabai-teal/40 flex items-center justify-center text-xs font-bold text-saabai-teal shrink-0 overflow-hidden">
            PS
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-saabai-text leading-none">Talk to Peter</p>
            <p className="text-[10px] text-saabai-text-dim mt-0.5">Got questions? I&apos;m here.</p>
          </div>
        </button>
      )}

      {/* Widget */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 w-72 rounded-2xl overflow-hidden border border-saabai-border bg-saabai-surface flex flex-col"
          style={{ boxShadow: "0 0 60px rgba(98,197,209,0.12), 0 20px 40px rgba(0,0,0,0.4)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-saabai-border">
            <div className="flex items-center gap-2.5">
              <div className="relative w-7 h-7 rounded-full bg-gradient-to-br from-saabai-teal/30 to-indigo-700/40 border border-saabai-teal/40 flex items-center justify-center text-[10px] font-bold text-saabai-teal shrink-0">
                PS
                {isStarted && (
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-saabai-surface ${statusColor} transition-colors`} />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-saabai-text leading-none">Pete</p>
                <p className="text-[10px] text-saabai-text-dim mt-0.5">Founder · Saabai.ai</p>
              </div>
            </div>
            <button onClick={handleClose} className="text-saabai-text-dim hover:text-saabai-text transition-colors p-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Avatar area */}
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-8 bg-gradient-to-b from-saabai-bg to-saabai-surface">

            {/* Pulsing rings + avatar */}
            <div className="relative flex items-center justify-center">
              {/* Outer ring — visible when speaking */}
              <div className={`absolute w-24 h-24 rounded-full border border-saabai-teal/20 transition-all duration-300 ${isSpeaking ? "scale-125 opacity-100 animate-ping" : "scale-100 opacity-0"}`} />
              {/* Mid ring */}
              <div className={`absolute w-20 h-20 rounded-full border border-saabai-teal/30 transition-all duration-300 ${isSpeaking ? "scale-110 opacity-100" : isListening ? "scale-105 opacity-60" : "scale-100 opacity-0"}`} />
              {/* Avatar circle */}
              <div className={`relative w-16 h-16 rounded-full bg-gradient-to-br from-saabai-teal/20 to-indigo-700/30 border-2 flex items-center justify-center font-bold text-xl text-saabai-teal transition-all duration-300 overflow-hidden ${isSpeaking ? "border-saabai-teal shadow-[0_0_20px_rgba(98,197,209,0.4)]" : isListening ? "border-green-400/60" : "border-saabai-teal/30"}`}>
                PS
              </div>
            </div>

            {/* Status */}
            <div className="h-5 flex items-center">
              {statusLabel ? (
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusColor} ${(isSpeaking || isListening || isThinking) ? "animate-pulse" : ""}`} />
                  <span className="text-xs text-saabai-text-dim">{statusLabel}</span>
                </div>
              ) : null}
            </div>

            {/* Start button */}
            {!isStarted && (
              <button
                onClick={handleStart}
                className="px-5 py-2.5 bg-saabai-teal text-saabai-bg rounded-full text-xs font-semibold hover:bg-saabai-teal-bright transition-colors tracking-wide"
                style={{ boxShadow: "0 0 16px rgba(98,197,209,0.3)" }}
              >
                Start conversation
              </button>
            )}

            {error && <p className="text-red-400 text-[10px] text-center px-2">{error}</p>}
          </div>

          {/* Text input */}
          {isStarted && (
            <div className="p-3 border-t border-saabai-border flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Or type a message…"
                className="flex-1 bg-saabai-bg border border-saabai-border rounded-lg px-3 py-2 text-xs text-saabai-text placeholder:text-saabai-text-dim focus:outline-none focus:border-saabai-teal/60 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isThinking}
                className="px-3 py-2 bg-saabai-teal text-saabai-bg rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-saabai-teal-bright transition-colors"
              >
                Send
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
