"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  formatVoiceClock,
  VOICE_AGENT_NAME,
  VOICE_BOOKING_URL,
  VOICE_CONTACT_PATH,
  VOICE_COPY,
  VOICE_LIMITS,
  VOICE_PRIVACY_PATH,
  voiceCapMessage,
} from "@/lib/voice-demo/config";
import { type TranscriptLine } from "@/lib/voice-demo/events";
import { startVoiceCall, type VoicePhase } from "./voice-call";
import "./voice-demo.css";

type Phase = "idle" | "consent" | "connecting" | "live" | "ended" | "error";
type VoiceVariant = "home" | "legal";

type SessionPayload = {
  ok: true;
  sessionId: string;
  secret: string;
  token: string;
  model: string;
  variant?: VoiceVariant;
  agentName: string;
  instructions: string;
  intro: string;
  wrapInstructions: string;
  keyterms?: string[];
  startedAt: number;
  hardEndAt: number;
  serverNow: number;
};

type FailPayload = { ok: false; error?: string; message?: string };

const AVATAR_1X = "/brand/lachie/avatar/lachie-headset-avatar-button-48.png";
const AVATAR_2X = "/brand/lachie/avatar/lachie-headset-avatar-button-96.png";
const WAVE_STATES = ["idle", "listening", "talking"] as const;
type WaveState = (typeof WAVE_STATES)[number];

function openMia() {
  document.querySelector<HTMLButtonElement>('button[aria-label="Chat with Mia"]')?.click();
}

function LachieAvatar({ size }: { size: number }) {
  return (
    <img
      src={AVATAR_1X}
      srcSet={`${AVATAR_2X} 2x`}
      width={size}
      height={size}
      alt=""
    />
  );
}

export function LachieLockup({
  second,
  descriptor,
  as: Tag = "div",
}: {
  second: "Legend" | "Legal";
  descriptor: string;
  as?: "div" | "h2";
}) {
  return (
    <Tag className="lachie-lockup" data-theme="dark">
      <span className="lachie-lockup__line">
        <span className="lachie-lockup__meet">Meet</span>{" "}
        <span className="lachie-lockup__name">Lachie</span>{" "}
        <span className="lachie-lockup__second">{second}</span>
      </span>
      <span className="lachie-lockup__desc">{descriptor}</span>
    </Tag>
  );
}

