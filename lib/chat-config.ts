/**
 * Chat model configuration.
 *
 * Models are resolved from environment variables using the format:
 *   "provider:model-id"
 *
 * Examples:
 *   DEFAULT_CHAT_MODEL=anthropic:claude-haiku-4-5-20251001
 *   PREMIUM_CHAT_MODEL=anthropic:claude-sonnet-4-6
 *   DEFAULT_CHAT_MODEL=openai:gpt-4o-mini
 *   PREMIUM_CHAT_MODEL=openai:gpt-4o
 *   DEFAULT_CHAT_MODEL=google:gemini-2-0-flash-001
 *   PREMIUM_CHAT_MODEL=google:gemini-2-0-pro-001
 *
 * Supported providers: "anthropic", "openai", "google", "xai"
 * The API route selects tier based on the `tier` field in the request body.
 * Default tier is "default" (cost-efficient). Use "premium" for qualified leads.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { xai } from "@ai-sdk/xai";
import type { LanguageModel } from "ai";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

/**
 * Parse a "provider:model-id" env value. Trims spaces, tabs and newlines
 * (a value pasted with a trailing newline once broke Mia in production:
 * xAI got "grok-3-mini\n" and answered 404). Blank values use the fallback.
 * No provider prefix means Anthropic.
 */
export function parseModelSpec(raw: string | undefined, fallback: string): { provider: string; modelId: string; value: string } {
  const trimmed = (raw ?? "").trim();
  const value = trimmed || fallback.trim();
  const sep = value.indexOf(":");
  if (sep === -1) return { provider: "anthropic", modelId: value, value };
  return { provider: value.slice(0, sep).trim().toLowerCase(), modelId: value.slice(sep + 1).trim(), value };
}

function resolveModel(envKey: string, fallback: string): LanguageModel {
  return modelFromSpec(process.env[envKey] ?? "", envKey, fallback);
}

/**
 * Build a model from a "provider:model-id" value (same rules as the env vars above).
 * `label` only appears in error messages, so a bad value names where it came from.
 */
export function modelFromSpec(raw: string, label: string, fallback = raw): LanguageModel {
  const envKey = label;
  const { provider, modelId, value } = parseModelSpec(raw, fallback);

  switch (provider) {
    case "anthropic":
      return anthropic(modelId);
    case "openai":
      return openai(modelId);
    case "google":
      return google(modelId);
    case "xai":
      return xai(modelId);
    case "deepseek": {
      // Prefer the product-dedicated key (never clobber Hermes's own key).
      // .chat() is the OpenAI chat-completions API DeepSeek actually serves.
      // The provider's default call is the Responses API, which DeepSeek does not.
      const key = process.env.AGENT_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
      if (!key) {
        throw new Error(
          "[chat-config] AGENT_DEEPSEEK_API_KEY (or DEEPSEEK_API_KEY) is not set for provider \"deepseek\""
        );
      }
      return createOpenAI({ baseURL: DEEPSEEK_BASE_URL, apiKey: key }).chat(modelId);
    }
    default:
      throw new Error(
        `[chat-config] Unknown provider "${provider}" in ${envKey}="${value}". ` +
          `Supported: "anthropic", "openai", "google", "xai".`
      );
  }
}

/**
 * Cost-efficient model for all conversations.
 * Controlled by DEFAULT_CHAT_MODEL env var.
 * Fallback when that var is unset: Claude Haiku 4.5 on Anthropic.
 * Anthropic processes this model's API requests in the United States (api.anthropic.com).
 * NOTE: gemini-2.0-flash is deprecated June 1 2026. Use gemini-2.5-flash-lite instead.
 */
export const DEFAULT_MODEL_FALLBACK = "anthropic:claude-haiku-4-5";

export function getDefaultModel(): LanguageModel {
  return resolveModel("DEFAULT_CHAT_MODEL", DEFAULT_MODEL_FALLBACK);
}

/**
 * High-capability model for qualified leads or complex conversations.
 * Controlled by PREMIUM_CHAT_MODEL env var.
 * Fallback: claude-sonnet-4-6
 */
export function getPremiumModel(): LanguageModel {
  return resolveModel("PREMIUM_CHAT_MODEL", "anthropic:claude-sonnet-4-6");
}

/**
 * Select model by tier. Default is the cost-efficient model; premium is the
 * high-capability model. Callers that need their own provider key do not use this.
 */
export function getModel(tier: "default" | "premium" = "default"): LanguageModel {
  return tier === "premium" ? getPremiumModel() : getDefaultModel();
}

/**
 * DeepSeek model (OpenAI-compatible via /v1). Cheap, 1M context, text-only.
 * default = V4 Flash (~$0.14/$0.28 per M), premium = V4 Pro (~$0.435/$0.87 per M).
 * Requires AGENT_DEEPSEEK_API_KEY (falls back to DEEPSEEK_API_KEY). Route via
 * DEFAULT_CHAT_MODEL/PREMIUM_CHAT_MODEL as "deepseek:deepseek-v4-flash", or call
 * getDeepSeekModel() directly.
 */
export function getDeepSeekModel(tier: "default" | "premium" = "default"): LanguageModel {
  const modelId = tier === "premium" ? "deepseek-v4-pro" : "deepseek-v4-flash";
  const key = process.env.AGENT_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error(
      "[chat-config] AGENT_DEEPSEEK_API_KEY (or DEEPSEEK_API_KEY) is not set (getDeepSeekModel)"
    );
  }
  return createOpenAI({ baseURL: DEEPSEEK_BASE_URL, apiKey: key }).chat(modelId);
}

/**
 * Model for Saabai's own chat (Mia / Atlas).
 * Controlled by SAABAI_CHAT_MODEL env var, separate from DEFAULT_CHAT_MODEL.
 * Fallback: claude-haiku-4.5 (Anthropic only, never Google).
 */
export function getSaabaiModel(): LanguageModel {
  return resolveModel("SAABAI_CHAT_MODEL", "anthropic:claude-haiku-4-5");
}

