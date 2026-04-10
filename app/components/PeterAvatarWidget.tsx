"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { track } from "../../lib/analytics";

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
  "What's my order status?",
];

function pickQuickRepliesFrom(pool: string[]): string[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
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

// ── MSN Messenger-style incoming message chime via Web Audio API ─────────────
function playMessageSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    function playNote(freq: number, startTime: number, duration: number, volume: number) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.008); // fast attack
      gain.gain.setValueAtTime(volume, startTime + duration * 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    }

    // MSN Messenger type1.wav: two ascending notes, quick and soft
    playNote(659, ctx.currentTime,        0.12, 0.09); // E5 — first chime
    playNote(880, ctx.currentTime + 0.11, 0.18, 0.07); // A5 — second chime (slightly quieter, longer)

    setTimeout(() => ctx.close(), 600);
  } catch {}
}

function renderContent(text: string) {
  // Fix missing space after sentence-ending punctuation before a capital letter
  // e.g. "right now.Our" → "right now. Our"
  // e.g. "hi there!How" → "hi there! How"
  // e.g. "that?Why" → "that? Why"
  // (avoids touching decimals like $88.89)
  text = text.replace(/([a-z\)])([.!?]) ?([A-Z])/g, "$1$2 $3");
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

const WELCOME_BACK = [
  "Welcome back! Still working on that project?",
  "Hey, welcome back! Want to pick up where we left off?",
  "Good to see you again. Ready to get that order sorted?",
];
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

