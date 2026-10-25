/**
 * Browser session payload for wss://api.x.ai/v1/realtime.
 * Docs: https://docs.x.ai/developers/model-capabilities/audio/speech-to-speech
 * The browser authenticates with an ephemeral token, not the API key:
 * https://docs.x.ai/developers/model-capabilities/audio/ephemeral-tokens
 */
import { VOICE_ID, VOICE_MODEL, VOICE_SAMPLE_RATE } from "./config";

export function voiceSocketUrl(model: string = VOICE_MODEL): string {
  return `wss://api.x.ai/v1/realtime?model=${encodeURIComponent(model)}`;
}

/** sec-websocket-protocol value. The token is the ephemeral client secret. */
export function voiceSocketProtocols(token: string): string[] {
  return [`xai-client-secret.${token}`];
}

export function voiceSessionUpdate(instructions: string) {
  return {
    type: "session.update" as const,
    session: {
      voice: VOICE_ID,
      instructions,
      turn_detection: { type: "server_vad" as const },
      reasoning: { effort: "none" as const },
      audio: {
        input: {
          format: { type: "audio/pcm" as const, rate: VOICE_SAMPLE_RATE },
          transcription: {
            model: "grok-transcribe",
            language_hint: "en",
            keyterms: ["Saabai", "Shane", "Mia", "Presence", "Growth", "Signature", "Blueprint", "Gold Coast"],
          },
        },
        output: { format: { type: "audio/pcm" as const, rate: VOICE_SAMPLE_RATE } },
      },
    },
  };
}

export function voiceIntroItem(text: string) {
  return {
    type: "conversation.item.create" as const,
    item: {
      type: "force_message" as const,
      role: "assistant" as const,
      interruptible: false,
      content: [{ type: "output_text" as const, text }],
    },
  };
}

export function voiceWrapUpdate(instructions: string, wrapInstructions: string) {
  return {
    type: "session.update" as const,
    session: { instructions: `${instructions}\n\n${wrapInstructions}` },
  };
}

export function voiceWrapResponse(wrapInstructions: string) {
  return {
    type: "response.create" as const,
    response: { instructions: wrapInstructions },
  };
}
