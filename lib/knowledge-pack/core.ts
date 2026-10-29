/**
 * Knowledge pack (#314 steps 2-4 prep). Off by default via KNOWLEDGE_PACK_ENABLED.
 * One typed pack per client feeds the chatbot prompt, FAQ page and llms.txt section.
 * Every fact carries a source. Nothing here is live until the flag is on (needs Shane's go).
 */
export const KNOWLEDGE_PACK_FLAG = "KNOWLEDGE_PACK_ENABLED";
export const knowledgePackEnabled = (env: Record<string, string | undefined> = process.env) => ["1", "true"].includes((env[KNOWLEDGE_PACK_FLAG] ?? "").trim().toLowerCase());

export interface PackFact { text: string; source: string }
export interface PackFaq { q: string; a: string; source: string }
export interface KnowledgePack {
  slug: string;
  name: string;
  status: "draft" | "client-approved" | "live";
  lastChecked: string;
  basics: PackFact[];
  services: PackFact[];
  faqs: PackFaq[];
  mustNotSay: string[];
}

const DASH_RE = /[\u2013\u2014]/;

/** Problems that block a pack going live: missing sources, em dashes, empty fields. */
export function validatePack(p: KnowledgePack): string[] {
  const errs: string[] = [];
  const all = [...p.basics, ...p.services, ...p.faqs.map((f) => ({ text: `${f.q} ${f.a}`, source: f.source }))];
  for (const f of all) {
    if (!f.text.trim()) errs.push("empty fact");
    if (!/^https:\/\//.test(f.source)) errs.push(`no source: ${f.text.slice(0, 40)}`);
    if (DASH_RE.test(f.text)) errs.push(`dash: ${f.text.slice(0, 40)}`);
  }
  for (const s of p.mustNotSay) {
    if (!s.trim()) errs.push("empty mustNotSay");
    if (DASH_RE.test(s)) errs.push(`dash in mustNotSay: ${s.slice(0, 40)}`);
  }
  return errs;
}

export function packPrompt(p: KnowledgePack): string {
  return [
    `## Knowledge pack: ${p.name} (checked ${p.lastChecked})`,
    "Use only these facts for business details. If something is not here, say you will check and offer a call.",
    ...p.basics.map((f) => `- ${f.text}`),
    "### Services",
    ...p.services.map((f) => `- ${f.text}`),
    "### FAQs",
    ...p.faqs.map((f) => `- Q: ${f.q} A: ${f.a}`),
    "### Do not say",
    ...p.mustNotSay.map((s) => `- ${s}`),
  ].join("\n");
}

export function packFaqItems(p: KnowledgePack): { q: string; a: string }[] {
  return p.faqs.map(({ q, a }) => ({ q, a }));
}

export function packLlmsSection(p: KnowledgePack): string {
  return ["## Quick answers", "", ...p.faqs.map((f) => `- ${f.q} ${f.a}`)].join("\n");
}
