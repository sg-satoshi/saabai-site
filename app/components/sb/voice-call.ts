/**
 * Browser side of one Grok Voice call.
 * Audio stays in the browser. Only text lines are returned for the transcript.
 */
import { VOICE_LIMITS, VOICE_SAMPLE_RATE } from "@/lib/voice-demo/config";
import { applyVoiceEvent, emptyTranscript, transcriptLines, type TranscriptLine, type TranscriptState } from "@/lib/voice-demo/events";
import { base64ToPcm16, downsampleTo, floatToPcm16, pcm16ToBase64 } from "@/lib/voice-demo/pcm";
import { voiceIntroItem, voiceSessionUpdate, voiceSocketProtocols, voiceSocketUrl, voiceWrapResponse, voiceWrapUpdate } from "@/lib/voice-demo/session";

export type VoicePhase = "connecting" | "listening" | "speaking" | "wrapping";

type Handlers = {
  onPhase: (phase: VoicePhase) => void;
  onElapsed: (seconds: number) => void;
  onLines: (lines: TranscriptLine[]) => void;
  onStop: (reason: "user" | "cap" | "error") => void;
};

function createPlayer(rate: number) {
  const ctx = new AudioContext();
  let next = 0;
  const sources: AudioBufferSourceNode[] = [];
  return {
    enqueue(pcm: Int16Array) {
      if (!pcm.length) return;
      const floats = new Float32Array(pcm.length);
      for (let i = 0; i < pcm.length; i++) floats[i] = pcm[i] / 32768;
      const buffer = ctx.createBuffer(1, floats.length, rate);
      buffer.copyToChannel(floats, 0);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      const now = ctx.currentTime;
      if (next < now + 0.02) next = now + 0.05;
      src.start(next);
      next += buffer.duration;
      sources.push(src);
      src.onended = () => {
        const index = sources.indexOf(src);
        if (index >= 0) sources.splice(index, 1);
      };
    },
    clear() {
      for (const src of sources) {
        try { src.stop(); } catch { /* already stopped */ }
      }
      sources.length = 0;
      next = 0;
    },
    async close() {
      this.clear();
      await ctx.close().catch(() => {});
    },
  };
}

function pipeMic(stream: MediaStream, onChunk: (audio: string) => void): () => void {
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  source.connect(processor);
  processor.connect(gain);
  gain.connect(ctx.destination);
  processor.onaudioprocess = (event) => {
    const input = event.inputBuffer.getChannelData(0);
    const down = downsampleTo(input, ctx.sampleRate, VOICE_SAMPLE_RATE);
    if (!down.length) return;
    onChunk(pcm16ToBase64(floatToPcm16(down)));
  };
  return () => {
    processor.onaudioprocess = null;
    processor.disconnect();
    source.disconnect();
    gain.disconnect();
    void ctx.close();
  };
}

export function startVoiceCall(opts: {
  token: string;
  model: string;
  instructions: string;
  intro: string;
  wrapInstructions: string;
  hardEndAt: number;
  startedAt: number;
  serverNow: number;
  stream: MediaStream;
  handlers: Handlers;
}): { stop: () => void; lines: () => TranscriptLine[] } {
  const offset = opts.serverNow - Date.now();
  const serverNow = () => Date.now() + offset;
  const ws = new WebSocket(voiceSocketUrl(opts.model), voiceSocketProtocols(opts.token));
  const player = createPlayer(VOICE_SAMPLE_RATE);
  let state: TranscriptState = emptyTranscript();
  let stopped = false;
  let greeted = false;
  let micReady = false;
  let wrapped = false;
  let stopMic = () => {};

  const setPhase = (next: VoicePhase) => {
    opts.handlers.onPhase(next);
  };

  const publish = () => opts.handlers.onLines(transcriptLines(state));

  const finish = (reason: "user" | "cap" | "error") => {
    if (stopped) return;
    stopped = true;
    window.clearInterval(timer);
    stopMic();
    for (const track of opts.stream.getTracks()) track.stop();
    void player.close();
    try { ws.close(); } catch { /* closed */ }
    opts.handlers.onStop(reason);
  };

  const send = (payload: unknown) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  };

  const armMic = () => {
    if (micReady || stopped) return;
    micReady = true;
    stopMic = pipeMic(opts.stream, (audio) => {
      const elapsed = (serverNow() - opts.startedAt) / 1000;
      if (stopped || elapsed >= VOICE_LIMITS.hardSeconds - 8) return;
      send({ type: "input_audio_buffer.append", audio });
    });
    setPhase("listening");
  };

  const greet = () => {
    if (greeted || stopped) return;
    greeted = true;
    send(voiceIntroItem(opts.intro));
    state = applyVoiceEvent(state, {
      type: "response.output_audio_transcript.done",
      response_id: "intro",
      transcript: opts.intro,
    });
    publish();
    armMic();
  };

  const wrap = () => {
    if (wrapped || stopped) return;
    wrapped = true;
    setPhase("wrapping");
    send(voiceWrapUpdate(opts.instructions, opts.wrapInstructions));
    send(voiceWrapResponse(opts.wrapInstructions));
  };

  ws.addEventListener("open", () => {
    send(voiceSessionUpdate(opts.instructions));
  });

  ws.addEventListener("message", (event) => {
    if (typeof event.data !== "string") return;
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(event.data) as Record<string, unknown>;
    } catch {
      return;
    }
    const type = typeof msg.type === "string" ? msg.type : "";
    if (type === "session.updated") greet();
    if (type === "response.output_audio.delta" || type === "response.audio.delta") {
      if (typeof msg.delta === "string") {
        player.enqueue(base64ToPcm16(msg.delta));
        if (!wrapped) setPhase("speaking");
      }
    }
    if (type === "response.done" || type === "response.output_audio.done") {
      if (micReady) setPhase(wrapped ? "wrapping" : "listening");
    }
    if (type === "input_audio_buffer.speech_started") player.clear();
    const next = applyVoiceEvent(state, msg);
    if (next !== state) {
      state = next;
      publish();
    }
    if (type === "error" && !greeted) finish("error");
  });

  ws.addEventListener("error", () => finish("error"));
  ws.addEventListener("close", () => {
    if (stopped) return;
    const elapsed = (serverNow() - opts.startedAt) / 1000;
    finish(elapsed >= VOICE_LIMITS.hardSeconds - 1 ? "cap" : "error");
  });

  const timer = window.setInterval(() => {
    const elapsed = (serverNow() - opts.startedAt) / 1000;
    opts.handlers.onElapsed(Math.max(0, elapsed));
    if (!greeted && elapsed > 2) greet();
    if (elapsed >= VOICE_LIMITS.wrapSeconds) wrap();
    if (serverNow() >= opts.hardEndAt) finish("cap");
  }, 250);

  return {
    stop: () => finish("user"),
    lines: () => transcriptLines(state),
  };
}
