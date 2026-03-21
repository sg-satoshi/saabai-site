"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskMode,
  TaskType,
  VoiceEmotion,
} from "@heygen/streaming-avatar";

const AVATAR_ID = "185788c7dc574e008428a3afec0c5f31";
const ELEVENLABS_VOICE_ID = "txdmFzaxxwmYbb99FY4D";

const PETER_SYSTEM_PROMPT = `You are Peter Shane, founder of Saabai.ai — an AI automation company helping professional services and trade businesses save time and scale without hiring.

You're speaking with someone at PlasticOnline (also known as PLON or Holland Plastics), a plastics distribution business in Australia. You recently completed an AI audit for them and are now scoping out a full AI agent build.

Your role: have a natural, confident conversation. Help them think through the scoping form on this page. Answer questions about what the AI agent will do, how it integrates with WooCommerce and Pipedrive, and what kind of results they can expect.

Keep replies short — 2–3 sentences max. You're on a live video call. Be warm and direct.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function PeterAvatarWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const avatarRef = useRef<StreamingAvatar | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);
  const sessionActiveRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => { sessionActiveRef.current = sessionActive; }, [sessionActive]);

  const startListening = useCallback(() => {
    if (recognitionRef.current || isSpeakingRef.current || !sessionActiveRef.current) return;
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
        // Silence timeout — restart listening
        if (sessionActiveRef.current && !isSpeakingRef.current) {
          setTimeout(() => {
            if (sessionActiveRef.current && !recognitionRef.current && !isSpeakingRef.current) {
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

  async function speakWithAvatar(text: string) {
    if (!avatarRef.current) return;
    try {
      await avatarRef.current.speak({
        text,
        taskType: TaskType.REPEAT,
        taskMode: TaskMode.SYNC,
      });
    } catch (err) {
      console.error("Speak error:", err);
    }
  }

  async function handleUserMessage(text: string) {
    if (!text.trim() || !avatarRef.current) return;

    const updated: ChatMessage[] = [...messagesRef.current, { role: "user", content: text }];
    messagesRef.current = updated;
    setIsThinking(true);
    stopListening();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: PETER_SYSTEM_PROMPT },
            ...updated,
          ],
          tier: "default",
        }),
      });

      if (!res.ok) throw new Error(`Chat error ${res.status}`);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (line.startsWith("0:")) {
              try {
                const parsed = JSON.parse(line.slice(2));
                if (typeof parsed === "string") fullText += parsed;
              } catch {}
            }
          }
        }
      }

      if (fullText.trim()) {
        messagesRef.current = [...updated, { role: "assistant", content: fullText.trim() }];
        setIsThinking(false);
        await speakWithAvatar(fullText.trim());
      } else {
        setIsThinking(false);
      }
    } catch (err) {
      setError(String(err).slice(0, 120));
      setIsThinking(false);
    }
  }

  async function startSession() {
    setIsConnecting(true);
    setError(null);

    try {
      const tokenRes = await fetch("/api/heygen-token", { method: "POST" });
      if (!tokenRes.ok) throw new Error(await tokenRes.text());
      const { token } = await tokenRes.json();

      const avatar = new StreamingAvatar({ token });
      avatarRef.current = avatar;

      avatar.on(StreamingEvents.AVATAR_START_TALKING, () => {
        setIsSpeaking(true);
        isSpeakingRef.current = true;
        stopListening();
      });

      avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        setTimeout(() => {
          if (sessionActiveRef.current && !isSpeakingRef.current) {
            startListening();
          }
        }, 400);
      });

      avatar.on(StreamingEvents.STREAM_READY, (stream: MediaStream) => {
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setSessionActive(true);
        setIsConnecting(false);

        // Greet
        speakWithAvatar(
          "Hey — Peter here. I'm here if you have any questions while you're filling this in. What are you thinking so far?"
        );
      });

      avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        setSessionActive(false);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        stopListening();
      });

      await avatar.createStartAvatar({
        quality: AvatarQuality.High,
        avatarName: AVATAR_ID,
        voice: {
          voiceId: ELEVENLABS_VOICE_ID,
          rate: 1.0,
          emotion: VoiceEmotion.FRIENDLY,
        },
        language: "en",
        disableIdleTimeout: true,
      });
    } catch (err) {
      setError(String(err).slice(0, 200));
      setIsConnecting(false);
    }
  }

  async function endSession() {
    stopListening();
    if (avatarRef.current) {
      await avatarRef.current.stopAvatar().catch(() => {});
      avatarRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setSessionActive(false);
    setIsSpeaking(false);
    setIsThinking(false);
    messagesRef.current = [];
  }

  function handleClose() {
    endSession();
    setIsOpen(false);
    setError(null);
  }

  async function handleSend() {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue("");
    await handleUserMessage(text);
  }

  return (
    <>
      {/* Floating launcher */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-saabai-surface border border-saabai-teal/30 rounded-full pl-4 pr-5 py-3 shadow-lg hover:border-saabai-teal/60 transition-all group"
          style={{ boxShadow: "0 0 24px rgba(98,197,209,0.15)" }}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-saabai-teal/30 to-indigo-700/40 border border-saabai-teal/40 flex items-center justify-center text-xs font-bold text-saabai-teal shrink-0">
            PS
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-saabai-text leading-none">Talk to Peter</p>
            <p className="text-[10px] text-saabai-text-dim mt-0.5">Got questions? I'm here.</p>
          </div>
        </button>
      )}

      {/* Widget panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl overflow-hidden shadow-2xl border border-saabai-border bg-saabai-surface flex flex-col" style={{ boxShadow: "0 0 60px rgba(98,197,209,0.12)" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-saabai-border">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-saabai-teal/30 to-indigo-700/40 border border-saabai-teal/40 flex items-center justify-center text-[10px] font-bold text-saabai-teal shrink-0">
                PS
              </div>
              <div>
                <p className="text-xs font-semibold text-saabai-text leading-none">Peter Shane</p>
                <p className="text-[10px] text-saabai-text-dim mt-0.5">Founder, Saabai.ai</p>
              </div>
            </div>
            <button onClick={handleClose} className="text-saabai-text-dim hover:text-saabai-text transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Video area */}
          <div className="relative bg-black aspect-video flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-300 ${sessionActive ? "opacity-100" : "opacity-0"}`}
            />

            {!sessionActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                {isConnecting ? (
                  <>
                    <div className="w-8 h-8 rounded-full border-2 border-saabai-teal border-t-transparent animate-spin" />
                    <p className="text-saabai-text-dim text-xs">Connecting...</p>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-saabai-teal/20 to-indigo-700/30 border border-saabai-teal/30 flex items-center justify-center text-xl font-bold text-saabai-teal">
                      PS
                    </div>
                    <button
                      onClick={startSession}
                      className="px-4 py-2 bg-saabai-teal text-saabai-bg rounded-full text-xs font-semibold hover:bg-saabai-teal-bright transition-colors"
                    >
                      Start video call
                    </button>
                    {error && <p className="text-red-400 text-[10px] px-4 text-center">{error}</p>}
                  </>
                )}
              </div>
            )}

            {/* Status badge */}
            {sessionActive && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                {isSpeaking ? (
                  <div className="flex items-center gap-1 bg-black/70 backdrop-blur rounded-full px-2.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-saabai-teal animate-pulse" />
                    <span className="text-[10px] text-gray-300">Speaking</span>
                  </div>
                ) : isListening ? (
                  <div className="flex items-center gap-1 bg-black/70 backdrop-blur rounded-full px-2.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px] text-gray-300">Listening</span>
                  </div>
                ) : isThinking ? (
                  <div className="flex items-center gap-1 bg-black/70 backdrop-blur rounded-full px-2.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                    <span className="text-[10px] text-gray-300">Thinking</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Text input fallback */}
          {sessionActive && (
            <div className="p-3 border-t border-saabai-border flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Or type a question..."
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
