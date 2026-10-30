import type { Metadata } from "next";
import TopicPage, { type Topic } from "../_topic/TopicPage";
import { publicPageMeta } from "@/lib/seo-pages";

export const metadata: Metadata = publicPageMeta.legalTrustDeeds;

const t: Topic = {
  path: "/legal/ai-trust-deed-drafting",
  crumb: "AI trust deed drafting",
  h1: "AI trust deed drafting for Australian law firms",
  lead: "Lex drafts discretionary (family) trust deeds, unit trust deeds and annual trust distribution resolutions from structured instructions, with notes on the Commonwealth tax rules and state stamp duty positions, and a QA pass on every draft.",
  does: [
    "Discretionary (family) trust deeds",
    "Unit trust deeds",
    "Trust distribution resolutions (minutes), including optional streaming",
    "Flags relevant tax provisions and state duty notes for the lawyer to confirm",
    "QA check on every draft, exported to Word",
  ],
  doesNot: [
    "Give legal or tax advice, or confirm a deed is effective",
    "Stamp, sign or lodge anything",
    "Replace review by a lawyer and the client's accountant",
  ],
  faqs: [
    { q: "Can Lex draft a discretionary trust deed?", a: "Yes. Lex drafts discretionary (family) trust deeds from your instructions, with notes on relevant Commonwealth tax provisions and state stamp duty. A lawyer must review and finalise the deed." },
    { q: "Does Lex draft unit trust deeds?", a: "Yes. Unit trust deeds are a built-in document type." },
    { q: "Can Lex prepare trust distribution resolutions?", a: "Yes. Lex drafts trustee resolutions appointing the income of a discretionary trust for a financial year, including optional streaming of capital gains and franked distributions. They must be checked against the trust deed and by the accountant or lawyer." },
    { q: "Is a Lex draft legal advice?", a: "No. Lex provides drafting assistance only, not legal advice. Every draft must be reviewed by a lawyer before it is used." },
    { q: "How much does it cost?", a: "The Firm plan is $299 a month (AUD, GST not applicable) for 3 lawyer seats, unlimited legal research and 20 documents a month. Book a free 30-minute demo to see it on your own matters." },
  ],
};

export default function Page() {
  return <TopicPage t={t} />;
}
