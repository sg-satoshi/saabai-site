import type { KnowledgePack } from "./core";

const LLMS = "https://www.saabai.ai/llms.txt";

/** Pilot pack for saabai.ai. Facts copied from the live llms.txt (30 Oct 2026). Status draft until Shane approves. */
export const SAABAI_PACK: KnowledgePack = {
  slug: "saabai",
  name: "Saabai",
  status: "draft",
  lastChecked: "2026-10-30",
  basics: [
    { text: "Saabai is a Gold Coast, Queensland business founded by Shane Goldberg.", source: LLMS },
    { text: "All prices are in AUD. Saabai is not GST registered.", source: LLMS },
    { text: "Service areas: Gold Coast, Brisbane, Queensland and Australia-wide online.", source: LLMS },
    { text: "Contact: hello@saabai.ai. We usually reply within 1 business day.", source: LLMS },
  ],
  services: [
    { text: "Website care plans: Presence $100/month, Growth $200/month, Signature $300/month. Builds from $2,000, $4,000 and $6,500.", source: "https://www.saabai.ai/websites" },
    { text: "Saabai Blueprint AI audit: Starter $497, Pro $1,497, Business $3,500.", source: "https://www.saabai.ai/blueprint" },
    { text: "Free AI Readiness Score: a free 12 question quiz with an instant score.", source: "https://www.saabai.ai/score" },
    { text: "Lex: an AI legal assistant for Australian law firms. The Firm plan is $299 a month.", source: "https://www.saabai.ai/legal" },
  ],
  faqs: [
    { q: "Is the Blueprint free?", a: "No. The Blueprint starts at $497. The AI Readiness Score is the free option.", source: "https://www.saabai.ai/blueprint" },
    { q: "Can I cancel a care plan?", a: "Yes, any time by emailing hello@saabai.ai. It ends at the end of the period already paid for.", source: "https://www.saabai.ai/terms" },
    { q: "How fast do you reply?", a: "We usually reply within 1 business day.", source: LLMS },
  ],
  mustNotSay: ["Do not promise search rankings, traffic or sales results.", "Do not quote prices that are not listed here."],
};
