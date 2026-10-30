/**
 * Lex help assistant: prompt, reply parsing and routing. The model call itself is in
 * app/api/lex-help/route.ts through LexGateway (masking, fail closed). Nothing here files feedback:
 * the model may only PROPOSE a log entry, and the panel files it via /api/lex-feedback after the
 * user confirms.
 */
import { helpKnowledgeText, type HelpSection } from "./lex-help-knowledge";

export const HELP_LABEL = "Lex Assist (AI). Product help only, not legal advice.";
export type HelpOffer = { type: "bug" | "idea" | "question"; summary: string };

/**
 * Legal intent. Product words (Lex, review, page, draft, matter...) NEVER override these: a legal question
 * asked "in the review page" is still a legal question and gets the fixed refusal.
 */
const LEGAL_PATTERNS: RegExp[] = [
  /\benforceab|\bunenforceab|\bbinding\b|\bvalid (contract|clause|will|agreement)|\bvoid(able)?\b/i,
  /\bliab(le|ility)\b|\bsu(e|ed|ing)\b|\bcompensation\b|\bdamages\b|\bnegligen/i,
  /\bevict|\bbond\b|\bindemnit|\bbreach(ed|es)?\b|\bterminat(e|ion) (my|the|an|a) (lease|contract|employ)/i,
  /\bis (it|this|that) (legal|lawful|allowed)\b|\b(un)?lawful\b|\blegally\b|\billegal\b/i,
  /\bam i (allowed|entitled|required)\b|\bcan i (legally )?(sue|claim|evict|keep|refuse|break)|\bdo i have to\b/i,
  /\b(my|their|our|his|her|tenant'?s?|employee'?s?|consumer) rights\b|\brights (of|as) (a|an|the)\b/i,
  /\bcan (a|an|the|my) (landlord|tenant|employer|employee|boss|company|council|seller|buyer|executor|trustee|director)\b/i,
  /\blimitation period\b|\bstatute\b|\bcase law\b|\bprecedent\b|\b(section|s\.?)\s*\d+[a-z]?\b.*\b(act|mean|apply)/i,
  /\bshould (i|we|my client)\b|\bmy client\b|\blegal (advice|opinion|position)\b|\badvise (me|us|whether)\b/i,
  /\b(court|tribunal|ncat|qcat|vcat|fair work)\b|\bcustody\b|\bdivorce\b|\bvisa\b|\bwill (and|or) estate\b|\bverbal contract\b/i,
];
/** Prompt injection / role games: always refused. */
const INJECTION = /\b(ignore|disregard|forget|override)\b.{0,40}\b(instructions?|rules?|prompts?|guidelines?)\b|\bsystem prompt\b|\bjailbreak\b|\bdeveloper mode\b|\bpretend (to be|you are)\b|\bact as (a |an |my )?(lawyer|solicitor|barrister)\b|\byou are now\b/i;

/** True when the question must get the fixed refusal (legal intent or an injection attempt). */
export function isLegalQuestion(text: string): boolean {
  return INJECTION.test(text) || LEGAL_PATTERNS.some((re) => re.test(text));
}

