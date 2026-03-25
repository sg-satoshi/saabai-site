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

const SYSTEM_PROMPT = `You are Pete, founder of Saabai.ai — an AI automation company helping professional services businesses save time and scale without hiring.

You're talking with the team at PlasticOnline (PLON), a plastics distribution business you've recently done an AI audit for.

Your role: explain how the AI agent system you're building for them works, answer questions about automation, demonstrate its capabilities, and keep the conversation natural and confident.

Keep responses concise — 1–3 sentences max. You're in a live video call.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function PlonPage() {
  const [sessionActive, setSessionActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>("");

  const avatarRef = useRef<StreamingAvatar | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);
  const listeningRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const sessionActiveRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { sessionActiveRef.current = sessionActive; }, [sessionActive]);

  async function startSession() {
    setIsLoading(true);
    setError(null);
    setSessionStatus("Connecting...");

    try {
      const tokenRes = await fetch("/api/heygen-token", { method: "POST" });
      if (!tokenRes.ok) throw new Error(`Token error: ${await tokenRes.text()}`);
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
        // Auto-start listening after Peter finishes speaking
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
        setSessionStatus("Connected");
        setIsLoading(false);

        // Greet the visitor
        speakWithAvatar(
          avatar,
          "Hey, welcome! I'm Peter. I built the AI agent you're about to see in action — happy to walk you through it or answer any questions you have."
        );
      });

      avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        setSessionActive(false);
        setSessionStatus("Disconnected");
        setIsSpeaking(false);
        isSpeakingRef.current = false;
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
      setError(String(err));
      setIsLoading(false);
      setSessionStatus("Failed to connect");
    }
  }

  async function stopSession() {
    stopListening();
    if (avatarRef.current) {
      await avatarRef.current.stopAvatar().catch(() => {});
      avatarRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setSessionActive(false);
    setIsSpeaking(false);
    setIsListening(false);
    setMessages([]);
    setSessionStatus("");
  }

  async function speakWithAvatar(avatar: StreamingAvatar, text: string) {
    try {
      await avatar.speak({
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
    setMessages(updated);
    setIsLoading(true);

    try {
      const res = await fetch("/api/plon/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });

      if (!res.ok) throw new Error(`Chat error ${res.status}`);

      // Parse AI SDK v6 SSE stream: data: {"type":"text-delta","delta":"..."}
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.type === "text-delta" && parsed.delta) fullText += parsed.delta;
            } catch {}
          }
        }
      }

      if (fullText.trim()) {
        const assistantMsg: ChatMessage = { role: "assistant", content: fullText.trim() };
        setMessages([...updated, assistantMsg]);
        await speakWithAvatar(avatarRef.current!, fullText.trim());
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }

  const startListening = useCallback(() => {
    if (recognitionRef.current || isSpeakingRef.current || !sessionActiveRef.current) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-AU";

    recognition.onstart = () => { setIsListening(true); listeningRef.current = true; };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as any)
        .map((r: any) => r[0].transcript)
        .join("");
      setInputValue(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
      listeningRef.current = false;
      recognitionRef.current = null;
      setInputValue((current) => {
        const text = current.trim();
        if (text) {
          handleUserMessage(text);
          return "";
        }
        // Silence timeout — restart if Peter isn't speaking
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
      listeningRef.current = false;
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    listeningRef.current = false;
  }

  async function handleSend() {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue("");
    await handleUserMessage(text);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Pete</h1>
          <p className="text-gray-400 text-sm mt-1">Founder, Saabai.ai · AI Automation</p>
        </div>

        {/* Video */}
        <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-video flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-300 ${sessionActive ? "opacity-100" : "opacity-0"}`}
          />
          {!sessionActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              {isLoading ? (
                <>
                  <div className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                  <p className="text-gray-400 text-sm">{sessionStatus}</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-3xl font-bold">
                    PS
                  </div>
                  <button
                    onClick={startSession}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-full text-sm font-medium transition-colors"
                  >
                    Start conversation
                  </button>
                  {error && <p className="text-red-400 text-xs max-w-xs text-center">{error}</p>}
                </>
              )}
            </div>
          )}

          {/* Speaking/Listening indicator */}
          {sessionActive && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
              {isSpeaking ? (
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur rounded-full px-3 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  <span className="text-xs text-gray-300">Speaking</span>
                </div>
              ) : isListening ? (
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur rounded-full px-3 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-gray-300">Listening</span>
                </div>
              ) : isLoading ? (
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur rounded-full px-3 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="text-xs text-gray-300">Thinking</span>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Text input — available as fallback */}
        {sessionActive && (
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a message or just speak..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl text-sm font-medium transition-colors"
            >
              Send
            </button>
            <button
              onClick={stopSession}
              className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm transition-colors"
            >
              End
            </button>
          </div>
        )}

        {/* Live transcript (subtle) */}
        {inputValue && isListening && (
          <p className="text-center text-gray-500 text-sm italic">{inputValue}</p>
        )}
      </div>
    </div>
  );
}
