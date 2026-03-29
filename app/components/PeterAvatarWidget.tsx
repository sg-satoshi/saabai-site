"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";

type ChatMessage = { role: "user" | "assistant"; content: string };
type ChatMode = "text" | "voice" | null;

const QUICK_REPLY_POOL = [
  "How much for acrylic cut to size?",
  "What would 6mm clear acrylic cost me?",
  "Can you quote me on polycarbonate sheet?",
  "Acrylic vs polycarbonate — which do I need?",
  "What's the best plastic for outdoor use?",
  "What's the toughest plastic you stock?",
  "What plastic is food safe for a cutting board?",
  "What do I need for a fish tank?",
  "What's best for signage?",
  "Do you deliver Australia-wide?",
  "How long does delivery take?",
  "Can I pick up from the Gold Coast?",
];

function pickQuickReplies(): string[] {
  const shuffled = [...QUICK_REPLY_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}


function renderContent(text: string) {
  // Split into paragraphs on double newlines, then lines on single newlines
  const paragraphs = text.split(/\n{2,}/);
  const result: React.ReactNode[] = [];

  function processLine(line: string, lineKey: string) {
    const linkRegex = /(\*\*([^*]+)\*\*|\[([^\]]+)\]\(((?:https?|mailto):\/\/[^\)]+)\))/g;
    const nodes: React.ReactNode[] = [];
    let last = 0;
    let match: RegExpExecArray | null;
    let key = 0;
    while ((match = linkRegex.exec(line)) !== null) {
      if (match.index > last) nodes.push(line.slice(last, match.index));
      if (match[0].startsWith("**")) {
        nodes.push(<strong key={`b-${lineKey}-${key++}`}>{match[2]}</strong>);
      } else {
        nodes.push(
          <a key={`a-${lineKey}-${key++}`} href={match[4]} target="_blank" rel="noopener noreferrer"
            className="underline text-saabai-teal hover:opacity-80">
            {match[3]}
          </a>
        );
      }
      last = match.index + match[0].length;
    }
    if (last < line.length) nodes.push(line.slice(last));
    return nodes;
  }

  paragraphs.forEach((para, pIdx) => {
    if (pIdx > 0) result.push(<div key={`gap-${pIdx}`} className="h-2" />);
    const lines = para.split("\n");
    lines.forEach((line, lIdx) => {
      if (lIdx > 0) result.push(<br key={`br-${pIdx}-${lIdx}`} />);
      result.push(...processLine(line, `${pIdx}-${lIdx}`));
    });
  });

  return result;
}

const PETER_VOICE_ID = "txdmFzaxxwmYbb99FY4D";
const STORAGE_KEY = "rex_conversation";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const GREETINGS = [
  "Hey, I'm Rex. PlasticOnline's AI. What are you cutting today?",
  "G'day! Rex here. Materials, pricing, sizing. Ask away.",
  "Rex here. If it's plastic, I know it. What do you need?",
  "Hey! Rex from PlasticOnline. I've got the whole range in my head. What are you working on?",
  "Hi there, Rex here. Think of me as the bloke at the trade counter who actually knows his stuff.",
  "Rex here. Tiny bracket or a full sheet, I can help. What's the job?",
  "G'day! Rex from PlasticOnline. No hold music, no wait times. What do you need?",
  "Hey, Rex here. I can quote, advise and point you straight to the right product. What's the project?",
  "Hi! Rex here, the plastic expert who's always available. What are you building?",
  "G'day! Rex from PlasticOnline. Ask me anything. Seriously, anything plastic-related.",
  "Hey there, Rex here. I know our entire range, every thickness, every colour. What do you need?",
  "Rex here. No hold music, no wait times, just answers. What can I help with?",
  "Hi, Rex from PlasticOnline. I've been trained on every product we stock. Fire away.",
  "G'day! Rex here. I can price up a cut right now if you've got dimensions. What are you after?",
  "Hey, Rex here. Acrylic, HDPE, polycarbonate. You name it, I know it. What's the go?",
  "Rex here. I'm basically a plastics encyclopaedia with a better personality. What do you need?",
  "Hi there, Rex from PlasticOnline. Got a project in mind? Let's get you sorted.",
  "G'day! Rex here. Most questions I can answer in one sentence. Try me.",
  "Hey! Rex from PlasticOnline. I can give you a price before you even finish your coffee. What size?",
  "Rex here. Your shortcut to getting the right plastic at the right price. What are you after?",
  "G'day! Rex from PlasticOnline. Tell me what you're making and I'll tell you exactly what you need.",
  "Hey there, Rex here. If you've got dimensions, I've got a price. What's the material?",
  "Hi, Rex from PlasticOnline. Not big on small talk, but I am big on great prices. What do you need?",
  "Rex here. I know more about plastic than most people know about anything. What's the project?",
  "G'day! Rex from PlasticOnline. I'm here to make sure you order the right thing the first time.",
];

