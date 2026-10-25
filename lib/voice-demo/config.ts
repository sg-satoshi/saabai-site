/**
 * Saabai Voice, phase 1a. Homepage demo only.
 * VOICE_AGENT_NAME is the display name. The spoken intro uses that first name.
 * VOICE_AGENT_FULL_NAME is the supporting line only.
 * Prices and offers are not stored here. They come from lib/mia-offers.ts.
 *
 * xAI speech-to-speech pricing (checked 25 Oct 2026):
 * https://docs.x.ai/developers/models/speech-to-speech
 * US$0.08 per minute of session time with server VAD, plus US$0.004
 * per text conversation.item.create. A 2 minute demo is about US$0.17.
 */
import { LINKS } from "../mia-offers";

/** Name shown on the call screen and in the homepage button. */
export const VOICE_AGENT_NAME = "Lachie";
/** Full name for the homepage supporting line. */
export const VOICE_AGENT_FULL_NAME = "Lachie Legend";
/** Say the first name this way. LACK-ee, not Latch-ee. */
export const VOICE_NAME_SAY = "LACK-ee";

export const VOICE_ID = "rigel";
export const VOICE_MODEL = "grok-voice-latest";
export const VOICE_SAMPLE_RATE = 24000;

/** Published USD per minute for grok-voice speech to speech. */
export const VOICE_USD_PER_MIN = 0.08;
/** USD per billed text conversation.item.create. response.create is not billed. */
export const VOICE_USD_PER_TEXT_EVENT = 0.004;

export const VOICE_LIMITS = {
  wrapSeconds: 90,
  hardSeconds: 120,
  perVisitorPerDay: 3,
  sitePerDay: 50,
  concurrent: 3,
} as const;

export const VOICE_BOOKING_URL = LINKS.booking;
export const VOICE_CONTACT_PATH = "/contact";
export const VOICE_PRIVACY_PATH = "/privacy";
export const VOICE_VISITOR_COOKIE = "sb_voice_vid";

/** Text events we send on purpose: the spoken intro, and the 90 second wrap cue. */
export const VOICE_TEXT_EVENTS_PER_SESSION = 2;

export function maxSessionUsd(): number {
  const minutes = VOICE_LIMITS.hardSeconds / 60;
  return VOICE_USD_PER_MIN * minutes + VOICE_USD_PER_TEXT_EVENT * VOICE_TEXT_EVENTS_PER_SESSION;
}

export function voiceIntro(name: string = VOICE_AGENT_NAME): string {
  return `Hi, I'm ${name} from Saabai, an AI assistant. This chat is transcribed, not recorded.`;
}

export const VOICE_WRAP_INSTRUCTIONS =
  "The demo time is almost up. In one or two short sentences, wrap up and offer to book a call with Shane or visit the contact page. Do not ask a new question. Do not read out a web address.";

export const VOICE_COPY = {
  button: `Talk to ${VOICE_AGENT_NAME}`,
  support: `Meet ${VOICE_AGENT_FULL_NAME}, Saabai's AI receptionist.`,
  comingSoon: "Voice demo coming soon",
  consentTitle: "Before we start",
  start: "Start talking",
  cancel: "Not now",
  end: "End conversation",
  privacy: "Privacy policy",
  visitorCap: "You've used today's voice demos. Chat with Mia using the button on this page, or visit the contact page.",
  siteCap: "The voice demo has reached today's limit. Chat with Mia using the button on this page, or visit the contact page.",
  busy: "The voice demo is busy right now. Chat with Mia using the button on this page, or try again shortly.",
  unavailable: "Voice demo coming soon.",
  denied: "The microphone is blocked. Allow it in your browser settings, or chat with Mia on this page.",
  noMic: "No microphone was found. Chat with Mia on this page, or visit the contact page.",
  failed: "The voice demo didn't connect. Please try again, or chat with Mia on this page.",
  ended: "That's the end of this demo. Book a call with Shane, or leave a note on the contact page.",
  wrapping: "Wrapping up",
  listening: "Listening",
  speaking: "Speaking",
  connecting: "Connecting",
  aiLine: "You're talking with an AI.",
  book: "Book a call",
  contact: "Contact page",
  mia: "Chat with Mia",
  timerOf: "of 2:00",
} as const;

export function voiceConsentSentences(name: string = VOICE_AGENT_NAME): [string, string] {
  return [
    `You're about to talk with ${name}. This is an AI, not a person.`,
    "We keep a text transcript of the conversation, not a recording, and xAI processes the voice in the United States.",
  ];
}

export function voiceCapMessage(reason: "visitor" | "site" | "busy" | "locked"): string {
  if (reason === "visitor") return VOICE_COPY.visitorCap;
  if (reason === "site") return VOICE_COPY.siteCap;
  return VOICE_COPY.busy;
}

export function formatVoiceClock(totalSeconds: number): string {
  const s = Math.max(0, Math.min(VOICE_LIMITS.hardSeconds, Math.floor(totalSeconds)));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