export default function PeterAvatarWidget({ clientId, quickReplies: quickRepliesPool }: { clientId?: string; quickReplies?: string[] }) {
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
  const [isMobile, setIsMobile] = useState(false);
  const [endEmail, setEndEmail] = useState("");
  const [endSubmitting, setEndSubmitting] = useState(false);
  const [endSubmitted, setEndSubmitted] = useState(false);
  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>([]);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  // Track if user has sent first message (hide chips once conversation starts)
  const [hasUserResponded, setHasUserResponded] = useState(false);
  // Improvement #2: contextual follow-up chips
  const [followUpChips, setFollowUpChips] = useState<string[]>([]);
  // Improvement #1: inline quote email capture
  const [quoteEmailOpen, setQuoteEmailOpen] = useState(false);
  // Keep ref in sync so the re-engagement interval can read current value without stale closure
  useEffect(() => { quoteEmailOpenRef.current = quoteEmailOpen; }, [quoteEmailOpen]);
  const [quoteEmail, setQuoteEmail] = useState("");
  const [quoteMobile, setQuoteMobile] = useState("");
  const [quoteDesspatch, setQuoteDesspatch] = useState<"pickup" | "delivery" | null>(null);
  const [quoteName, setQuoteName] = useState("");
  const [quoteCompany, setQuoteCompany] = useState("");
  const [quoteAddress, setQuoteAddress] = useState("");
  const [quoteEmailSent, setQuoteEmailSent] = useState(false);
  const [quoteEmailSending, setQuoteEmailSending] = useState(false);
  const [endName, setEndName] = useState("");
  // Improvement: welcome back state
  const [isReturning, setIsReturning] = useState(false);
  // Improvement #5: contextual thinking label
  const [thinkingLabel, setThinkingLabel] = useState("Thinking…");
  // Improvement #7: scroll-to-bottom button
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobUrlRef = useRef<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);
  const isStartedRef = useRef(false);
  const chatModeRef = useRef<ChatMode>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const transcriptSentRef = useRef(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  // Improvement #4: re-engagement
  const lastActivityRef = useRef<number>(Date.now());
  const reEngagementFiredRef = useRef(false);
  const quoteEmailOpenRef = useRef(false);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(!!SR);
  }, []);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Mobile: add viewport meta tag if not present (for safe areas, no zoom, etc)
  useEffect(() => {
    if (typeof window === "undefined") return;
    let meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta") as HTMLMetaElement;
      meta.name = "viewport";
      meta.content = "width=device-width, initial-scale=1, viewport-fit=cover, minimum-scale=1, maximum-scale=1, user-scalable=no";
      document.head.appendChild(meta);
    } else if (!meta.getAttribute("content")?.includes("viewport-fit")) {
      // Update existing viewport meta to include viewport-fit
      const current = meta.getAttribute("content");
      if (current) {
        meta.setAttribute("content", current + ", viewport-fit=cover");
      }
    }
  }, []);

  // Restore conversation from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (Date.now() - saved.savedAt > TTL_MS) { localStorage.removeItem(STORAGE_KEY); return; }
      const awayMs = Date.now() - saved.savedAt;
      if (saved.messages?.length > 0) {
        const restored = saved.messages;
        const showWelcome = awayMs > 5 * 60 * 1000; // only after 5 min away
        const restoredWithWelcome = showWelcome
          ? [...restored, { role: "assistant", content: WELCOME_BACK[Math.floor(Math.random() * WELCOME_BACK.length)] } as ChatMessage]
          : restored;
        messagesRef.current = restoredWithWelcome;
        setDisplayMessages(restoredWithWelcome);
        setIsReturning(true);
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
    // Always scroll to bottom on new messages — same behaviour as every chat app
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

  // Strip formatting when copying from the chat — pastes as plain text into emails
  // Depends on isOpen so the listener attaches after the chat window renders
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const plainText = selection.toString();
      if (!plainText) return;
      e.preventDefault();
      e.clipboardData?.setData("text/plain", plainText);
      e.clipboardData?.setData("text/html", plainText); // force HTML-aware apps to receive plain text too
    };
    el.addEventListener("copy", handleCopy);
    return () => el.removeEventListener("copy", handleCopy);
  }, [isOpen]);

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
      if (quoteEmailOpenRef.current) return; // never interrupt while quote form is open
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
        // No speech captured — restart and keep waiting
        if (isStartedRef.current && !isSpeakingRef.current && chatModeRef.current === "voice") {
          setTimeout(() => {
            if (isStartedRef.current && !recognitionRef.current && !isSpeakingRef.current) {
              startListening();
            }
          }, 400);
        }
        return current;
      });
    };

    // onerror always fires before onend — onend handles restarts, so only surface fatal errors here
    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Mic blocked. Allow microphone in browser settings. On Mac, also check System Settings → Privacy → Microphone.");
      }
    };

    try {
      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      recognitionRef.current = null;
      const msg = String(e?.message ?? e).toLowerCase();
      if (msg.includes("not-allowed") || msg.includes("permission") || msg.includes("denied")) {
        setError("Mic blocked — allow microphone access and try again.");
      } else if (isStartedRef.current && chatModeRef.current === "voice") {
        setTimeout(() => {
          if (isStartedRef.current && !recognitionRef.current && !isSpeakingRef.current) {
            startListening();
          }
        }, 600);
      }
    }
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

      // Set onended BEFORE play() — prevents race condition where short audio ends before handler is registered
      audio.onended = () => {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        if (audioBlobUrlRef.current === url) audioBlobUrlRef.current = null;
        if (isStartedRef.current && chatModeRef.current === "voice") {
          // 800ms delay — gives audio system time to release mic after playback
          setTimeout(() => {
            if (isStartedRef.current && !recognitionRef.current && !isSpeakingRef.current) {
              startListening();
            }
          }, 800);
        }
      };

      isSpeakingRef.current = true;
      setIsSpeaking(true);
      await audio.play();
    } catch (err) {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      setError(String(err).slice(0, 100));
      // Resume voice loop if TTS fails mid-conversation
      setTimeout(() => {
        if (isStartedRef.current && !recognitionRef.current && !isSpeakingRef.current) startListening();
      }, 500);
    }
  }

  async function handleUserMessage(text: string) {
    if (!text.trim()) return;
    const isText = chatModeRef.current === "text";

    // Hide chips and email capture when user messages
    setShowQuickReplies(false);
    setFollowUpChips([]);
    setQuoteEmailOpen(false);
    lastActivityRef.current = Date.now();

    // Set flag on first user message — chips stay hidden for entire conversation
    if (messagesRef.current.length === 0) {
      setHasUserResponded(true);
      track("first_message_sent");
    }
    const updated: ChatMessage[] = [...messagesRef.current, { role: "user", content: text }];
    messagesRef.current = updated;
    setDisplayMessages(prev => [...prev, { role: "user", content: text }]);

    // Improvement #5: contextual thinking label
    const lower = text.toLowerCase();
    if (/\$|\d+\s*[x×]\s*\d+|price|cost|quote|how much|cheap|expensive/.test(lower)) {
      setThinkingLabel("Calculating your price…");
    } else if (/stock|do you have|range|available|colour|color|thick/.test(lower)) {
      setThinkingLabel("Checking our range…");
    } else if (/deliver|ship|freight|postage|how long/.test(lower)) {
      setThinkingLabel("Checking delivery…");
    } else {
      setThinkingLabel("Thinking…");
    }

    setIsThinking(true);
    if (!isText) stopListening();

    // Improvement #7: typing delay — feels more human
    await new Promise(r => setTimeout(r, 500 + Math.random() * 300));

    try {
      const res = await fetch("/api/pete-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, clientId }),
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
        if (/\$\d/.test(cleaned)) track("price_shown");
        messagesRef.current = [...updated, { role: "assistant", content: cleaned }];
        if (isText) {
          setDisplayMessages(prev => {
            const msgs = [...prev];
            msgs[msgs.length - 1] = { role: "assistant", content: cleaned };
            return msgs;
          });
          // Improvement #6: sound on new message
          playMessageSound();
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
      // Resume voice loop after any error — without this the conversation permanently dies
      if (!isText) setTimeout(() => {
        if (isStartedRef.current && !recognitionRef.current && !isSpeakingRef.current) startListening();
      }, 1500);
    }
  }

  async function selectVoiceMode() {
    // Explicitly request mic via getUserMedia first — more reliable than relying on
    // SpeechRecognition's own permission flow, which behaves inconsistently across browsers
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop()); // permission confirmed — release stream immediately
    } catch {
      setError("Microphone blocked. Allow mic access in your browser, then try again. On Mac, also check System Settings → Privacy → Microphone.");
      return;
    }

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
    setQuickReplies(pickQuickRepliesFrom(quickRepliesPool && quickRepliesPool.length > 0 ? quickRepliesPool : QUICK_REPLY_POOL));
    setShowQuickReplies(true);
  }

  function trackQuickReply(question: string) {
    fetch("/api/rex-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
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
    setHasUserResponded(false);  // Reset chip visibility flag for next conversation
    setQuoteEmailOpen(false);
    setQuoteEmail("");
    setQuoteMobile("");
    setQuoteDesspatch(null);
    setQuoteName("");
    setQuoteCompany("");
    setQuoteAddress("");
    setEndName("");
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
    track("conversation_ended", { messageCount: messagesRef.current.length });
  }

  function handleNewChat() {
    stopAudio();
    stopListening();
    isStartedRef.current = false;
    chatModeRef.current = null;
    reEngagementFiredRef.current = false;
    transcriptSentRef.current = false;
    setIsStarted(false);
    setIsEnded(false);
    setChatMode(null);
    setDisplayMessages([]);
    setInputValue("");
    setQuoteEmail("");
    setQuoteMobile("");
    setQuoteDesspatch(null);
    setQuoteName("");
    setQuoteCompany("");
    setQuoteAddress("");
    setQuoteEmailOpen(false);
    setQuoteEmailSent(false);
    setEndEmail("");
    setEndName("");
    setEndSubmitted(false);
    setEndSubmitting(false);
    setShowQuickReplies(false);
    setFollowUpChips([]);
    setError(null);
    messagesRef.current = [];
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    track("new_chat_started");
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
          clientId,
          source: "pete_ended",
          name: endName.trim() || undefined,
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

  // Extract contact details Rex already gathered from the conversation
  function extractConversationData() {
    const msgs = messagesRef.current;
    const userMsgs = msgs.filter(m => m.role === "user").map(m => m.content);
    const assistantMsgs = msgs.filter(m => m.role === "assistant").map(m => m.content);
    const allText = msgs.map(m => m.content).join(" ");

    // Email — scan user messages first, fall back to all messages
    let email = "";
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
    for (let i = userMsgs.length - 1; i >= 0; i--) {
      const m = userMsgs[i].match(emailPattern);
      if (m) { email = m[0]; break; }
    }
    if (!email) {
      const m = allText.match(emailPattern);
      if (m) email = m[0];
    }

    // Phone — Australian mobile/landline patterns from user messages
    let phone = "";
    const phonePattern = /(?:(?:\+?61|0)[ -]?)?(?:4\d{2}[ -]?\d{3}[ -]?\d{3}|\d{2}[ -]?\d{4}[ -]?\d{4})/;
    for (const msg of userMsgs) {
      const m = msg.replace(/[^\d+ -]/g, " ").match(phonePattern);
      if (m) { phone = m[0].replace(/\s+/g, " ").trim(); break; }
    }

    // Name — Rex will address customer by name in assistant messages ("Hi Sarah," "Thanks John")
    let name = "";
    const nameInAssistant = /(?:^|[\s,!])(?:Hi|Hey|Thanks|Thank you|Sure|Great|No worries)[,!]?\s+([A-Z][a-z]{1,20})(?:[,!.\s]|$)/m;
    for (let i = assistantMsgs.length - 1; i >= 0; i--) {
      const m = assistantMsgs[i].match(nameInAssistant);
      if (m?.[1]) { name = m[1]; break; }
    }
    // Fall back: user said "my name is X" or "I'm X"
    if (!name) {
      for (const msg of userMsgs) {
        const m = msg.match(/(?:my name(?:'s| is)\s+|I(?:'m| am)\s+)([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20})?)/);
        if (m?.[1]) { name = m[1]; break; }
      }
    }

    // Company — user said "from X", "at X", "for X company/plastics/group/solutions"
    let company = "";
    const companyPatterns = [
      /(?:from|at|for|with|represent(?:ing)?)\s+([A-Z][A-Za-z0-9 &'.,-]{1,50}?)(?:\s+(?:company|pty|ltd|limited|group|co\.|corp|solutions|plastics|industries|manufacturing))?(?:[,.\s]|$)/m,
      /(?:company(?:'s| is| name is)?|business(?:'s| is| name is)?|organisation(?:'s| is)?)\s+(?:called\s+)?([A-Z][A-Za-z0-9 &'.,-]{1,50})(?:[,.\s]|$)/im,
    ];
    for (const msg of userMsgs) {
      for (const pattern of companyPatterns) {
        const m = msg.match(pattern);
        if (m?.[1] && m[1].length > 2) { company = m[1].trim(); break; }
      }
      if (company) break;
    }

    return { email, phone, name, company };
  }

  // Improvement #1: inline quote email capture
  async function submitQuoteEmail() {
    if (!quoteEmail.trim() || quoteEmailSending) return;
    setQuoteEmailSending(true);
    const lastAssistant = [...messagesRef.current].reverse().find(m => m.role === "assistant");
    try {
      await fetch("/api/rex-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          source: "rex_quote_email",
          name: quoteName.trim() || undefined,
          email: quoteEmail.trim(),
          mobile: quoteMobile.trim() || undefined,
          company: quoteCompany.trim() || undefined,
          address: quoteAddress.trim() || undefined,
          despatch: quoteDesspatch ?? undefined,
          note: lastAssistant?.content ?? "Quote request",
          messages: messagesRef.current,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch {}
    setQuoteEmailSending(false);
    setQuoteEmailSent(true);
    setQuoteEmailOpen(false);
    track("lead_captured", { source: "rex_quote_email" });
  }

  async function handleSend() {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue("");
    await handleUserMessage(text);
  }

  const statusLabel = isSpeaking ? "Speaking" : isListening ? "Listening" : isThinking ? "Thinking…" : isStarted ? "Ready" : "";
  const statusColor = isSpeaking ? "bg-saabai-teal" : isListening ? "bg-green-400" : isThinking ? "bg-yellow-400" : (isStarted && chatMode === "voice") ? "bg-blue-300" : "bg-white/20";

  // Determine if inline email capture should show
  const lastMsg = displayMessages[displayMessages.length - 1];
  const showQuoteCapture = !isThinking && lastMsg?.role === "assistant" && /\$\d/.test(lastMsg.content);

  // ── Shared header ───────────────────────────────────────────────────────────
  const Header = (
    <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: "#e8f1ff", borderBottom: "1px solid #c8dcff" }}>
      <div className="flex items-center gap-2.5">
        <div className="relative w-8 h-8 rounded-full shrink-0 overflow-hidden border-2 border-saabai-teal/20">
          <Image src="/shane-goldberg.png" alt="Rex" fill className="object-cover" />
          {isStarted && !isEnded && (
            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${statusColor} transition-colors`} />
          )}
        </div>
        <div>
          <p className="text-xs font-bold leading-none" style={{ color: "#0084FF" }}>Rex</p>
          <p className="text-[10px] mt-0.5" style={{ color: "#65676b" }}>AI Agent · PlasticOnline</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {isStarted && !isEnded && chatMode === "voice" && (
          <button onClick={switchToText} title="Switch to text" className="flex items-center gap-1 text-[10px] font-medium transition-colors px-2 py-1 rounded-md hover:bg-saabai-teal/10" style={{ color: "#0084FF" }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M2 6.5h5M2 10h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            Text
          </button>
        )}
        {isStarted && !isEnded && chatMode === "text" && speechSupported && (
          <button onClick={switchToVoice} title="Switch to voice" className="flex items-center gap-1 text-[10px] font-medium transition-colors px-2 py-1 rounded-md hover:bg-saabai-teal/10" style={{ color: "#0084FF" }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <rect x="4" y="1" width="4" height="6" rx="2" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M2 6.5A4 4 0 0 0 6 10.5a4 4 0 0 0 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M6 10.5V12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Voice
          </button>
        )}
        {isStarted && !isEnded && (
          <button onClick={handleEndChat} className="text-[10px] font-medium transition-colors px-2 py-1 rounded-md hover:bg-saabai-teal/10 tracking-wide" style={{ color: "#0084FF" }}>End</button>
        )}
        {/* Mobile: minimize button only */}
        {isMobile && (
          <button onClick={handleMinimise} className="transition-colors p-1.5 rounded-lg hover:bg-saabai-teal/10" style={{ color: "#65676b" }} aria-label="Minimise">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 3l5 6 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}
        {/* Desktop: close button only */}
        {!isMobile && (
          <button onClick={handleClose} className="transition-colors p-1.5 rounded-lg hover:bg-saabai-teal/10" style={{ color: "#65676b" }} aria-label="Close">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        )}
      </div>
    </div>
  );

  const plonVars = {
    "--saabai-bg":             "#ffffff",
    "--saabai-surface":        "#ffffff",
    "--saabai-surface-raised": "#f0f2f5",
    "--saabai-teal":           "#0084FF",
    "--saabai-teal-bright":    "#0095FF",
    "--saabai-border":         "#e4e6eb",
    "--saabai-border-accent":  "#0084FF40",
    "--saabai-glow":           "#0084FF10",
    "--saabai-glow-mid":       "#0084FF20",
    "--saabai-glow-strong":    "#0084FF30",
    "--saabai-text":           "#050505",
    "--saabai-text-muted":     "#444950",
    "--saabai-text-dim":       "#65676b",
  } as React.CSSProperties;

  return (
    <div style={{ ...plonVars, pointerEvents: "auto" }}>
      {/* Launcher */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); track("widget_opened"); }}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-full pl-3 pr-5 py-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110"
          style={{
            background: "#0084FF",
            boxShadow: pulsing
              ? "0 0 0 4px rgba(0,132,255,0.2)"
              : "none",
            transform: pulsing ? "scale(1.025) translateY(-1px)" : undefined,
          }}
        >
          <div className="relative w-9 h-9 shrink-0">
            <div className="relative w-9 h-9 rounded-full border-2 border-white/30 overflow-hidden">
              <Image src="/shane-goldberg.png" alt="Rex" fill className="object-cover" />
            </div>
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-white leading-none">Talk to Rex</p>
            <p className="text-[10px] text-white/75 mt-0.5">Cut-to-size quote in seconds.</p>
          </div>
        </button>
      )}

      {/* Improvement #5: slide-up entrance animation */}
      {isOpen && (
        <div
          className="fixed z-50 overflow-hidden border border-saabai-border bg-saabai-surface flex flex-col"
          style={{
            ...(isMobile ? {
              // Full-screen on mobile — covers entire viewport including notch/status bar
              top: 0,
              left: 0,
              width: "100vw",
              height: "100dvh", // Dynamic viewport height (accounts for mobile browser UI)
              borderRadius: 0,
              border: "none",
              paddingTop: "max(0px, env(safe-area-inset-top))", // Notch/status bar safety
              paddingBottom: 0, // Input handles its own safe-area-inset-bottom
              maxWidth: "none",
            } : {
              // Bottom-right widget on desktop
              bottom: 0,
              right: 0,
              width: "100%",
              borderRadius: "1rem",
            }),
            boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
            animation: isMobile ? "none" : "rexSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {Header}

          {/* ── End panel ──────────────────────────────────────────────────── */}
          {isEnded && (
            <div className="overflow-y-auto px-4 py-5 bg-saabai-bg">
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
                  <button
                    onClick={handleNewChat}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors"
                    style={{ background: "#f0f2f5", color: "#0084FF", border: "1px solid #c8dcff" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M10 6A4 4 0 1 1 6 2M10 2v3H7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Start a new chat
                  </button>
                  <a href="https://www.plasticonline.com.au/shop/" target="_blank" rel="noopener noreferrer"
                    className="block w-full text-center bg-saabai-teal text-white px-4 py-2.5 rounded-xl font-semibold text-xs hover:bg-saabai-teal-bright transition-colors tracking-wide">
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
                    type="text"
                    placeholder="Your name (optional)"
                    value={endName}
                    onChange={(e) => setEndName(e.target.value)}
                    className="w-full border border-saabai-border rounded-lg px-3 py-2 text-xs placeholder:text-gray-400 focus:outline-none focus:border-saabai-teal/60 transition-colors"
                    style={{ background: "#ffffff", color: "#111" }}
                  />
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
                    className="w-full bg-saabai-teal text-white px-4 py-2.5 rounded-lg font-semibold text-xs hover:bg-saabai-teal-bright transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
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
                  <div className="flex gap-2">
                    <button onClick={() => submitEndPanel(true)} disabled={endSubmitting}
                      className="flex-1 text-[11px] text-saabai-text-dim hover:text-saabai-text-muted transition-colors text-center">
                      No thanks
                    </button>
                    <button onClick={handleNewChat} disabled={endSubmitting}
                      className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium transition-colors"
                      style={{ color: "#0084FF" }}>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M10 6A4 4 0 1 1 6 2M10 2v3H7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      New chat
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Mode picker ─────────────────────────────────────────────────── */}
          {!isEnded && !chatMode && (
            <div className="flex flex-col px-4 py-5 bg-saabai-bg gap-3">
              <p className="text-[11px] text-saabai-text-dim tracking-wide">How would you like to chat?</p>
              <button onClick={selectTextMode}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all hover:border-saabai-teal/50 hover:bg-saabai-surface-raised"
                style={{ background: "#f0f2f5", border: "1px solid #e4e6eb" }}>
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
                style={{ background: "#f0f2f5", border: "1px solid #e4e6eb" }}>
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
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-6 bg-saabai-bg">
              <div className="relative flex items-center justify-center">
                <div className={`absolute w-24 h-24 rounded-full border border-saabai-teal/20 transition-all duration-300 ${isSpeaking ? "scale-125 opacity-100 animate-ping" : "scale-100 opacity-0"}`} />
                <div className={`absolute w-20 h-20 rounded-full border border-saabai-teal/30 transition-all duration-300 ${isSpeaking ? "scale-110 opacity-100" : isListening ? "scale-105 opacity-60" : "scale-100 opacity-0"}`} />
                <div className={`relative w-16 h-16 rounded-full border-2 overflow-hidden transition-all duration-300 ${isSpeaking ? "border-saabai-teal shadow-[0_0_20px_rgba(0,132,255,0.35)]" : isListening ? "border-saabai-teal/60" : "border-saabai-border"}`}>
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
            <div 
              className="flex flex-col relative flex-1 overflow-hidden"
              style={isMobile ? {
                height: "calc(100dvh - env(safe-area-inset-top) - 60px - 64px)" // Full height minus header and input
              } : { 
                height: 380 
              }}
            >
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 bg-saabai-bg"
                onScroll={() => {
                  const el = messagesContainerRef.current;
                  if (!el) return;
                  setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 80);
                }}
              >
                {displayMessages.map((msg, i) => {
                  const isLastInGroup = displayMessages[i + 1]?.role !== "assistant";
                  return (
                    <div key={i} className={`rex-msg flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "assistant" && isLastInGroup && (
                        <div className="relative w-5 h-5 rounded-full border border-saabai-teal/30 shrink-0 overflow-hidden mr-1.5 mt-1 self-start">
                          <Image src="/shane-goldberg.png" alt="Rex" fill className="object-cover" />
                        </div>
                      )}
                      {msg.role === "assistant" && !isLastInGroup && (
                        <div className="w-5 h-5 mr-1.5 shrink-0" />
                      )}
                      <div
                        className={`max-w-[82%] px-3 py-2 rounded-2xl text-[15px] leading-relaxed break-words ${
                          msg.role === "user" ? "rounded-br-sm" : "rounded-bl-sm text-white"
                        }`}
                        style={msg.role === "user" ? { background: "#e9e9eb", color: "#000" } : { background: "#0084FF" }}
                      >
                        {renderContent(msg.content)}
                      </div>
                    </div>
                  );
                })}
                {isThinking && (
                  <div className="flex justify-start">
                    <div className="relative w-5 h-5 rounded-full border border-saabai-teal/30 shrink-0 overflow-hidden mr-1.5 mt-1 self-start">
                      <Image src="/shane-goldberg.png" alt="Rex" fill className="object-cover" />
                    </div>
                    <div className="bg-saabai-surface-raised border border-saabai-border px-3 py-2 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-saabai-text-dim animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-saabai-text-dim animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-saabai-text-dim animate-bounce" style={{ animationDelay: "300ms" }} />
                      <span className="text-[10px] ml-1" style={{ color: "#65676b" }}>{thinkingLabel}</span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Improvement #7: scroll-to-bottom button */}
              {showScrollBtn && (
                <button
                  onClick={() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })}
                  className="absolute right-3 flex items-center justify-center w-7 h-7 rounded-full shadow-md transition-all hover:brightness-110 active:scale-95"
                  style={{ bottom: "120px", background: "#0084FF", color: "#fff", zIndex: 10 }}
                  aria-label="Scroll to bottom"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              )}

              {/* Quote capture — premium slide-up overlay */}
              {showQuoteCapture && (() => {
                const lastAssistantMsg = displayMessages.filter(m => m.role === "assistant").slice(-1)[0];
                const priceMatch = lastAssistantMsg?.content.match(/\[(\$[\d,]+\.?\d*\s*Ex\s*GST)\]/i) || lastAssistantMsg?.content.match(/(\$[\d,]+\.?\d*\s*Ex\s*GST)/i);
                const price = priceMatch?.[1] ?? null;

                if (quoteEmailSent) {
                  return (
                    <div className="shrink-0 mx-3 mb-2 flex items-center gap-2.5 px-4 py-3 rounded-2xl" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "#22c55e" }}>
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5l3.5 3.5 5.5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <div>
                        <p className="text-xs font-bold leading-none" style={{ color: "#15803d" }}>Quote sent — check your inbox!</p>
                        <p className="text-[10px] mt-0.5" style={{ color: "#16a34a" }}>We&apos;ll follow up shortly.</p>
                      </div>
                    </div>
                  );
                }

                if (!quoteEmailOpen) {
                  return (
                    <div className="shrink-0 px-3 pb-2 pt-1" style={{ background: "linear-gradient(to top, #fff 70%, transparent)" }}>
                      <button
                        onClick={() => {
                          // Pre-fill all fields from conversation data Rex already captured
                          const extracted = extractConversationData();
                          if (!quoteEmail && extracted.email) setQuoteEmail(extracted.email);
                          if (!quoteName && extracted.name)   setQuoteName(extracted.name);
                          if (!quoteMobile && extracted.phone) setQuoteMobile(extracted.phone);
                          if (!quoteCompany && extracted.company) setQuoteCompany(extracted.company);
                          setQuoteEmailOpen(true);
                        }}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-150 active:scale-[0.98] hover:brightness-105"
                        style={{ background: "#0084FF", boxShadow: "0 4px 16px rgba(0,132,255,0.35)" }}
                      >
                        <div className="flex items-center gap-2.5">
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="3" width="13" height="10" rx="2" stroke="white" strokeWidth="1.4"/><path d="M1 5.5l6.5 4.5 6.5-4.5" stroke="white" strokeWidth="1.4" strokeLinecap="round"/></svg>
                          <div className="text-left">
                            <p className="text-xs font-bold text-white leading-none">Email me this quote</p>
                            {price && <p className="text-[10px] text-white/80 mt-0.5 leading-none">{price}</p>}
                          </div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    className="absolute left-0 right-0 bottom-0 z-10"
                    style={{
                      background: "white",
                      borderRadius: "20px 20px 0 0",
                      boxShadow: "0 -8px 40px rgba(0,0,0,0.14)",
                      animation: "rexSlideUp 0.22s cubic-bezier(0.34,1.4,0.64,1)",
                      padding: "16px 16px 12px",
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#050505", letterSpacing: "-0.3px" }}>Where should we send it?</p>
                        {price && <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700, color: "#0084FF" }}>{price}</p>}
                      </div>
                      <button
                        onClick={() => setQuoteEmailOpen(false)}
                        style={{ width: 26, height: 26, borderRadius: "50%", background: "#f0f2f5", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#65676b", fontSize: 18, lineHeight: 1 }}
                      >×</button>
                    </div>

                    {/* Name + Company */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#65676b", textTransform: "uppercase" as const, letterSpacing: "0.9px", marginBottom: 4 }}>Full Name</label>
                        <input
                          type="text"
                          placeholder="First and last name"
                          value={quoteName}
                          onChange={e => setQuoteName(e.target.value)}
                          disabled={quoteEmailSending}
                          className="rex-input"
                          style={{ width: "100%", boxSizing: "border-box" as const, padding: "9px 12px", borderRadius: 10, border: "1.5px solid #e4e6eb", fontSize: 12, color: "#050505", background: "#fafafa", outline: "none" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#65676b", textTransform: "uppercase" as const, letterSpacing: "0.9px", marginBottom: 4 }}>Company</label>
                        <input
                          type="text"
                          placeholder="Business name (optional)"
                          value={quoteCompany}
                          onChange={e => setQuoteCompany(e.target.value)}
                          disabled={quoteEmailSending}
                          className="rex-input"
                          style={{ width: "100%", boxSizing: "border-box" as const, padding: "9px 12px", borderRadius: 10, border: "1.5px solid #e4e6eb", fontSize: 12, color: "#050505", background: "#fafafa", outline: "none" }}
                        />
                      </div>
                    </div>

                    {/* Email + Mobile */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#65676b", textTransform: "uppercase" as const, letterSpacing: "0.9px", marginBottom: 4 }}>Email *</label>
                        <input
                          type="email"
                          placeholder="you@email.com"
                          value={quoteEmail}
                          onChange={e => setQuoteEmail(e.target.value)}
                          autoFocus
                          disabled={quoteEmailSending}
                          className="rex-input"
                          style={{ width: "100%", boxSizing: "border-box" as const, padding: "9px 12px", borderRadius: 10, border: "1.5px solid #e4e6eb", fontSize: 12, color: "#050505", background: "#fafafa", outline: "none" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#65676b", textTransform: "uppercase" as const, letterSpacing: "0.9px", marginBottom: 4 }}>Mobile</label>
                        <input
                          type="tel"
                          placeholder="04XX XXX XXX"
                          value={quoteMobile}
                          onChange={e => setQuoteMobile(e.target.value)}
                          disabled={quoteEmailSending}
                          className="rex-input"
                          style={{ width: "100%", boxSizing: "border-box" as const, padding: "9px 12px", borderRadius: 10, border: "1.5px solid #e4e6eb", fontSize: 12, color: "#050505", background: "#fafafa", outline: "none" }}
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#65676b", textTransform: "uppercase" as const, letterSpacing: "0.9px", marginBottom: 4 }}>Delivery Address</label>
                      <input
                        type="text"
                        placeholder="Street, suburb, state, postcode"
                        value={quoteAddress}
                        onChange={e => setQuoteAddress(e.target.value)}
                        disabled={quoteEmailSending}
                        className="rex-input"
                        style={{ width: "100%", boxSizing: "border-box" as const, padding: "9px 12px", borderRadius: 10, border: "1.5px solid #e4e6eb", fontSize: 12, color: "#050505", background: "#fafafa", outline: "none" }}
                      />
                    </div>

                    {/* Despatch */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#65676b", textTransform: "uppercase" as const, letterSpacing: "0.9px", marginBottom: 6 }}>Fulfilment</label>
                      <div style={{ display: "flex", gap: 6 }}>
                        {([ ["pickup", "Pick up — Gold Coast"], ["delivery", "Deliver to me"] ] as const).map(([v, label]) => (
                          <button
                            key={v}
                            onClick={() => setQuoteDesspatch(v)}
                            style={{
                              flex: 1, padding: "8px 6px", borderRadius: 10, fontSize: 11, fontWeight: 600,
                              border: "1.5px solid", cursor: "pointer", transition: "all 0.15s",
                              ...(quoteDesspatch === v
                                ? { background: "#0084FF", color: "white", borderColor: "#0084FF", boxShadow: "0 2px 8px rgba(0,132,255,0.3)" }
                                : { background: "#fafafa", color: "#444950", borderColor: "#e4e6eb" }),
                            }}
                          >{label}</button>
                        ))}
                      </div>
                    </div>

                    {/* Submit */}
                    <button
                      onClick={submitQuoteEmail}
                      disabled={!quoteEmail.trim() || quoteEmailSending}
                      style={{
                        width: "100%", padding: "12px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                        border: "none", cursor: !quoteEmail.trim() || quoteEmailSending ? "not-allowed" : "pointer",
                        background: !quoteEmail.trim() || quoteEmailSending ? "#b0c8f0" : "#0084FF",
                        color: "white",
                        boxShadow: !quoteEmail.trim() ? "none" : "0 4px 16px rgba(0,132,255,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s",
                      }}
                    >
                      {quoteEmailSending ? (
                        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3"/>
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><rect x="1" y="3" width="13" height="10" rx="2" stroke="white" strokeWidth="1.4"/><path d="M1 5.5l6.5 4.5 6.5-4.5" stroke="white" strokeWidth="1.4" strokeLinecap="round"/></svg>
                          Send my quote →
                        </>
                      )}
                    </button>
                  </div>
                );
              })()}

              {/* Quick reply chips — initial greeting (hidden once user responds) */}
              {showQuickReplies && !quoteEmailOpen && !hasUserResponded && (
                <div className="flex flex-col gap-1.5 px-3 pt-2 pb-1.5 shrink-0" style={{ background: "#e8f1ff", borderTop: "1px solid #c8dcff" }}>
                  <p className="text-xs font-semibold px-0.5 pb-0.5" style={{ color: "#0084FF" }}>Where would you like to start?</p>
                  {quickReplies.map((q) => (
                    <button key={q}
                      onClick={() => { trackQuickReply(q); setInputValue(""); handleUserMessage(q); }}
                      className="text-left px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 active:scale-[0.98] hover:-translate-y-px"
                      style={{ background: "#ffffff", color: "#0084FF", border: "1.5px solid #0084FF", boxShadow: "0 1px 4px rgba(0,132,255,0.12)" }}>
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Improvement #2: contextual follow-up chips (hidden once user responds) */}
              {!showQuickReplies && followUpChips.length > 0 && !quoteEmailOpen && !hasUserResponded && (
                <div className="flex flex-wrap gap-1.5 px-3 py-2 shrink-0" style={{ background: "#e8f1ff", borderTop: "1px solid #c8dcff" }}>
                  {followUpChips.map((q) => (
                    <button key={q}
                      onClick={() => { setFollowUpChips([]); handleUserMessage(q); }}
                      className="text-left px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-150 active:scale-[0.97] hover:-translate-y-px"
                      style={{ background: "#ffffff", color: "#0084FF", border: "1.5px solid #0084FF", boxShadow: "0 1px 4px rgba(0,132,255,0.12)" }}>
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Text input ──────────────────────────────────────────────────── */}
          {!isEnded && chatMode && (
            <div
              className="px-3 py-2.5 flex gap-2 items-center shrink-0"
              style={{
                background: "#e8f1ff",
                borderTop: "1px solid #c8dcff",
                paddingBottom: isMobile ? "max(0.625rem, env(safe-area-inset-bottom))" : "0.625rem", // Keyboard safe area on mobile
              }}
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={chatMode === "voice" ? "Or type a message…" : "Type a message…"}
                className="rex-input flex-1 rounded-full px-4 py-3 text-[15px] focus:outline-none transition-colors"
                style={{ background: "#ffffff", color: "#111", border: "1px solid #c8dcff" }}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isThinking}
                className="w-8 h-8 flex items-center justify-center text-white rounded-full disabled:opacity-40 hover:brightness-110 active:scale-95 transition-all shrink-0"
                style={{ background: "#0084FF" }}
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

      {/* Improvement #5: slide-up keyframe + placeholder colours + mobile viewport */}
      <style>{`
        @keyframes rexSlideUp {
          from { transform: translateY(40px) scale(0.94); opacity: 0; }
          to   { transform: translateY(0)    scale(1);    opacity: 1; }
        }
        .rex-input::placeholder { color: #444950; opacity: 1; }
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rex-msg { animation: msgIn 0.18s ease-out forwards; }
        
        /* Mobile viewport fix: prevent zoom on input focus, handle safe areas */
        /* Use pointer:coarse (touch device) not width — the iframe is always narrow so width queries fire on desktop too */
        @media (pointer: coarse) {
          .rex-input {
            font-size: 16px !important; /* Prevent iOS auto-zoom on input focus */
          }
          body {
            -webkit-user-select: none;
            -webkit-touch-callout: none;
          }
        }
      `}</style>
    </div>
  );
}