function Waveform({ state }: { state: WaveState }) {
  const alt = state === "talking" ? "Lachie is talking" : state === "listening" ? "Lachie is listening" : "Lachie, idle";
  return (
    <div className="voice-stage">
      {WAVE_STATES.map((name) => {
        const on = name === state;
        return (
          <picture key={name} className={on ? "is-on" : undefined} aria-hidden={on ? undefined : true}>
            <source srcSet={`/brand/lachie/widget/lachie-waveform-${name}-still.svg`} media="(prefers-reduced-motion: reduce)" />
            <img src={`/brand/lachie/widget/lachie-waveform-${name}.svg`} alt={on ? alt : ""} width={168} height={168} />
          </picture>
        );
      })}
    </div>
  );
}

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default function VoiceDemo({
  ready,
  variant = "home",
  showSupport = variant === "home",
}: {
  ready: boolean;
  variant?: VoiceVariant;
  showSupport?: boolean;
}) {
  const titleId = useId();
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [agentName, setAgentName] = useState("");
  const [callPhase, setCallPhase] = useState<VoicePhase>("connecting");
  const [elapsed, setElapsed] = useState(0);
  const [line, setLine] = useState("");
  const [root, setRoot] = useState<Element | null>(null);
  const callRef = useRef<{ stop: () => void; lines: () => TranscriptLine[] } | null>(null);
  const sessionRef = useRef<{ sessionId: string; secret: string } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pulseRef = useRef<number | null>(null);
  const attemptRef = useRef(0);

  useEffect(() => {
    const selector = variant === "legal" ? ".lx" : ".sb";
    const id = window.setTimeout(() => setRoot(document.querySelector(selector)), 0);
    return () => window.clearTimeout(id);
  }, [variant]);

  useEffect(() => {
    return () => {
      callRef.current?.stop();
      if (pulseRef.current) window.clearInterval(pulseRef.current);
    };
  }, []);

  function closeConsent() {
    setPhase("idle");
    setMessage("");
  }

  async function release(lines: TranscriptLine[]) {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (pulseRef.current) {
      window.clearInterval(pulseRef.current);
      pulseRef.current = null;
    }
    stopStream();
    if (!session) return;
    await postJson("/api/voice/transcript", { ...session, lines }).catch(() => {});
    await postJson("/api/voice/end", session).catch(() => {});
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function cancelAttempt() {
    attemptRef.current += 1;
    callRef.current?.stop();
    callRef.current = null;
    stopStream();
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session) void postJson("/api/voice/end", session).catch(() => {});
    if (pulseRef.current) {
      window.clearInterval(pulseRef.current);
      pulseRef.current = null;
    }
    setPhase("idle");
    setMessage("");
  }

  async function begin() {
    const attempt = ++attemptRef.current;
    setPhase("connecting");
    setMessage("");
    setElapsed(0);
    setLine("");
    setCallPhase("connecting");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
        video: false,
      });
    } catch (err) {
      if (attemptRef.current !== attempt) return;
      const name = err instanceof DOMException ? err.name : "";
      setPhase("error");
      if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
        setMessage(VOICE_COPY.denied);
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setMessage(VOICE_COPY.noMic);
      } else {
        setMessage(VOICE_COPY.failed);
      }
      return;
    }
    if (attemptRef.current !== attempt) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    streamRef.current = stream;

    let payload: SessionPayload | FailPayload | null = null;
    try {
      const res = await postJson("/api/voice/session", { variant });
      payload = await res.json() as SessionPayload | FailPayload;
    } catch {
      payload = null;
    }
    if (attemptRef.current !== attempt) {
      stream.getTracks().forEach((track) => track.stop());
      if (payload && payload.ok) void postJson("/api/voice/end", { sessionId: payload.sessionId, secret: payload.secret }).catch(() => {});
      return;
    }
    if (!payload || !payload.ok) {
      stream.getTracks().forEach((track) => track.stop());
      setPhase("error");
      const reason = payload?.error;
      if (reason === "visitor" || reason === "site" || reason === "busy") {
        setMessage(payload?.message || voiceCapMessage(reason));
      } else {
        setMessage(payload?.message || VOICE_COPY.failed);
      }
      return;
    }

    sessionRef.current = { sessionId: payload.sessionId, secret: payload.secret };
    setAgentName(payload.agentName);
    setPhase("live");

    const call = startVoiceCall({
      token: payload.token,
      model: payload.model,
      instructions: payload.instructions,
      intro: payload.intro,
      wrapInstructions: payload.wrapInstructions,
      keyterms: payload.keyterms,
      hardEndAt: payload.hardEndAt,
      startedAt: payload.startedAt,
      serverNow: payload.serverNow,
      stream,
      handlers: {
        onPhase: setCallPhase,
        onElapsed: setElapsed,
        onLines: (lines) => {
          const last = lines[lines.length - 1];
          if (last) setLine(last.text);
        },
        onStop: (reason) => {
          const lines = callRef.current?.lines() ?? [];
          callRef.current = null;
          void release(lines);
          setPhase("ended");
          setMessage(reason === "error" ? VOICE_COPY.failed : VOICE_COPY.ended);
        },
      },
    });
    callRef.current = call;

    pulseRef.current = window.setInterval(() => {
      const session = sessionRef.current;
      if (!session) return;
      void postJson("/api/voice/pulse", session)
        .then((res) => res.json())
        .then((body: { continue?: boolean }) => {
          if (body.continue === false) callRef.current?.stop();
        })
        .catch(() => {});
    }, 10_000);
  }

  function hangUp() {
    callRef.current?.stop();
  }

  const showWrapLinks = phase === "ended" || (phase === "live" && elapsed >= VOICE_LIMITS.wrapSeconds);
  const wave: WaveState = phase === "live" && (callPhase === "speaking" || callPhase === "wrapping")
    ? "talking"
    : phase === "live" && callPhase === "listening"
      ? "listening"
      : "idle";
  const status = phase === "connecting"
    ? VOICE_COPY.connecting
    : wave === "talking"
      ? "Lachie is talking"
      : wave === "listening"
        ? "Listening"
        : callPhase === "wrapping"
          ? VOICE_COPY.wrapping
          : VOICE_COPY.listening;
  const ttlState = phase === "connecting" ? "connecting" : phase === "live" ? "live" : phase === "ended" ? "ended" : "idle";
  const clock = formatVoiceClock(elapsed);
  const buttonLabel = ttlState === "connecting"
    ? "Connecting…"
    : ttlState === "live"
      ? "Live with Lachie"
      : ttlState === "ended"
        ? "Call ended"
        : VOICE_COPY.button;
  const buttonSub = ttlState === "connecting"
    ? "Calling Lachie, your AI receptionist"
    : ttlState === "live"
      ? `AI receptionist · ${clock}`
      : ttlState === "ended"
        ? "Thanks for calling. Tap to call again"
        : "AI receptionist";

  const dialog = phase === "idle" ? null : (
    <div className="voice-back" role="presentation">
      <div className="voice-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="voice-hd">
          <LachieAvatar size={44} />
          <div>
            <b id={titleId}>{agentName || VOICE_AGENT_NAME}</b>
            <small>AI receptionist</small>
          </div>
          {phase === "connecting" || phase === "live" ? (
            <span className="voice-tm" aria-label="Call time">{clock}</span>
          ) : null}
        </div>

        {phase === "consent" ? (
          <>
            <Waveform state="idle" />
            <p className="voice-state">{VOICE_COPY.consentTitle}</p>
            <p className="voice-hint">{VOICE_COPY.consent}</p>
            <p className="voice-note">
              <a href={VOICE_PRIVACY_PATH}>{VOICE_COPY.privacy}</a>
            </p>
            <div className="voice-actions">
              <button type="button" className="voice-go" onClick={() => void begin()}>{VOICE_COPY.start}</button>
              <button type="button" className="voice-quiet" onClick={closeConsent}>{VOICE_COPY.cancel}</button>
            </div>
          </>
        ) : null}

        {phase === "connecting" || phase === "live" ? (
          <>
            <Waveform state={wave} />
            <p className="voice-state" aria-live="polite">{status}</p>
            <p className="voice-hint">{line || VOICE_COPY.aiLine}</p>
            {showWrapLinks ? <NextLinks /> : null}
            <div className="voice-actions">
              <button type="button" className={phase === "connecting" ? "voice-quiet" : "voice-end"} onClick={phase === "connecting" ? cancelAttempt : hangUp}>
                {phase === "connecting" ? VOICE_COPY.cancel : "End call"}
              </button>
            </div>
          </>
        ) : null}

        {phase === "error" || phase === "ended" ? (
          <>
            <Waveform state="idle" />
            <p className="voice-state">{phase === "ended" ? "Call ended" : "Something went wrong"}</p>
            <p className="voice-hint">{message}</p>
            <NextLinks onMia={() => { openMia(); setPhase("idle"); }} />
            <div className="voice-actions">
              <button type="button" className="voice-quiet" onClick={() => setPhase("idle")}>Close</button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      {ready ? (
        <span className="voice-launch">
          <button
            type="button"
            className="ttl"
            data-theme="dark"
            data-state={ttlState}
            aria-label={`${buttonLabel}, ${buttonSub.replace(/ · /g, ", ")}`}
            onClick={() => setPhase("consent")}
            disabled={phase !== "idle"}
          >
            <span className="ttl__avatar"><LachieAvatar size={48} /></span>
            <span className="ttl__text">
              <span className="ttl__label">{buttonLabel}</span>
              <span className="ttl__sub">{buttonSub}</span>
            </span>
            <span className="ttl__wave" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
          </button>
          {showSupport ? <LachieLockup second="Legend" descriptor="Saabai's AI receptionist." /> : null}
        </span>
      ) : (
        <button type="button" className="btn ghost" disabled style={{ cursor: "not-allowed" }}>{VOICE_COPY.comingSoon}</button>
      )}
      {dialog && root ? createPortal(dialog, root) : null}
    </>
  );
}

function NextLinks({ onMia }: { onMia?: () => void }) {
  return (
    <div className="voice-actions">
      <a className="btn" href={VOICE_BOOKING_URL} target="_blank" rel="noopener noreferrer">{VOICE_COPY.book}</a>
      <a className="btn ghost" href={VOICE_CONTACT_PATH}>{VOICE_COPY.contact}</a>
      <button type="button" className="btn ghost" onClick={onMia ?? openMia}>{VOICE_COPY.mia}</button>
    </div>
  );
}
