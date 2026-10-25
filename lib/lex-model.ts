/**
 * Which model Lex uses for legal research and drafting.
 *
 *   LEX_RESEARCH_MODEL   "provider:model-id", e.g. "anthropic:claude-sonnet-4-6".
 *                        Unset or blank: falls back to PREMIUM_CHAT_MODEL exactly as before,
 *                        so nothing changes in production until it is set.
 *
 * A firm that saved its own API key and model (client-config) always wins.
 */
import type { LanguageModel } from "ai";
import { getPremiumModel, modelFromSpec, parseModelSpec } from "./chat-config";
import { getClientLLMConfig, buildModelFromConfig } from "./client-config";

export const LEX_MODEL_ENV = "LEX_RESEARCH_MODEL";

/** Lex's own research model, or the shared premium model when LEX_RESEARCH_MODEL is not set. */
export function getLexResearchModel(): LanguageModel {
  const raw = (process.env[LEX_MODEL_ENV] ?? "").trim();
  if (!raw) return getPremiumModel();
  return modelFromSpec(raw, LEX_MODEL_ENV);
}

/** The "provider:model" string in effect (for logs and the test harness). Never includes keys. */
export function lexResearchModelSpec(): string {
  const raw = (process.env[LEX_MODEL_ENV] ?? "").trim();
  if (raw) return parseModelSpec(raw, raw).value;
  return parseModelSpec(process.env.PREMIUM_CHAT_MODEL, "anthropic:claude-sonnet-4-6").value;
}

/** The firm's own model when saved, otherwise Lex's research model. Never throws on a bad firm config. */
export async function getLexModelForFirm(configId: string): Promise<LanguageModel> {
  try {
    const own = await getClientLLMConfig(configId);
    const built = own ? buildModelFromConfig(own) : null;
    if (built) return built;
  } catch {
    // Redis down or a broken saved config: use Lex's model.
  }
  return getLexResearchModel();
}
