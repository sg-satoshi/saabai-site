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

import { anthropic, createAnthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { xai } from "@ai-sdk/xai";
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
    case "google":
      return google(modelId);
    case "xai":
      return xai(modelId);
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
 * Fallback: claude-haiku-4-5 (Anthropic) — set DEFAULT_CHAT_MODEL=google:gemini-2.5-flash-lite in Vercel for cheaper Google option.
 * NOTE: gemini-2.0-flash is deprecated June 1 2026 — use gemini-2.5-flash-lite instead.
 */
export function getDefaultModel(): LanguageModel {
  return resolveModel("DEFAULT_CHAT_MODEL", "anthropic:claude-haiku-4-5");
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
 * Select model by tier. Used in the Rex API route.
 */
export function getModel(tier: "default" | "premium" = "default"): LanguageModel {
  return tier === "premium" ? getPremiumModel() : getDefaultModel();
}

/**
 * Per-route Rex Anthropic key lookup.
 *
 * Each Rex route can have its OWN Anthropic API key so the Anthropic
 * console shows usage broken down by route natively. Setup:
 *   REX_CHAT_ANTHROPIC_KEY      — pete-chat (the Rex chat widget)
 *   REX_LEADS_ANTHROPIC_KEY     — rex-leads (post-chat lead extraction)
 *   REX_FEEDBACK_ANTHROPIC_KEY  — rex-feedback (feedback analysis)
 *
 * Fallback chain when a route-specific key is missing:
 *   route-specific key → REX_ANTHROPIC_API_KEY → default ANTHROPIC_API_KEY
 *
 * Create separate keys in the same Anthropic workspace and the dashboard
 * will show per-key spend. No code changes needed once the env vars exist.
 */
type RexRoute = "chat" | "leads" | "feedback";

function getRexKey(route?: RexRoute): string | undefined {
  let specific: string | undefined;
  switch (route) {
    case "chat":     specific = process.env.REX_CHAT_ANTHROPIC_KEY; break;
    case "leads":    specific = process.env.REX_LEADS_ANTHROPIC_KEY; break;
    case "feedback": specific = process.env.REX_FEEDBACK_ANTHROPIC_KEY; break;
  }
  return specific || process.env.REX_ANTHROPIC_API_KEY;
}

/**
 * Rex-specific model. Uses the route-specific Anthropic key if set,
 * otherwise falls back to REX_ANTHROPIC_API_KEY, otherwise the default.
 */
export function getRexModel(tier: "default" | "premium" = "default", route?: RexRoute): LanguageModel {
  const key = getRexKey(route);
  if (!key) return getModel(tier);

  const rexAnthropic = createAnthropic({ apiKey: key });
  const modelId = tier === "premium"
    ? (process.env.PREMIUM_CHAT_MODEL?.replace(/^anthropic:/, "") ?? "claude-sonnet-4-6")
    : (process.env.DEFAULT_CHAT_MODEL?.replace(/^anthropic:/, "") ?? "claude-haiku-4-5");

  return rexAnthropic(modelId);
}

/**
 * Returns an Anthropic SDK provider bound to the Rex billing account.
 * Used by Rex-specific routes that hardcode a model (e.g. claude-haiku-4-5
 * for cost-sensitive transcript analysis, claude-sonnet-4-6 for feedback
 * review) rather than going through DEFAULT_CHAT_MODEL.
 */
export function getRexAnthropic(route?: RexRoute) {
  const key = getRexKey(route);
  if (!key) return anthropic;
  return createAnthropic({ apiKey: key });
}

/**
 * Model for Saabai's own chat (Mia / Atlas).
 * Controlled by SAABAI_CHAT_MODEL env var — completely independent of Rex model config.
 * Fallback: claude-haiku-4.5 (Anthropic only, never Google).
 */
export function getSaabaiModel(): LanguageModel {
  return resolveModel("SAABAI_CHAT_MODEL", "anthropic:claude-haiku-4-5");
}

/**
 * Analyze conversation depth to detect if escalation to premium model is needed.
 * Returns "premium" if conversation shows technical complexity or length.
 * Used for dynamic mid-conversation model switching (Gemini → Claude).
 */
export function analyzeConversationDepth(
  messages: Array<{ role: string; content: string }>
): "default" | "premium" {
  if (messages.length === 0) return "default";

  const allText = messages.map(m => m.content).join(" ").toLowerCase();

  // Technical keywords that indicate complex material science questions
  const technicalKeywords = [
    // Bonding & adhesives
    "bond", "solvent", "cement", "craze", "adhesive", "glue",
    // Thermal & mechanical
    "stress crack", "creep", "fatigue", "thermal", "expansion",
    "thermoform", "forming", "heat",
    // UV & weathering
    "uv resist", "yellow", "degrad", "weather", "outdoor durability",
    // Material properties
    "galvan", "elastomer", "filler", "reinforc", "compos",
    "hygrosc", "moisture absorb", "moisture content",
    // Fabrication
    "machine", "router", "laser cut", "cnc", "weld", "anneal",
    // Specific materials requiring depth
    "ptfe", "teflon", "creep", "virgin", "reprocess",
    "uhmwpe", "wear resist",
    "acetal", "delrin", "pom",
    // Complex comparisons
    "vs ", "versus", "difference between", "compare", "better for",
  ];

  const hasTechnicalKeyword = technicalKeywords.some(kw => allText.includes(kw));

  // Long conversation → likely escalated to complex questions
  const conversationLength = messages.length;
  const isLongConversation = conversationLength > 8;

  // Correction/confusion pattern → customer is pushing back or unclear
  const lastUserMsg = messages
    .filter(m => m.role === "user")
    .pop()?.content.toLowerCase() ?? "";

  const isCorrection =
    lastUserMsg.includes("but ") ||
    lastUserMsg.includes("actually") ||
    lastUserMsg.includes("wait") ||
    lastUserMsg.includes("no ") ||
    lastUserMsg.includes("what about") ||
    lastUserMsg.includes("instead");

  // Escalate if any factor detected
  if (hasTechnicalKeyword || isLongConversation || isCorrection) {
    return "premium";
  }

  return "default";
}

 
