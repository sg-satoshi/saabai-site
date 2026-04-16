export type Intent = "QUESTION" | "INVESTIGATE" | "EXECUTE";

// Signals are ordered from most to least specific.
// INVESTIGATE is checked before QUESTION because inspect-flavoured verbs
// like "show" and "find" would otherwise match the QUESTION starters list.

const INVESTIGATE_SIGNALS = [
  "inspect",
  "debug",
  "why is",
  "what is in",
  "show",
  "read",
  "find",
  "investigate",
  "open",
  "search",
  "trace",
  "examine",
] as const;

const QUESTION_STARTERS = [
  "what",
  "why",
  "how",
  "explain",
  "can you explain",
  "should i",
  "is it",
  "does it",
] as const;

export function classifyIntent(input: string): Intent {
  if (!input || input.trim().length === 0) {
    return "QUESTION";
  }

  const lower = input.toLowerCase().trim();

  if (INVESTIGATE_SIGNALS.some((s) => lower.includes(s))) {
    return "INVESTIGATE";
  }

  if (QUESTION_STARTERS.some((s) => lower.startsWith(s))) {
    return "QUESTION";
  }

  // Treat code-like or imperative input as execution intent.
  return "EXECUTE";
}
