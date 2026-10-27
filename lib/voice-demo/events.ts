/** Fold xAI realtime events into a text transcript. Audio is never kept. */

export type TranscriptLine = { role: "visitor" | "assistant"; text: string };

type Slot = { id: string; role: "visitor" | "assistant"; text: string };

export type TranscriptState = { slots: Slot[] };

export function emptyTranscript(): TranscriptState {
  return { slots: [] };
}

function upsert(slots: Slot[], id: string, role: "visitor" | "assistant", text: string, mode: "replace" | "append"): Slot[] {
  const clean = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  const index = slots.findIndex((slot) => slot.id === id);
  if (index === -1) return [...slots, { id, role, text: clean }].slice(-80);
  const next = slots.slice();
  const prev = slots[index];
  next[index] = { id, role, text: mode === "append" ? prev.text + clean : clean };
  return next;
}

function textOf(event: Record<string, unknown>): string {
  if (typeof event.transcript === "string") return event.transcript;
  if (typeof event.delta === "string" && event.type?.toString().includes("transcript")) return event.delta;
  return "";
}

/** Returns the next state. Unknown events are ignored. */
export function applyVoiceEvent(state: TranscriptState, event: Record<string, unknown>): TranscriptState {
  const type = typeof event.type === "string" ? event.type : "";
  const id = String(event.item_id ?? event.response_id ?? event.id ?? type);

  if (type === "conversation.item.input_audio_transcription.updated" || type === "conversation.item.input_audio_transcription.completed") {
    return { slots: upsert(state.slots, `user:${id}`, "visitor", textOf(event), "replace") };
  }

  if (type === "response.output_audio_transcript.delta" || type === "response.audio_transcript.delta") {
    return { slots: upsert(state.slots, `assistant:${id}`, "assistant", textOf(event), "append") };
  }

  if (type === "response.output_audio_transcript.done" || type === "response.audio_transcript.done") {
    const full = typeof event.transcript === "string" ? event.transcript : "";
    if (!full) return state;
    return { slots: upsert(state.slots, `assistant:${id}`, "assistant", full, "replace") };
  }

  return state;
}

export function transcriptLines(state: TranscriptState): TranscriptLine[] {
  return state.slots
    .map((slot) => ({ role: slot.role, text: slot.text.trim().slice(0, 2000) }))
    .filter((slot) => slot.text.length > 0);
}
