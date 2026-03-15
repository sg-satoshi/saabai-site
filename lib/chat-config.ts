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
 *
 * Supported providers: "anthropic", "openai"
 * The API route selects tier based on the `tier` field in the request body.
 * Default tier is "default" (cost-efficient). Use "premium" for qualified leads.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

function resolveModel(envKey: string, fallback: string): LanguageModel {
  const value = process.env[envKey] ?? fallback;
  const sep = value.indexOf(":");

  if (sep === -1) {
    // No provider prefix — assume Anthropic
    return anthropic(value);
  }

  const provider = value.slice(0, sep);
  const modelId = value.slice(sep + 1);

  switch (provider) {
    case "anthropic":
      return anthropic(modelId);
    case "openai":
      return openai(modelId);
    default:
      throw new Error(
        `[chat-config] Unknown provider "${provider}" in ${envKey}="${value}". ` +
          `Supported: "anthropic", "openai".`
      );
  }
}

/**
 * Cost-efficient model for all conversations.
 * Controlled by DEFAULT_CHAT_MODEL env var.
 * Fallback: claude-haiku-4-5-20251001
 */
export function getDefaultModel(): LanguageModel {
  return resolveModel("DEFAULT_CHAT_MODEL", "anthropic:claude-haiku-4-5-20251001");
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
 * Select model by tier. Used in the API route.
 */
export function getModel(tier: "default" | "premium" = "default"): LanguageModel {
  return tier === "premium" ? getPremiumModel() : getDefaultModel();
}
