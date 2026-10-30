/**
 * Lex help assistant: prompt, reply parsing and routing. The model call itself is in
 * app/api/lex-help/route.ts through LexGateway (masking, fail closed). Nothing here files feedback:
 * the model may only PROPOSE a log entry, and the panel files it via /api/lex-feedback after the
 * user confirms.
 */
import { helpKnowledgeText } from "./lex-help-knowledge";

export const HELP_LABEL = "Lex help assistant (AI). Product help only, not legal advice.";
export type HelpOffer = { type: "bug" | "idea" | "question"; summary: string };

const LEGAL = /\b(advise|advice|should (i|my client|we)|is it legal|can (i|we|my client) (sue|claim|evict|terminate)|limitation period|liable|liability|statute|case law|precedent|interpret (the|this|section)|what does (section|s\.?)\s*\d+|my client|court|tribunal|contract (clause|term) mean|estate|custody|visa)\b/i;

/** True when the question is a legal question rather than product help. Routes to a fixed refusal. */
export function isLegalQuestion(text: string): boolean {
  return LEGAL.test(text) && !/\b(lex|button|screen|export|draft|review|matter|upload|login|password|billing|invoice|seat|feature|bug|error|page)\b/i.test(text);
}

export const LEGAL_REFUSAL = "I'm the Lex help assistant, so I can only help with using Lex, not give legal advice. For a legal question, use Research in Lex, and have a lawyer check the answer before relying on it.";

export function helpSystemPrompt(): string {
  return `You are the Lex help assistant, an AI that helps Australian law firm staff use the Lex app. You are not a lawyer.
Rules:
- Answer only from the HELP below about Lex screens, features, billing, terms and privacy. If the HELP does not cover it, say you don't know and suggest Contact Saabai or hello@saabai.ai. Never invent features, prices or policies.
- Never give legal advice, never interpret law, cases or a client's situation. Point legal questions to Research in Lex.
- Keep answers short and plain. No markdown, no asterisks, no em dashes.
- If the user describes a problem, error or something not working, or wishes Lex did something it doesn't, offer to log it for the Saabai team, and end your reply with exactly one line:
OFFER|<bug or idea or question>|<one sentence summary without any names, emails or client details>
Use idea for any feature request or wish, bug for something broken, question for something the HELP could not answer. Never say it has been logged: the user must confirm first.

HELP:
${helpKnowledgeText()}`;
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
export function normaliseHelpMessages(raw: unknown): HelpMsg[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(-12).flatMap((m) => {
    const r = (m as { role?: unknown })?.role, c = (m as { content?: unknown })?.content;
    return (r === "user" || r === "assistant") && typeof c === "string" && c.trim() ? [{ role: r, content: c.slice(0, 2000) }] : [];
  });
}
