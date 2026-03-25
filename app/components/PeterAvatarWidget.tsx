"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";

// Render text with markdown links → clickable <a> tags
function renderText(text: string) {
  const parts: React.ReactNode[] = [];
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
  let last = 0;
  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer"
        className="text-saabai-teal underline underline-offset-2 hover:text-saabai-teal-bright transition-colors">
        {match[1]}
      </a>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

const PETER_VOICE_ID = "txdmFzaxxwmYbb99FY4D";


type ChatMessage = { role: "user" | "assistant"; content: string };

export default function PeterAvatarWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isEnded, setIsEnded] = useState(false);
  const [endEmail, setEndEmail] = useState("");
  const [endSubmitting, setEndSubmitting] = useState(false);
  const [endSubmitted, setEndSubmitted] = useState(false);

  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobUrlRef = useRef<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);
  const isStartedRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const transcriptSentRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

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
    setDisplayMessages([...updated]);
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
        const withReply = [...updated, { role: "assistant" as const, content: fullText.trim() }];
        messagesRef.current = withReply;
        setDisplayMessages([...withReply]);
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
    const greeting = "Hey — I'm Rex, your AI agent from PlasticOnline. I'm here if you have any questions while you're filling in the form. What are you thinking so far?";
    messagesRef.current = [{ role: "assistant", content: greeting }];
    setDisplayMessages([{ role: "assistant", content: greeting }]);
    await playVoice(greeting);
  }

  function handleMinimise() {
    setIsOpen(false);
  }

  function handleClose() {
    stopAudio();
    stopListening();
    isStartedRef.current = false;
    setIsStarted(false);
    setIsOpen(false);
    setIsEnded(false);
    setEndEmail("");
    setEndSubmitted(false);
    setEndSubmitting(false);
    transcriptSentRef.current = false;
    setError(null);
    setInputValue("");
    setDisplayMessages([]);
    messagesRef.current = [];
  }

  function handleEndChat() {
    stopAudio();
    stopListening();
    isStartedRef.current = false;
    setIsStarted(false);
    setIsEnded(true);
  }

  async function submitEndPanel(skipEmail: boolean) {
    if (transcriptSentRef.current) return;
    transcriptSentRef.current = true;
    setEndSubmitting(true);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "pete_ended",
          email: skipEmail ? undefined : endEmail.trim() || undefined,
          sendTranscript: !skipEmail && !!endEmail.trim(),
          timestamp: new Date().toISOString(),
          conversation: messagesRef.current,
        }),
      });
      setEndSubmitted(true);
    } catch {
      setEndSubmitted(true); // fail silently, don't block UX
    } finally {
      setEndSubmitting(false);
    }
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
          <div className="relative w-9 h-9 rounded-full border border-saabai-teal/40 shrink-0 overflow-hidden">
            <Image src="/shane-goldberg.png" alt="Rex" fill className="object-cover" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-saabai-text leading-none">Talk to Rex</p>
            <p className="text-[10px] text-saabai-text-dim mt-0.5">Got questions? I&apos;m here.</p>
          </div>
        </button>
      )}

      {/* Widget */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl overflow-hidden border border-saabai-border bg-saabai-surface flex flex-col"
          style={{ boxShadow: "0 0 60px rgba(98,197,209,0.12), 0 20px 40px rgba(0,0,0,0.4)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-saabai-border">
            <div className="flex items-center gap-2.5">
              <div className="relative w-7 h-7 rounded-full border border-saabai-teal/40 shrink-0 overflow-hidden">
                <Image src="/shane-goldberg.png" alt="Rex" fill className="object-cover" />
                {isStarted && (
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-saabai-surface ${statusColor} transition-colors`} />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-saabai-text leading-none">Rex</p>
                <p className="text-[10px] text-saabai-text-dim mt-0.5">AI Agent · PlasticOnline</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isStarted && !isEnded && (
                <button
                  onClick={handleEndChat}
                  className="text-[10px] font-medium text-saabai-text-dim hover:text-saabai-teal transition-colors tracking-wide"
                >
                  End chat
                </button>
              )}
              <button onClick={handleMinimise} className="text-saabai-text-dim hover:text-saabai-text transition-colors p-1 rounded-lg hover:bg-saabai-surface-raised" aria-label="Minimise">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 3l5 6 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button onClick={handleClose} className="text-saabai-text-dim hover:text-saabai-text transition-colors p-1 rounded-lg hover:bg-saabai-surface-raised" aria-label="Close">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Avatar area */}
          {isEnded ? (
            /* ── End panel ── */
            <div className="px-4 py-5 bg-gradient-to-b from-saabai-bg to-saabai-surface">
              {endSubmitted ? (
                /* Confirmation */
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-saabai-teal/20 flex items-center justify-center shrink-0">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M1 6l3.5 3.5L11 2" stroke="var(--saabai-teal)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <p className="text-xs text-saabai-text-muted leading-relaxed">
                      {endEmail.trim() ? "Transcript sent — check your inbox." : "Thanks for chatting with Rex."}
                    </p>
                  </div>
                  <div className="h-px bg-saabai-border" />
                  <p className="text-xs text-saabai-text-dim leading-relaxed">Want to explore what we can automate for your business?</p>
                  <a
                    href="https://calendly.com/shanegoldberg/30min"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-saabai-teal text-saabai-bg px-4 py-2.5 rounded-xl font-semibold text-xs hover:bg-saabai-teal-bright transition-colors tracking-wide"
                  >
                    Book a Free Strategy Call →
                  </a>
                  <p className="text-[10px] text-saabai-text-dim text-center">Free · 30 minutes · No obligation</p>
                </div>
              ) : (
                /* Email capture */
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-7 h-7 rounded-full border border-saabai-teal/30 shrink-0 overflow-hidden">
                      <Image src="/shane-goldberg.png" alt="Rex" fill className="object-cover" />
                    </div>
                    <p className="text-xs text-saabai-text-muted leading-relaxed">Want a copy of your chat with Rex emailed to you?</p>
                  </div>
                  <input
                    type="email"
                    placeholder="Your email address"
                    value={endEmail}
                    onChange={(e) => setEndEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && endEmail.trim()) submitEndPanel(false); }}
                    className="w-full bg-saabai-bg border border-saabai-border rounded-lg px-3 py-2 text-xs text-saabai-text placeholder:text-saabai-text-dim focus:outline-none focus:border-saabai-teal/60 transition-colors"
                  />
                  <button
                    onClick={() => submitEndPanel(false)}
                    disabled={!endEmail.trim() || endSubmitting}
                    className="w-full bg-saabai-teal text-saabai-bg px-4 py-2.5 rounded-lg font-semibold text-xs hover:bg-saabai-teal-bright transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {endSubmitting ? "Sending…" : "Send me the transcript"}
                  </button>
                  <button
                    onClick={() => submitEndPanel(true)}
                    disabled={endSubmitting}
                    className="text-[11px] text-saabai-text-dim hover:text-saabai-text-muted transition-colors text-center"
                  >
                    No thanks
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ── Live avatar area ── */
            <div className="flex flex-col bg-gradient-to-b from-saabai-bg to-saabai-surface">

              {/* Compact status bar when active, full avatar when not started */}
              {isStarted ? (
                <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-saabai-border/50">
                  {/* Small pulsing avatar */}
                  <div className="relative flex items-center justify-center shrink-0">
                    <div className={`absolute w-10 h-10 rounded-full border border-saabai-teal/20 transition-all duration-300 ${isSpeaking ? "scale-125 opacity-100 animate-ping" : "opacity-0"}`} />
                    <div className={`relative w-8 h-8 rounded-full border-2 overflow-hidden transition-all duration-300 ${isSpeaking ? "border-saabai-teal shadow-[0_0_12px_rgba(98,197,209,0.4)]" : isListening ? "border-green-400/60" : "border-saabai-teal/30"}`}>
                      <Image src="/shane-goldberg.png" alt="Rex" fill className="object-cover" />
                    </div>
                  </div>
                  {statusLabel ? (
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${statusColor} ${(isSpeaking || isListening || isThinking) ? "animate-pulse" : ""}`} />
                      <span className="text-[11px] text-saabai-text-dim">{statusLabel}</span>
                    </div>
                  ) : <span className="text-[11px] text-saabai-text-dim">Rex</span>}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 px-6 py-8">
                  <div className="relative flex items-center justify-center">
                    <div className={`absolute w-24 h-24 rounded-full border border-saabai-teal/20 transition-all duration-300 ${isSpeaking ? "scale-125 opacity-100 animate-ping" : "scale-100 opacity-0"}`} />
                    <div className={`absolute w-20 h-20 rounded-full border border-saabai-teal/30 transition-all duration-300 ${isSpeaking ? "scale-110 opacity-100" : isListening ? "scale-105 opacity-60" : "scale-100 opacity-0"}`} />
                    <div className={`relative w-16 h-16 rounded-full border-2 overflow-hidden transition-all duration-300 ${isSpeaking ? "border-saabai-teal shadow-[0_0_20px_rgba(98,197,209,0.4)]" : isListening ? "border-green-400/60" : "border-saabai-teal/30"}`}>
                      <Image src="/shane-goldberg.png" alt="Rex" fill className="object-cover" />
                    </div>
                  </div>
                  <button
                    onClick={handleStart}
                    className="px-5 py-2.5 bg-saabai-teal text-saabai-bg rounded-full text-xs font-semibold hover:bg-saabai-teal-bright transition-colors tracking-wide"
                    style={{ boxShadow: "0 0 16px rgba(98,197,209,0.3)" }}
                  >
                    Start conversation
                  </button>
                  {error && <p className="text-red-400 text-[10px] text-center px-2">{error}</p>}
                </div>
              )}

              {/* Message history */}
              {isStarted && displayMessages.length > 0 && (
                <div className="flex flex-col gap-2 px-3 py-3 max-h-52 overflow-y-auto">
                  {displayMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-saabai-teal text-saabai-bg rounded-br-sm"
                          : "bg-saabai-surface-raised text-saabai-text rounded-bl-sm border border-saabai-border/60"
                      }`}>
                        {msg.role === "assistant" ? renderText(msg.content) : msg.content}
                      </div>
                    </div>
                  ))}
                  {isThinking && (
                    <div className="flex justify-start">
                      <div className="bg-saabai-surface-raised border border-saabai-border/60 px-3 py-2 rounded-2xl rounded-bl-sm flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-saabai-text-dim animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-saabai-text-dim animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-saabai-text-dim animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {error && isStarted && <p className="text-red-400 text-[10px] text-center px-4 pb-2">{error}</p>}
            </div>
          )}

          {/* Text input — hidden when ended */}
          {isStarted && !isEnded && (
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
