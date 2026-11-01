/**
 * Lex model IDs, in one place. Every Lex caller and both model pickers
 * (admin Lex settings and the client portal Lex workspace) import from here.
 *
 * Checked against the providers' official model and deprecation pages on 2 Nov 2026:
 *   Anthropic  docs.anthropic.com/en/docs/about-claude/model-deprecations
 *   OpenAI     developers.openai.com/api/docs/deprecations and /pricing
 *   Google     ai.google.dev/gemini-api/docs/deprecations and /pricing
 *   xAI        docs.x.ai/docs/models
 * Prices are USD per million input tokens, as a rough guide only.
 *
 * Removed or retiring IDs and what replaced them in the pickers:
 *   gemini-2.0-flash       shut down 1 Jun 2026       -> gemini-3.6-flash (Google's named replacement)
 *   gemini-1.5-pro         shut down                  -> gemini-3.8-flash
 *   gemini-2.5-flash-lite  closed to new projects     -> gemini-3.5-flash-lite
 *   gpt-4o, gpt-4o-mini    retire 14 Jan 2027         -> gpt-6-sol, gpt-6-luna (OpenAI's named replacements)
 *   grok-3, grok-3-mini    no longer listed by xAI    -> grok-4.7, grok-4.3
 */

/** Lex's own Saabai-paid models (used when a firm has not saved its own key). */
export const LEX_SONNET = "claude-sonnet-4-6";
export const LEX_HAIKU = "claude-haiku-4-5-20251001";

/** Fallback for Lex research when neither LEX_RESEARCH_MODEL nor PREMIUM_CHAT_MODEL is set. */
export const LEX_RESEARCH_FALLBACK = `anthropic:${LEX_SONNET}`;

export type LexPickerModel = {
  id: string;
  name: string;
  cost: string;
  badge: string;
  context: string;
  /** Short label for the portal dropdown. */
  hint: string;
};

export const LEX_PICKER_MODELS = {
  anthropic: [
    { id: LEX_HAIKU, name: "Claude Haiku 4.5", cost: "~$1/M tokens", badge: "Fastest · cheapest", context: "200K", hint: "fastest, lowest cost" },
    { id: LEX_SONNET, name: "Claude Sonnet 4.6", cost: "~$3/M tokens", badge: "Recommended", context: "200K", hint: "recommended for legal research" },
    { id: "claude-opus-4-6", name: "Claude Opus 4.6", cost: "~$5/M tokens", badge: "Most capable", context: "200K", hint: "most capable" },
  ],
  openai: [
    { id: "gpt-6-luna", name: "GPT-6 Luna", cost: "~$0.10/M tokens", badge: "Best value", context: "272K", hint: "best value" },
    { id: "gpt-6-sol", name: "GPT-6 Sol", cost: "~$2/M tokens", badge: "Recommended", context: "272K", hint: "recommended" },
  ],
  google: [
    { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite", cost: "Free tier + ~$0.30/M", badge: "Free tier", context: "1M", hint: "free tier" },
    { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash", cost: "~$0.75/M tokens", badge: "Recommended", context: "1M", hint: "recommended" },
    { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", cost: "~$0.75/M tokens", badge: "Most capable", context: "1M", hint: "most capable" },
  ],
  xai: [
    { id: "grok-4.3", name: "Grok 4.3", cost: "~$1.25/M tokens", badge: "Recommended", context: "1M", hint: "lower cost" },
    { id: "grok-4.7", name: "Grok 4.7", cost: "~$2/M tokens", badge: "Most capable", context: "500K", hint: "most capable" },
  ],
} as const satisfies Record<string, readonly LexPickerModel[]>;

export type LexPickerProvider = keyof typeof LEX_PICKER_MODELS;

/** The model pre-selected when a firm picks a provider (the one badged Recommended). */
export const LEX_PICKER_DEFAULT: Record<LexPickerProvider, string> = {
  anthropic: LEX_SONNET,
  openai: "gpt-6-sol",
  google: "gemini-3.6-flash",
  xai: "grok-4.3",
};

/** Coming-soon providers in admin (not selectable). */
export const LEX_COMING_SOON_MODELS = {
  groq: [
    { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", cost: "Free tier", badge: "Free", context: "128K" },
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", cost: "Very low", badge: "More capable", context: "128K" },
  ],
  moonshot: [
    { id: "kimi-k2", name: "Kimi K2", cost: "Competitive", badge: "Recommended", context: "128K" },
  ],
} as const;

/** IDs that providers have shut down or are retiring, mapped to the picker replacement. */
export const LEX_RETIRED_MODELS: Record<string, string> = {
  "gemini-2.0-flash": "gemini-3.6-flash",
  "gemini-1.5-pro": "gemini-3.8-flash",
  "gemini-2.5-flash-lite": "gemini-3.5-flash-lite",
  "gpt-4o": "gpt-6-sol",
  "gpt-4o-mini": "gpt-6-luna",
  "grok-3": "grok-4.7",
  "grok-3-mini": "grok-4.3",
};