/** Post-answer check: does the model's answer itself read like legal advice? */
const ADVICE_OUT: RegExp[] = [
  /\byou (can|cannot|can't|may|may not|should|must|are (likely )?(able|entitled|liable)) (to )?(sue|claim|evict|keep|terminate|recover|withhold|refuse)\b/i,
  /\b(is|are|would be|likely) (un)?enforceable\b|\b(is|would be) (legally )?binding\b|\b(is|would be) (liable|negligent|in breach)\b/i,
  /\bunder (the )?[A-Z][A-Za-z ]{2,60} Act\b|\bsection \d+[A-Z]? of\b|\blimitation period (is|of)\b/i,
  /\byou (have|may have) a (strong |good |valid )?(case|claim)\b|\bmy (legal )?advice\b|\bthe law (says|requires|allows)\b/i,
];
export function looksLikeLegalAdvice(answer: string): boolean {
  return ADVICE_OUT.some((re) => re.test(answer));
}

export const LEGAL_REFUSAL = "I'm Lex Assist, so I can only help with using Lex, not give legal advice. For a legal question, use Research in Lex, and have a lawyer check the answer before relying on it.";

/** sections: retrieved help (default all); context: current screen and the signed-in firm only. */
export function helpSystemPrompt(sections?: HelpSection[], context?: string): string {
  return `You are Lex Assist, an AI that helps Australian law firm staff use the Lex app. You are not a lawyer.
Rules:
- Answer only from the HELP below about Lex screens, features, billing, terms and privacy. If the HELP does not cover it, say you don't know and suggest Contact Saabai or hello@saabai.ai. Never invent features, prices or policies.
- Never give legal advice, never interpret law, cases or a client's situation. Point legal questions to Research in Lex.
- Keep answers short and plain. No markdown, no asterisks, no em dashes.
- If the user describes a problem, error or something not working, or wishes Lex did something it doesn't, offer to log it for the Saabai team, and end your reply with exactly one line:
OFFER|<bug or idea or question>|<one sentence summary without any names, emails or client details>
Use idea for any feature request or wish, bug for something broken, question for something the HELP could not answer. Never say it has been logged: the user must confirm first.

- For any question about price or cost, answer exactly: Pricing is set after the trial, and you'll see the full price, GST and terms before you pay anything. Never state a price figure.
- CONTEXT is about the signed-in user's own firm only. Use it to answer about their plan, trial or usage today. Never guess other firms' details.

CONTEXT:
${context ?? "Current screen: unknown"}

HELP:
${helpKnowledgeText(sections)}`;
}

/** Splits the model reply into visible text and an optional offer line. */
export function parseHelpReply(raw: string): { reply: string; offer: HelpOffer | null } {
  let offer: HelpOffer | null = null;
  const lines = raw.split("\n").filter((l) => {
    const m = l.trim().match(/^OFFER\|(bug|idea|question)\|(.{5,300})$/i);
    if (m && !offer) { offer = { type: m[1].toLowerCase() as HelpOffer["type"], summary: m[2].trim() }; return false; }
    return !/^OFFER\|/i.test(l.trim());
  });
  return { reply: lines.join("\n").replace(/\*\*?/g, "").replace(/\s—\s|—/g, ", ").trim(), offer };
}

export type HelpMsg = { role: "user" | "assistant"; content: string };
/**
 * Client-supplied assistant turns are DROPPED (they could be forged). The model sees only the user's own
 * recent questions (last 6, 2000 characters each), joined into one user turn.
 */
export function normaliseHelpMessages(raw: unknown): HelpMsg[] {
  if (!Array.isArray(raw)) return [];
  const qs = raw.flatMap((m) => {
    const r = (m as { role?: unknown })?.role, c = (m as { content?: unknown })?.content;
    return r === "user" && typeof c === "string" && c.trim() ? [c.slice(0, 2000)] : [];
  }).slice(-6);
  if (!qs.length) return [];
  // Earlier legal or injection questions are not carried as context.
  for (let i = qs.length - 2; i >= 0; i--) if (isLegalQuestion(qs[i])) qs.splice(i, 1);
  const last = qs[qs.length - 1];
  const earlier = qs.slice(0, -1);
  return [{ role: "user", content: earlier.length ? `Earlier questions in this help chat:\n${earlier.map((q) => `- ${q}`).join("\n")}\n\nCurrent question:\n${last}` : last }];
}
export function latestQuestion(raw: unknown): string {
  if (!Array.isArray(raw)) return "";
  for (let i = raw.length - 1; i >= 0; i--) {
    const m = raw[i] as { role?: unknown; content?: unknown };
    if (m?.role === "user" && typeof m.content === "string") return m.content.slice(0, 2000);
  }
  return "";
}
