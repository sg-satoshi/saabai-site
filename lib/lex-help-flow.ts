/**
 * Lex help answer flow (pure, testable). The route supplies `classify` and `answer`, both through LexGateway.
 * Order: price question -> fixed price line; keyword pre-filter -> decline; model classifier on the
 * question (fail closed) -> decline unless PRODUCT; draft answer; regex + model classifier on the answer
 * -> decline unless PRODUCT_OK and no price figure.
 */
import { answerIsProductOnly, classifyQuestion, type ClassifyRun } from "./lex-help-classify";
import { PRICE_ANSWER, isPriceQuestion } from "./lex-help-knowledge";
import { isLegalQuestion, looksLikeLegalAdvice, parseHelpReply, type HelpOffer } from "./lex-help";

export const HELP_DECLINE = "Sorry, I can't help with that. Lex Assist covers using Lex, not legal advice. For legal questions, use Research in Lex and have a lawyer check the answer. For anything else, contact Saabai at hello@saabai.ai.";
const HAS_PRICE = /\$\s?\d|\bAUD\b|\d[\d,.]*\s*(dollars|a month|per month)\b/i;

export type HelpOutcome = { reply: string; offer: HelpOffer | null; routed: "greeting" | "price" | "prefilter_decline" | "classifier_decline" | "output_decline" | "assistant"; modelText?: string };

export const HELP_GREETING = "Hi! I'm Lex Assist. I can show you how to use Lex, explain a screen or feature, or log a problem or idea for the Saabai team. What would you like to do?";
const GREETING = /^(hi|hello|hey|g'?day|good (morning|afternoon|evening)|thanks|thank you|cheers|yo)\b[\s,!.]*(lex( assist)?|there|mate|team)?[\s!.?]*$/i;
/** Short greetings and thanks get a friendly fixed reply (no model call, nothing to decline). */
export function isGreeting(q: string): boolean { return q.trim().length <= 40 && GREETING.test(q.trim()); }

export async function runHelp(question: string, deps: { classify: ClassifyRun; answer: () => Promise<string> }): Promise<HelpOutcome> {
  if (isGreeting(question)) return { reply: HELP_GREETING, offer: null, routed: "greeting" };
  if (isPriceQuestion(question) && !isLegalQuestion(question)) return { reply: PRICE_ANSWER, offer: null, routed: "price" };
  if (isLegalQuestion(question)) return { reply: HELP_DECLINE, offer: null, routed: "prefilter_decline" };
  const label = await classifyQuestion(question, deps.classify);
  if (label === "PRICE") return { reply: PRICE_ANSWER, offer: null, routed: "price" };
  if (label !== "PRODUCT") return { reply: HELP_DECLINE, offer: null, routed: "classifier_decline" };
  const raw = await deps.answer();
  const parsed = parseHelpReply(raw);
  if (looksLikeLegalAdvice(parsed.reply) || HAS_PRICE.test(parsed.reply) || !(await answerIsProductOnly(parsed.reply, deps.classify))) {
    return { reply: HELP_DECLINE, offer: null, routed: "output_decline", modelText: raw };
  }
  return { reply: parsed.reply, offer: parsed.offer, routed: "assistant", modelText: raw };
}

/** Per-firm daily model-call cap for help (Brisbane day). Each answered question costs up to 3 small calls. */
export const HELP_DAILY_CAP = 150;
export const HELP_CAP_REPLY = "Your firm has reached today's limit for Lex Assist. It resets at midnight Brisbane time. You can still use Report an issue, or email hello@saabai.ai.";
export function helpDayKey(firm: string, now = new Date()): string {
  const day = new Date(now.getTime() + 10 * 3600_000).toISOString().slice(0, 10);
  return `lex:help:day:${firm}:${day}`;
}