function randomGreeting(): string {
  return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
}

export default function PeterAvatarWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>(null);
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
  const [speechSupported, setSpeechSupported] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobUrlRef = useRef<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);
  const isStartedRef = useRef(false);
  const chatModeRef = useRef<ChatMode>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const transcriptSentRef = useRef(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(!!SR);
  }, []);

  // Restore conversation from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (Date.now() - saved.savedAt > TTL_MS) { localStorage.removeItem(STORAGE_KEY); return; }
      if (saved.messages?.length > 0) {
        messagesRef.current = saved.messages;
        setDisplayMessages(saved.messages);
        chatModeRef.current = "text";
        setChatMode("text");
        isStartedRef.current = true;
        setIsStarted(true);
        if (saved.isOpen) setIsOpen(true);
      }
    } catch {}
  }, []);

  // Save conversation to localStorage on every message change
  useEffect(() => {
    if (displayMessages.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        messages: displayMessages,
        isOpen,
        savedAt: Date.now(),
      }));
    } catch {}
  }, [displayMessages, isOpen]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
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

  function toSpeakable(text: string): string {
    let out = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    out = out.replace(/https?:\/\/\S+/g, "");
    out = out.replace(/www\.\S+/g, "");
    out = out.replace(/(\d+)\s*[x×]\s*(\d+)/gi, "$1 by $2");
    out = out.replace(/(\d+(?:\.\d+)?)\s*mm\b/gi, "$1 millimetres");
    return out.trim();
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
    const isText = chatModeRef.current === "text";

    setShowQuickReplies(false);
    const updated: ChatMessage[] = [...messagesRef.current, { role: "user", content: text }];
    messagesRef.current = updated;
    setDisplayMessages(prev => [...prev, { role: "user", content: text }]);
    setIsThinking(true);
    if (!isText) stopListening();

    try {
      const res = await fetch("/api/pete-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });

      if (!res.ok) throw new Error(`Chat error ${res.status}: ${await res.text()}`);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";
      let streamingStarted = false;

      if (reader) {
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
                // Stream text live in text mode
                if (isText) {
                  if (!streamingStarted) {
                    streamingStarted = true;
                    setIsThinking(false);
                    setDisplayMessages(prev => [...prev, { role: "assistant", content: fullText }]);
                  } else {
                    setDisplayMessages(prev => {
                      const msgs = [...prev];
                      msgs[msgs.length - 1] = { role: "assistant", content: fullText };
                      return msgs;
                    });
                  }
                }
              }
            } catch {}
          }
        }
        if (buffer.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(buffer.slice(6));
            if (parsed.type === "text-delta" && parsed.delta) fullText += parsed.delta;
          } catch {}
        }
      }

      if (fullText.trim()) {
        const cleaned = fullText.trim();
        messagesRef.current = [...updated, { role: "assistant", content: cleaned }];
        if (isText) {
          // Final update to ensure complete text is shown
          setDisplayMessages(prev => {
            const msgs = [...prev];
            msgs[msgs.length - 1] = { role: "assistant", content: cleaned };
            return msgs;
          });
        } else {
          setDisplayMessages(prev => [...prev, { role: "assistant", content: cleaned }]);
          setIsThinking(false);
          await playVoice(toSpeakable(cleaned));
        }
      } else {
        setIsThinking(false);
        if (!isText) startListening();
      }
    } catch (err) {
      setError(String(err).slice(0, 120));
      setIsThinking(false);
    }
  }

  async function selectVoiceMode() {
    // Unlock audio during user gesture
    const audio = new Audio();
    audio.volume = 0;
    audio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAVFYAAFRWAAABAAgAZGF0YQAAAAA=";
    audio.play().catch(() => {});
    audio.volume = 1;
    audioRef.current = audio;

    const greeting = randomGreeting();
    chatModeRef.current = "voice";
    setChatMode("voice");
    isStartedRef.current = true;
    setIsStarted(true);
    messagesRef.current = [{ role: "assistant", content: greeting }];
    await playVoice(greeting);
  }

  function selectTextMode() {
    const greeting = randomGreeting();
    chatModeRef.current = "text";
    setChatMode("text");
    isStartedRef.current = true;
    setIsStarted(true);
    const greetingMsg: ChatMessage = { role: "assistant", content: greeting };
    messagesRef.current = [greetingMsg];
    setDisplayMessages([greetingMsg]);
    setQuickReplies(pickQuickReplies());
    setShowQuickReplies(true);
  }

  function trackQuickReply(question: string) {
    fetch("/api/rex-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "rex_quick_reply",
        note: question,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
  }

  function switchToText() {
    stopAudio();
    stopListening();
    chatModeRef.current = "text";
    setChatMode("text");
    // Populate displayMessages from full history if not already shown
    setDisplayMessages([...messagesRef.current]);
  }

  function switchToVoice() {
    // Unlock audio during this user gesture
    if (!audioRef.current) {
      const audio = new Audio();
      audio.volume = 0;
      audio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAVFYAAFRWAAABAAgAZGF0YQAAAAA=";
      audio.play().catch(() => {});
      audio.volume = 1;
      audioRef.current = audio;
    }
    chatModeRef.current = "voice";
    setChatMode("voice");
    // Start listening right away
    setTimeout(() => {
      if (isStartedRef.current && !recognitionRef.current && !isSpeakingRef.current) {
        startListening();
      }
    }, 300);
  }

  function handleMinimise() {
    setIsOpen(false);
  }

  function handleClose() {
    stopAudio();
    stopListening();
    isStartedRef.current = false;
    chatModeRef.current = null;
    setIsStarted(false);
    setIsOpen(false);
    setChatMode(null);
    setIsEnded(false);
    setEndEmail("");
    setEndSubmitted(false);
    setEndSubmitting(false);
    transcriptSentRef.current = false;
    setError(null);
    setInputValue("");
    setDisplayMessages([]);
    setShowQuickReplies(false);
    setQuickReplies([]);
    messagesRef.current = [];
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
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
      await fetch("/api/rex-leads", {
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
      setEndSubmitted(true);
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

  // ── Shared header ──────────────────────────────────────────────────────────
  const Header = (
    <div className="flex items-center justify-between px-4 py-3 border-b border-saabai-border shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="relative w-7 h-7 rounded-full border border-saabai-teal/40 shrink-0 overflow-hidden">
          <Image src="/shane-goldberg.png" alt="Rex" fill className="object-cover" />
          {isStarted && !isEnded && (
            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-saabai-surface ${statusColor} transition-colors`} />
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-saabai-text leading-none">Rex</p>
          <p className="text-[10px] text-saabai-text-dim mt-0.5">AI Agent · PlasticOnline</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isStarted && !isEnded && chatMode === "voice" && (
          <button
            onClick={switchToText}
            title="Switch to text"
            className="flex items-center gap-1 text-[10px] font-medium text-saabai-text-dim hover:text-saabai-teal transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M2 3h8M2 6.5h5M2 10h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            Text
          </button>
        )}
        {isStarted && !isEnded && chatMode === "text" && speechSupported && (
          <button
            onClick={switchToVoice}
            title="Switch to voice"
            className="flex items-center gap-1 text-[10px] font-medium text-saabai-text-dim hover:text-saabai-teal transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <rect x="4" y="1" width="4" height="6" rx="2" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M2 6.5A4 4 0 0 0 6 10.5a4 4 0 0 0 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M6 10.5V12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Voice
          </button>
        )}
        {isStarted && !isEnded && (
          <button
            onClick={handleEndChat}
            className="text-[10px] font-medium text-saabai-text-dim hover:text-saabai-teal transition-colors tracking-wide"
          >
            End
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
  );


  // PLON brand colour overrides — applied to the widget wrapper so all
  // saabai-* CSS tokens inside automatically render in PlasticOnline colours.
  const plonVars = {
    "--saabai-bg":             "#111111",
    "--saabai-surface":        "#1a1a1a",
    "--saabai-surface-raised": "#222222",
    "--saabai-teal":           "#25D366",
    "--saabai-teal-bright":    "#2EE675",
    "--saabai-border":         "#25D3661a",
    "--saabai-border-accent":  "#25D36640",
    "--saabai-glow":           "#25D36618",
    "--saabai-glow-mid":       "#25D3662e",
    "--saabai-glow-strong":    "#25D3663d",
    "--saabai-text":           "#f0f0f0",
    "--saabai-text-muted":     "#aaaaaa",
    "--saabai-text-dim":       "#888888",
  } as React.CSSProperties;

  return (
    <div style={{ ...plonVars, pointerEvents: "auto" }}>
      {/* Launcher */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-saabai-surface border border-saabai-teal/30 rounded-full pl-3 pr-5 py-2.5 shadow-lg hover:border-saabai-teal/60 transition-all"
          style={{ boxShadow: "0 0 24px rgba(37,211,102,0.15)" }}
        >
          <div className="relative w-9 h-9 shrink-0">
            <span className="absolute inset-0 rounded-full border border-saabai-teal/40 opacity-50" style={{ animation: "ping 2.5s cubic-bezier(0, 0, 0.2, 1) 3" }} />
            <div className="relative w-9 h-9 rounded-full border border-saabai-teal/40 overflow-hidden">
              <Image src="/shane-goldberg.png" alt="Rex" fill className="object-cover" />
            </div>
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-saabai-text leading-none">Talk to Rex</p>
            <p className="text-[10px] text-saabai-text-dim mt-0.5">Get a cut-to-size quote now.</p>
          </div>
        </button>
      )}

      {isOpen && (
        <div
          className="fixed bottom-6 right-3 z-50 rounded-2xl overflow-hidden border border-saabai-border bg-saabai-surface flex flex-col"
          style={{ width: "min(340px, calc(100vw - 24px))", boxShadow: "0 0 60px rgba(37,211,102,0.12), 0 20px 40px rgba(0,0,0,0.4)" }}
        >
          {Header}

          {/* ── End panel ─────────────────────────────────────────────────── */}
          {isEnded && (
            <div className="px-4 py-5 bg-gradient-to-b from-saabai-bg to-saabai-surface">
              {endSubmitted ? (
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
                  <p className="text-xs text-saabai-text-dim leading-relaxed">Ready to place your order? Browse the full range and add to cart.</p>
                  <a
                    href="https://www.plasticonline.com.au/shop/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-saabai-teal text-saabai-bg px-4 py-2.5 rounded-xl font-semibold text-xs hover:bg-saabai-teal-bright transition-colors tracking-wide"
                  >
                    Shop Our Range →
                  </a>
                </div>
              ) : (
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
          )}

          {/* ── Mode picker ────────────────────────────────────────────────── */}
          {!isEnded && !chatMode && (
            <div className="px-4 py-5 bg-gradient-to-b from-saabai-bg to-saabai-surface flex flex-col gap-3">
              <p className="text-[11px] text-saabai-text-dim tracking-wide">How would you like to chat?</p>
              {/* Text option */}
              <button
                onClick={selectTextMode}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all hover:border-saabai-teal/50 hover:bg-saabai-surface-raised"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(37,211,102,0.18)" }}
              >
                <div className="w-8 h-8 rounded-lg bg-saabai-teal/10 border border-saabai-teal/20 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 3h10M2 7h7M2 11h5" stroke="var(--saabai-teal)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-saabai-text leading-none mb-1">Text Chat</p>
                  <p className="text-[10px] text-saabai-text-dim leading-relaxed">Type your questions, get instant answers</p>
                </div>
              </button>
              {/* Voice option */}
              <button
                onClick={speechSupported ? selectVoiceMode : undefined}
                disabled={!speechSupported}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all hover:border-saabai-teal/50 hover:bg-saabai-surface-raised disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(37,211,102,0.18)" }}
              >
                <div className="w-8 h-8 rounded-lg bg-saabai-teal/10 border border-saabai-teal/20 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="5" y="1" width="4" height="7" rx="2" stroke="var(--saabai-teal)" strokeWidth="1.4"/>
                    <path d="M2.5 7.5A4.5 4.5 0 0 0 7 12a4.5 4.5 0 0 0 4.5-4.5" stroke="var(--saabai-teal)" strokeWidth="1.4" strokeLinecap="round"/>
                    <path d="M7 12v1.5" stroke="var(--saabai-teal)" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-saabai-text leading-none mb-1">
                    Voice Chat
                    {!speechSupported && <span className="text-[9px] font-normal text-saabai-text-dim ml-1.5">(not supported)</span>}
                  </p>
                  <p className="text-[10px] text-saabai-text-dim leading-relaxed">Speak naturally with Rex</p>
                </div>
              </button>
            </div>
          )}

          {/* ── Voice mode ─────────────────────────────────────────────────── */}
          {!isEnded && chatMode === "voice" && (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-6 bg-gradient-to-b from-saabai-bg to-saabai-surface">
              {/* Pulsing rings + avatar */}
              <div className="relative flex items-center justify-center">
                <div className={`absolute w-24 h-24 rounded-full border border-saabai-teal/20 transition-all duration-300 ${isSpeaking ? "scale-125 opacity-100 animate-ping" : "scale-100 opacity-0"}`} />
                <div className={`absolute w-20 h-20 rounded-full border border-saabai-teal/30 transition-all duration-300 ${isSpeaking ? "scale-110 opacity-100" : isListening ? "scale-105 opacity-60" : "scale-100 opacity-0"}`} />
                <div className={`relative w-16 h-16 rounded-full border-2 overflow-hidden transition-all duration-300 ${isSpeaking ? "border-saabai-teal shadow-[0_0_20px_rgba(37,211,102,0.4)]" : isListening ? "border-green-400/60" : "border-saabai-teal/30"}`}>
                  <Image src="/shane-goldberg.png" alt="Rex" fill className="object-cover" />
                </div>
              </div>
              {/* Status */}
              <div className="h-5 flex items-center">
                {statusLabel && (
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusColor} ${(isSpeaking || isListening || isThinking) ? "animate-pulse" : ""}`} />
                    <span className="text-xs text-saabai-text-dim">{statusLabel}</span>
                  </div>
                )}
              </div>
              {/* Actionable info card — only shown in voice mode when last reply has a price or link */}
              {(() => {
                const lastAssistant = [...displayMessages].reverse().find(m => m.role === "assistant");
                const isActionable = lastAssistant && /AUD|\$|\[/.test(lastAssistant.content);
                if (!isActionable) return null;
                return (
                  <div className="w-full px-1">
                    <div className="bg-saabai-surface-raised border border-saabai-teal/30 rounded-xl px-3 py-2.5 text-xs leading-relaxed break-words text-saabai-text">
                      {renderContent(lastAssistant.content)}
                    </div>
                  </div>
                );
              })()}
              {error && <p className="text-red-400 text-[10px] text-center px-2">{error}</p>}
            </div>
          )}

          {/* ── Text mode ──────────────────────────────────────────────────── */}
          {!isEnded && chatMode === "text" && (
            <div className="flex flex-col" style={{ height: 380 }}>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 bg-gradient-to-b from-saabai-bg to-saabai-surface">
                {displayMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="relative w-5 h-5 rounded-full border border-saabai-teal/30 shrink-0 overflow-hidden mr-1.5 mt-1 self-start">
                        <Image src="/shane-goldberg.png" alt="Rex" fill className="object-cover" />
                      </div>
                    )}
                    <div className={`max-w-[82%] px-3 py-2 rounded-2xl text-xs leading-relaxed break-words ${
                      msg.role === "user"
                        ? "bg-saabai-teal text-saabai-bg rounded-br-sm"
                        : "bg-saabai-surface-raised text-saabai-text rounded-bl-sm border border-saabai-border/60"
                    }`}>
                      {renderContent(msg.content)}
                    </div>
                  </div>
                ))}
                {isThinking && (
                  <div className="flex justify-start">
                    <div className="relative w-5 h-5 rounded-full border border-saabai-teal/30 shrink-0 overflow-hidden mr-1.5 mt-1 self-start">
                      <Image src="/shane-goldberg.png" alt="Rex" fill className="object-cover" />
                    </div>
                    <div className="bg-saabai-surface-raised border border-saabai-border/60 px-3 py-2.5 rounded-2xl rounded-bl-sm flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-saabai-text-dim animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-saabai-text-dim animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-saabai-text-dim animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>
              {/* Quick reply chips — shown after greeting, hidden once user sends */}
              {showQuickReplies && (
                <div className="flex flex-col gap-1.5 px-3 py-2 border-t border-saabai-border/50 bg-saabai-surface shrink-0">
                  <p className="text-[10px] text-saabai-text-dim px-1 pb-0.5">Not sure where to start?</p>
                  {quickReplies.map((q) => (
                    <button
                      key={q}
                      onClick={() => { trackQuickReply(q); setInputValue(""); handleUserMessage(q); }}
                      className="text-left px-3 py-2 rounded-lg border border-saabai-teal/25 bg-saabai-teal/5 text-xs text-saabai-teal hover:bg-saabai-teal/15 hover:border-saabai-teal/50 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Text input (voice + text modes) ───────────────────────────── */}
          {!isEnded && chatMode && (
            <div className="p-3 border-t border-saabai-border flex gap-2 shrink-0">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={chatMode === "voice" ? "Or type a message…" : "Type a message…"}
                className="flex-1 bg-saabai-bg border border-saabai-border rounded-lg px-3 py-2 text-xs text-saabai-text placeholder:text-saabai-text-dim focus:outline-none focus:border-saabai-teal/60 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isThinking}
                className="w-8 h-8 flex items-center justify-center bg-saabai-teal text-saabai-bg rounded-lg disabled:opacity-40 hover:bg-saabai-teal-bright transition-colors shrink-0"
                aria-label="Send"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
