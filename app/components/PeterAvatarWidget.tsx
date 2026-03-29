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

// ── Improvement #2: Contextual follow-up chips ──────────────────────────────
function getFollowUpChips(response: string): string[] {
  const lower = response.toLowerCase();
  const shuffle = (arr: string[]) => [...arr].sort(() => Math.random() - 0.5);
  if (/\$\d/.test(response)) {
    return shuffle([
      "What about 5 sheets?",
      "Can I pick it up from the Gold Coast?",
      "How long for delivery?",
      "Can you quote a different size?",
      "What's included in the price?",
    ]).slice(0, 3);
  }
  if (/acrylic/.test(lower)) {
    return shuffle([
      "How does acrylic compare to polycarbonate?",
      "What thickness do I need?",
      "Do you cut it to size?",
      "What colours do you stock?",
    ]).slice(0, 3);
  }
  if (/polycarbonate|poly/.test(lower)) {
    return shuffle([
      "What thickness for a roof panel?",
      "Is it UV stabilised?",
      "How does price compare to acrylic?",
    ]).slice(0, 2);
  }
  if (/hdpe|cutting board/.test(lower)) {
    return shuffle([
      "What colours does HDPE come in?",
      "Is it food safe?",
      "What sizes are available?",
    ]).slice(0, 2);
  }
  if (/deliver|shipping|freight/.test(lower)) {
    return shuffle([
      "How long to Brisbane?",
      "Do you deliver to Melbourne?",
      "What's the freight cost?",
    ]).slice(0, 2);
  }
  return shuffle([
    "Can you give me a price?",
    "What materials do you stock?",
    "Do you deliver Australia-wide?",
  ]).slice(0, 2);
}

// ── Improvement #6: Subtle message sound via Web Audio API ──────────────────
function playMessageSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
    setTimeout(() => ctx.close(), 400);
  } catch {}
}

