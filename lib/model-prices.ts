/**
 * USD per 1,000,000 tokens for the models the chatbots call today.
 * Input and output are the published base rates (cache reads are not split out).
 *
 * Sources, checked October 2026:
 *   Anthropic: https://platform.claude.com/docs/en/about-claude/pricing
 *     Haiku 4.5 $1 / $5, Sonnet 4.6 $3 / $15, Opus 4.6 $5 / $25
 *   xAI: grok-3-mini $0.30 / $0.50, grok-4 $3 / $15
 *   DeepSeek API docs. The DeepSeek rates below are off-peak cache-miss prices.
 *   Peak hours (weekday 01:00-04:00 and 06:00-10:00 UTC) cost double:
 *     deepseek-v4-flash $0.15 / $0.60 off-peak, deepseek-v4-pro $0.66 / $1.98 off-peak
 *
 * An unknown model still logs its tokens. Its cost is 0 until a rate is added here.
 */

export type ModelPrice = {
  /** USD per 1,000,000 input tokens. */
  input: number;
  /** USD per 1,000,000 output tokens. */
  output: number;
};

export const MODEL_PRICES: Record<string, ModelPrice> = {
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-opus-4-6": { input: 5, output: 25 },
  "grok-3-mini": { input: 0.3, output: 0.5 },
  "grok-4": { input: 3, output: 15 },
  "grok-4-0709": { input: 3, output: 15 },
  "grok-4-latest": { input: 3, output: 15 },
  // DeepSeek rates are off-peak (cache miss). Peak hours cost double.
  "deepseek-v4-flash": { input: 0.15, output: 0.6 },
  "deepseek-flash": { input: 0.15, output: 0.6 },
  "deepseek-v4-pro": { input: 0.66, output: 1.98 },
};

/** Model id with the provider prefix removed, lowercased. */
export function normalizeModelId(model: string): string {
  const trimmed = model.trim().toLowerCase();
  const sep = trimmed.lastIndexOf(":");
  return (sep === -1 ? trimmed : trimmed.slice(sep + 1)).trim();
}

export function priceForModel(model: string): ModelPrice | null {
  if (!model) return null;
  return MODEL_PRICES[normalizeModelId(model)] ?? null;
}

/**
 * Estimated USD for one model call. Rounded to 6 decimal places (matches numeric(12,6)).
 * Unknown models and empty usage cost 0.
 */
export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = priceForModel(model);
  const input = Number.isFinite(inputTokens) ? Math.max(0, inputTokens) : 0;
  const output = Number.isFinite(outputTokens) ? Math.max(0, outputTokens) : 0;
  if (!price || (input === 0 && output === 0)) return 0;
  const raw = (input * price.input + output * price.output) / 1_000_000;
  return Math.round(raw * 1_000_000) / 1_000_000;
}
