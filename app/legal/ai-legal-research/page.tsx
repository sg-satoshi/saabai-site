import type { Metadata } from "next";
import TopicPage, { type Topic } from "../_topic/TopicPage";
import { publicPageMeta } from "@/lib/seo-pages";

export const metadata: Metadata = publicPageMeta.legalResearch;

const t: Topic = {
  path: "/legal/ai-legal-research",
  crumb: "AI legal research",
  h1: "AI legal research for Australian law firms, with cited sources",
  lead: "Lex searches public Australian government sources, including ATO rulings and interpretive decisions, the Federal Register of Legislation, ASIC and the Fair Work Commission, and cites every source it uses so you can check it.",
  does: [
    "Legal research included",
    "Citations and links to each source used",
    "Checks whether an Act is in force on the Federal Register of Legislation",
    "Checks case citations against a licensed snapshot of NSW Caselaw, Federal Court and High Court decisions (cutoff 10 March 2025)",
    "Client details masked before the AI sees them",
  ],
  doesNot: [
    "Search live case law, or courts outside the licensed snapshot",
    "Give legal advice or replace checking primary sources",
  ],
  faqs: [
    { q: "Which sources does Lex search?", a: "Public Australian government sources: ATO rulings and interpretive decisions, the Federal Register of Legislation, ASIC and the Fair Work Commission. Case citations are checked against a licensed snapshot of NSW Caselaw, Federal Court and High Court decisions, cutoff 10 March 2025." },
    { q: "Is legal research included?", a: "Yes. Legal research is included, plus 20 documents a month and 3 lawyer seats. Start with a 60-day free trial, no card needed. Pricing is set after the trial." },
    { q: "Can I rely on Lex answers without checking?", a: "No. Lex provides research assistance only, not legal advice. Always check the primary sources it cites before advising a client." },
    { q: "Is it good for tax and ATO work?", a: "Lex searches ATO rulings and interpretive decisions alongside Commonwealth legislation, so it suits objections, reviews and ruling research." },
  ],
};

export default function Page() {
  return <TopicPage t={t} />;
}