function renderContent(text: string) {
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
        nodes.push(<strong key={`b-${lineKey}-${key++}`} style={{ color: "#FFD700" }}>{match[2]}</strong>);
      } else {
        nodes.push(
          <a key={`a-${lineKey}-${key++}`} href={match[4]} target="_blank" rel="noopener noreferrer"
            className="underline font-bold hover:opacity-80" style={{ color: "#FFD700" }}>
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
const TTL_MS = 24 * 60 * 60 * 1000;

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
  const [pulsing, setPulsing] = useState(false);
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
  // Improvement #2: contextual follow-up chips
  const [followUpChips, setFollowUpChips] = useState<string[]>([]);
  // Improvement #1: inline quote email capture
  const [quoteEmailOpen, setQuoteEmailOpen] = useState(false);
  const [quoteEmail, setQuoteEmail] = useState("");
  const [quoteEmailSent, setQuoteEmailSent] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobUrlRef = useRef<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);
  const isStartedRef = useRef(false);
  const chatModeRef = useRef<ChatMode>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const transcriptSentRef = useRef(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  // Improvement #4: re-engagement
  const lastActivityRef = useRef<number>(Date.now());
  const reEngagementFiredRef = useRef(false);

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
        // Don't re-fire the nudge after restoring a saved conversation
        reEngagementFiredRef.current = true;
      }
    } catch {}
  }, []);

  // Save conversation to localStorage
  useEffect(() => {
    if (displayMessages.length === 0) return;
    try {
      const messagesToSave = displayMessages.filter(m => m.content !== "Still there? Happy to lock that quote in whenever you're ready.");
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        messages: messagesToSave,
        isOpen,
        savedAt: Date.now(),
      }));
    } catch {}
  }, [displayMessages, isOpen]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

  // Notify parent page to resize iframe — send exact dimensions needed
  useEffect(() => {
    try {
      if (isOpen) {
        window.parent.postMessage({ rexWidget: "open" }, "*");
      } else {
        window.parent.postMessage({ rexWidget: "closed" }, "*");
      }
    } catch {}
  }, [isOpen]);

  // Pulse launcher glow every 10s
  useEffect(() => {
    if (isOpen) return;
    const interval = setInterval(() => {
      setPulsing(true);
      setTimeout(() => setPulsing(false), 900);
    }, 10000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Improvement #4: re-engagement nudge after 45s inactivity
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isOpen || !isStarted || isEnded || isThinking || reEngagementFiredRef.current) return;
      if (chatModeRef.current !== "text") return;
      if (Date.now() - lastActivityRef.current > 45000) {
        reEngagementFiredRef.current = true;
        lastActivityRef.current = Date.now(); // prevent re-trigger
        const nudge = "Still there? Happy to lock that quote in whenever you're ready.";
        const nudgeMsg: ChatMessage = { role: "assistant", content: nudge };
        messagesRef.current = [...messagesRef.current, nudgeMsg];
        setDisplayMessages(prev => [...prev, nudgeMsg]);
        playMessageSound();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isOpen, isStarted, isEnded, isThinking]);

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
    // Convert $126 → "126 dollars", $126.50 → "126 dollars 50"
    out = out.replace(/\$(\d+)\.(\d+)/g, (_, dollars, cents) =>
      cents === "00" ? `${dollars} dollars` : `${dollars} dollars ${cents}`
    );
    out = out.replace(/\$(\d+)/g, "$1 dollars");
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
    setFollowUpChips([]);
    setQuoteEmailOpen(false);
    lastActivityRef.current = Date.now();

    const updated: ChatMessage[] = [...messagesRef.current, { role: "user", content: text }];
    messagesRef.current = updated;
    setDisplayMessages(prev => [...prev, { role: "user", content: text }]);
    setIsThinking(true);
    if (!isText) stopListening();

    // Improvement #7: typing delay — feels more human
    await new Promise(r => setTimeout(r, 500 + Math.random() * 300));

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
          setDisplayMessages(prev => {
            const msgs = [...prev];
            msgs[msgs.length - 1] = { role: "assistant", content: cleaned };
            return msgs;
          });
          // Improvement #6: sound on new message
          playMessageSound();
          // Improvement #2: contextual follow-up chips
          setFollowUpChips(getFollowUpChips(cleaned));
          // Reset email capture for new response
          setQuoteEmailSent(false);
          lastActivityRef.current = Date.now();
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
    lastActivityRef.current = Date.now();
    reEngagementFiredRef.current = false;
    messagesRef.current = [{ role: "assistant", content: greeting }];
    await playVoice(greeting);
  }

  function selectTextMode() {
    const greeting = randomGreeting();
    chatModeRef.current = "text";
    setChatMode("text");
    isStartedRef.current = true;
    setIsStarted(true);
    lastActivityRef.current = Date.now();
    reEngagementFiredRef.current = false;
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
    setDisplayMessages([...messagesRef.current]);
  }

  function switchToVoice() {
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
    reEngagementFiredRef.current = false;
    setError(null);
    setInputValue("");
    setDisplayMessages([]);
    setShowQuickReplies(false);
    setQuickReplies([]);
    setFollowUpChips([]);
    setQuoteEmailOpen(false);
    setQuoteEmail("");
    setQuoteEmailSent(false);
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

  // Improvement #1: inline quote email capture
  async function submitQuoteEmail() {
    if (!quoteEmail.trim()) return;
    const lastAssistant = [...messagesRef.current].reverse().find(m => m.role === "assistant");
    try {
      await fetch("/api/rex-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "rex_quote_email",
          email: quoteEmail.trim(),
          note: lastAssistant?.content.slice(0, 300) ?? "Quote request",
          timestamp: new Date().toISOString(),
        }),
      });
    } catch {}
    setQuoteEmailSent(true);
    setQuoteEmailOpen(false);
  }

  async function handleSend() {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue("");
    await handleUserMessage(text);
  }

  const statusLabel = isSpeaking ? "Speaking" : isListening ? "Listening" : isThinking ? "Thinking…" : isStarted ? "Ready" : "";
  const statusColor = isSpeaking ? "bg-saabai-teal" : isListening ? "bg-green-400" : isThinking ? "bg-yellow-400" : "bg-white/20";

  // Determine if inline email capture should show
  const lastMsg = displayMessages[displayMessages.length - 1];
  const showQuoteCapture = !isThinking && lastMsg?.role === "assistant" && /\$\d/.test(lastMsg.content);

  // ── Shared header ───────────────────────────────────────────────────────────
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
          <button onClick={switchToText} title="Switch to text" className="flex items-center gap-1 text-[10px] font-medium text-saabai-text-dim hover:text-saabai-teal transition-colors">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M2 6.5h5M2 10h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            Text
          </button>
        )}
        {isStarted && !isEnded && chatMode === "text" && speechSupported && (
          <button onClick={switchToVoice} title="Switch to voice" className="flex items-center gap-1 text-[10px] font-medium text-saabai-text-dim hover:text-saabai-teal transition-colors">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <rect x="4" y="1" width="4" height="6" rx="2" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M2 6.5A4 4 0 0 0 6 10.5a4 4 0 0 0 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M6 10.5V12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Voice
          </button>
        )}
        {isStarted && !isEnded && (
          <button onClick={handleEndChat} className="text-[10px] font-medium text-saabai-text-dim hover:text-saabai-teal transition-colors tracking-wide">End</button>
        )}
        <button onClick={handleMinimise} className="text-saabai-text-dim hover:text-saabai-text transition-colors p-1 rounded-lg hover:bg-saabai-surface-raised" aria-label="Minimise">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 3l5 6 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button onClick={handleClose} className="text-saabai-text-dim hover:text-saabai-text transition-colors p-1 rounded-lg hover:bg-saabai-surface-raised" aria-label="Close">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      </div>
    </div>
  );

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
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-saabai-surface border border-saabai-teal/30 rounded-full pl-3 pr-5 py-2.5 hover:border-saabai-teal/60 transition-all duration-300 hover:-translate-y-0.5"
          style={{
            boxShadow: pulsing
              ? "0 0 0 5px rgba(37,211,102,0.12), 0 8px 36px rgba(37,211,102,0.45), 0 4px 16px rgba(0,0,0,0.35)"
              : "0 0 28px rgba(37,211,102,0.28), 0 4px 16px rgba(0,0,0,0.3)",
            transform: pulsing ? "scale(1.025) translateY(-1px)" : undefined,
          }}
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

      {/* Improvement #5: slide-up entrance animation */}
      {isOpen && (
        <div
          className="fixed z-50 overflow-hidden border border-saabai-border bg-saabai-surface flex flex-col"
          style={{
            bottom: 0,
            right: 0,
            width: "100%",
            borderRadius: "1rem",
            boxShadow: "0 0 60px rgba(37,211,102,0.12), 0 20px 40px rgba(0,0,0,0.4)",
            animation: "rexSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {Header}

          {/* ── End panel ──────────────────────────────────────────────────── */}
          {isEnded && (
            <div className="overflow-y-auto px-4 py-5 bg-gradient-to-b from-saabai-bg to-saabai-surface">
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
                  <a href="https://www.plasticonline.com.au/shop/" target="_blank" rel="noopener noreferrer"
                    className="block w-full text-center bg-saabai-teal text-saabai-bg px-4 py-2.5 rounded-xl font-semibold text-xs hover:bg-saabai-teal-bright transition-colors tracking-wide">
                    Shop Our Range →
                  </a>
                  {/* Improvement #3: speak to someone */}
                  <div className="flex gap-2">
                    <a href="tel:0755646744" className="flex-1 flex items-center justify-center gap-1.5 border border-saabai-border rounded-lg py-2 text-[11px] text-saabai-text-dim hover:text-saabai-text hover:border-saabai-teal/40 transition-colors">
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 2h2.5l1 2.5-1.5 1a7 7 0 0 0 3 3l1-1.5L10.5 8V10.5A1.5 1.5 0 0 1 9 12 10 10 0 0 1 0 3 1.5 1.5 0 0 1 2 1.5V2z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Call us
                    </a>
                    <a href="https://wa.me/61755646744" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 border border-saabai-border rounded-lg py-2 text-[11px] text-saabai-text-dim hover:text-saabai-text hover:border-saabai-teal/40 transition-colors">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M20.52 3.48A11.93 11.93 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.11.55 4.17 1.6 5.99L0 24l6.18-1.57A11.94 11.94 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.22-3.48-8.52z" fill="currentColor" opacity=".15"/><path d="M17.47 14.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.6-.92-2.19-.24-.57-.49-.5-.67-.5-.17 0-.37-.02-.57-.02s-.52.07-.8.37c-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.09 4.49.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" fill="currentColor"/></svg>
                      WhatsApp
                    </a>
                  </div>
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
                    className="w-full border border-saabai-border rounded-lg px-3 py-2 text-xs placeholder:text-gray-400 focus:outline-none focus:border-saabai-teal/60 transition-colors"
                    style={{ background: "#ffffff", color: "#111" }}
                  />
                  <button onClick={() => submitEndPanel(false)} disabled={!endEmail.trim() || endSubmitting}
                    className="w-full bg-saabai-teal text-saabai-bg px-4 py-2.5 rounded-lg font-semibold text-xs hover:bg-saabai-teal-bright transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    {endSubmitting ? "Sending…" : "Send me the transcript"}
                  </button>
                  {/* Improvement #3: speak to someone */}
                  <div className="flex gap-2 mt-1">
                    <a href="tel:0755646744" className="flex-1 flex items-center justify-center gap-1.5 border border-saabai-border rounded-lg py-2 text-[11px] text-saabai-text-dim hover:text-saabai-text hover:border-saabai-teal/40 transition-colors">
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 2h2.5l1 2.5-1.5 1a7 7 0 0 0 3 3l1-1.5L10.5 8V10.5A1.5 1.5 0 0 1 9 12 10 10 0 0 1 0 3 1.5 1.5 0 0 1 2 1.5V2z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Call (07) 5564 6744
                    </a>
                    <a href="https://wa.me/61755646744" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 border border-saabai-border rounded-lg py-2 text-[11px] text-saabai-text-dim hover:text-saabai-text hover:border-saabai-teal/40 transition-colors">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M20.52 3.48A11.93 11.93 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.11.55 4.17 1.6 5.99L0 24l6.18-1.57A11.94 11.94 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.22-3.48-8.52z" fill="currentColor" opacity=".15"/><path d="M17.47 14.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.6-.92-2.19-.24-.57-.49-.5-.67-.5-.17 0-.37-.02-.57-.02s-.52.07-.8.37c-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.09 4.49.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" fill="currentColor"/></svg>
                      WhatsApp
                    </a>
                  </div>
                  <button onClick={() => submitEndPanel(true)} disabled={endSubmitting}
                    className="text-[11px] text-saabai-text-dim hover:text-saabai-text-muted transition-colors text-center">
                    No thanks
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Mode picker ─────────────────────────────────────────────────── */}
          {!isEnded && !chatMode && (
            <div className="flex flex-col px-4 py-5 bg-gradient-to-b from-saabai-bg to-saabai-surface gap-3">
              <p className="text-[11px] text-saabai-text-dim tracking-wide">How would you like to chat?</p>
              <button onClick={selectTextMode}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all hover:border-saabai-teal/50 hover:bg-saabai-surface-raised"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(37,211,102,0.18)" }}>
                <div className="w-8 h-8 rounded-lg bg-saabai-teal/10 border border-saabai-teal/20 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3h10M2 7h7M2 11h5" stroke="var(--saabai-teal)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-saabai-text leading-none mb-1">Text Chat</p>
                  <p className="text-[10px] text-saabai-text-dim leading-relaxed">Type your questions, get instant answers</p>
                </div>
              </button>
              <button onClick={speechSupported ? selectVoiceMode : undefined} disabled={!speechSupported}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all hover:border-saabai-teal/50 hover:bg-saabai-surface-raised disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(37,211,102,0.18)" }}>
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

          {/* ── Voice mode ──────────────────────────────────────────────────── */}
          {!isEnded && chatMode === "voice" && (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-6 bg-gradient-to-b from-saabai-bg to-saabai-surface">
              <div className="relative flex items-center justify-center">
                <div className={`absolute w-24 h-24 rounded-full border border-saabai-teal/20 transition-all duration-300 ${isSpeaking ? "scale-125 opacity-100 animate-ping" : "scale-100 opacity-0"}`} />
                <div className={`absolute w-20 h-20 rounded-full border border-saabai-teal/30 transition-all duration-300 ${isSpeaking ? "scale-110 opacity-100" : isListening ? "scale-105 opacity-60" : "scale-100 opacity-0"}`} />
                <div className={`relative w-16 h-16 rounded-full border-2 overflow-hidden transition-all duration-300 ${isSpeaking ? "border-saabai-teal shadow-[0_0_20px_rgba(37,211,102,0.4)]" : isListening ? "border-green-400/60" : "border-saabai-teal/30"}`}>
                  <Image src="/shane-goldberg.png" alt="Rex" fill className="object-cover" />
                </div>
              </div>
              <div className="h-5 flex items-center">
                {statusLabel && (
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusColor} ${(isSpeaking || isListening || isThinking) ? "animate-pulse" : ""}`} />
                    <span className="text-xs text-saabai-text-dim">{statusLabel}</span>
                  </div>
                )}
              </div>
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

          {/* ── Text mode ───────────────────────────────────────────────────── */}
          {!isEnded && chatMode === "text" && (
            <div className="flex flex-col" style={{ height: 380 }}>
              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 bg-gradient-to-b from-saabai-bg to-saabai-surface">
                {displayMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="relative w-5 h-5 rounded-full border border-saabai-teal/30 shrink-0 overflow-hidden mr-1.5 mt-1 self-start">
                        <Image src="/shane-goldberg.png" alt="Rex" fill className="object-cover" />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] px-3 py-2 rounded-2xl text-xs leading-relaxed break-words ${
                        msg.role === "user" ? "rounded-br-sm" : "rounded-bl-sm text-white"
                      }`}
                      style={msg.role === "user" ? { background: "#e9e9eb", color: "#000" } : { background: "#0084FF" }}
                    >
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

              {/* Improvement #1: inline quote email capture */}
              {showQuoteCapture && (
                <div className="px-4 py-2 border-t border-saabai-border/50 bg-saabai-surface shrink-0">
                  {quoteEmailSent ? (
                    <p className="text-[11px] text-saabai-teal font-medium">Quote sent! Check your inbox.</p>
                  ) : !quoteEmailOpen ? (
                    <button
                      onClick={() => setQuoteEmailOpen(true)}
                      className="w-full text-left text-[11px] font-semibold py-1.5 px-3 rounded-lg border border-yellow-400/30 bg-yellow-400/8 hover:bg-yellow-400/15 transition-colors"
                      style={{ color: "#FFD700" }}
                    >
                      Send me this quote →
                    </button>
                  ) : (
                    <div className="flex gap-1.5">
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={quoteEmail}
                        onChange={e => setQuoteEmail(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && submitQuoteEmail()}
                        autoFocus
                        className="flex-1 text-[11px] px-2.5 py-1.5 rounded-lg border border-saabai-teal/30 focus:outline-none focus:border-saabai-teal/60"
                        style={{ background: "#f0f0f0", color: "#111" }}
                      />
                      <button
                        onClick={submitQuoteEmail}
                        disabled={!quoteEmail.trim()}
                        className="px-3 py-1.5 bg-saabai-teal text-saabai-bg text-[11px] font-bold rounded-lg disabled:opacity-40 hover:bg-saabai-teal-bright transition-colors"
                      >
                        Send
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Quick reply chips — initial greeting */}
              {showQuickReplies && (
                <div className="flex flex-col gap-1.5 px-3 py-2 border-t border-saabai-border/50 bg-saabai-surface shrink-0">
                  <p className="text-[10px] text-saabai-text-dim px-1 pb-0.5">Not sure where to start?</p>
                  {quickReplies.map((q) => (
                    <button key={q}
                      onClick={() => { trackQuickReply(q); setInputValue(""); handleUserMessage(q); }}
                      className="text-left px-3 py-2 rounded-lg border border-saabai-teal/25 bg-saabai-teal/5 text-xs text-saabai-teal hover:bg-saabai-teal/15 hover:border-saabai-teal/50 transition-all">
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Improvement #2: contextual follow-up chips */}
              {!showQuickReplies && followUpChips.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-3 py-2 border-t border-saabai-border/50 bg-saabai-surface shrink-0">
                  {followUpChips.map((q) => (
                    <button key={q}
                      onClick={() => { setFollowUpChips([]); handleUserMessage(q); }}
                      className="text-left px-2.5 py-1.5 rounded-lg border border-saabai-border/60 bg-saabai-surface-raised text-[11px] text-saabai-text-muted hover:border-saabai-teal/40 hover:text-saabai-text transition-all">
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Text input ──────────────────────────────────────────────────── */}
          {!isEnded && chatMode && (
            <div className="p-3 border-t border-saabai-border flex gap-2 shrink-0">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={chatMode === "voice" ? "Or type a message…" : "Type a message…"}
                className="flex-1 border border-saabai-border rounded-lg px-3 py-2 text-xs text-saabai-text placeholder:text-gray-500 focus:outline-none focus:border-saabai-teal/60 transition-colors"
                style={{ background: "#f0f0f0", color: "#111" }}
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

      {/* Improvement #5: slide-up keyframe */}
      <style>{`
        @keyframes rexSlideUp {
          from { transform: translateY(40px) scale(0.94); opacity: 0; }
          to   { transform: translateY(0)    scale(1);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
