/**
 * Mia's approved offers: the ONLY place Mia may take prices, inclusions,
 * timeframes and policies from. Checked against the live saabai.ai pages
 * (/blueprint, /websites, /services, /faq) on 19 Oct 2026.
 *
 * Blueprint tiers come straight from lib/blueprint.ts (the same data the
 * checkout uses), so Mia can never drift from what people are charged.
 * Website plans mirror app/websites/page.tsx; tests/mia-offers.test.ts fails
 * if that page and this file disagree.
 *
 * Saabai is not GST registered: always "GST not applicable".
 */
import { TIERS, TIER_ORDER } from "./blueprint";
import { formatAud } from "./money";

export const SITE = "https://www.saabai.ai";
export const LINKS = {
  score: `${SITE}/score`,
  blueprint: `${SITE}/blueprint`,
  websites: `${SITE}/websites`,
  services: `${SITE}/services`,
  faq: `${SITE}/faq`,
  booking: "https://calendly.com/shanegoldberg/30min",
} as const;

export const GST_LINE = "All prices are in Australian dollars (AUD). GST not applicable.";

export const WEBSITE_PLANS = [
  {
    name: "Presence",
    build: 2000,
    monthly: 100,
    summary:
      "A polished, fast website with a trained enquiry chatbot that answers FAQs, lead capture straight to your inbox, hosting, security and updates included.",
  },
  {
    name: "Growth",
    build: 4000,
    monthly: 200,
    summary:
      "Everything in Presence, on a larger or rebuilt site, with a lead-qualifying chatbot that books calls and hands off to your CRM or inbox, plus light workflow automations.",
  },
  {
    name: "Signature",
    build: 6500,
    monthly: 300,
    summary:
      "Everything in Growth, plus a custom AI avatar trained to look and sound like the persona you choose.",
  },
] as const;

const aud = formatAud;

/** Prompt block listing every approved price and policy. */
export function renderOffersForPrompt(): string {
  const tiers = TIER_ORDER.map((id) => {
    const t = TIERS[id];
    return `  - **${t.name}: ${t.priceLabel} one-off.** ${t.who} ${t.short}. Delivered in ${t.delivery}. Includes: ${t.features.join("; ")}.`;
  }).join("\n");
  const sites = WEBSITE_PLANS.map(
    (p) => `  - **${p.name}: from ${aud(p.build)} one-off build, then ${aud(p.monthly)}/month care.** ${p.summary}`,
  ).join("\n");

  return `## Approved Offers (the ONLY prices and promises you may give)

${GST_LINE}

**1. Free AI Readiness Score** (best first step for most people)
  - Free. 12 quick questions, about 3 minutes. Gives a personalised result showing where AI could save them time.
  - Link: ${LINKS.score}

**2. Saabai Blueprint** (fixed-price AI plan, ranked by hours and dollars saved). Link: ${LINKS.blueprint}
${tiers}
  - 30 day credit: book any Saabai build within 30 days of receiving the Blueprint and the full Blueprint fee comes off the build invoice. Credit applies to implementation costs only, not care plans or monthly fees. Any unused credit expires after 30 days.
  - Refund: if we have not started the analysis, a full refund. They just reply to their confirmation email.
  - After checkout there is a short online fact-find (about 15 minutes).

**3. Websites with care plans** (every plan includes a trained AI enquiry chatbot). Link: ${LINKS.websites}
${sites}
  - Hosting, security, updates and small changes are included in the monthly care plan.

**4. Custom AI agents, chatbots and automations** (beyond the website plans)
  - No published price. Builds are quoted after a Blueprint, based on scope. Never estimate a number.

**5. Free 30 minute call with Shane** (founder). No obligation. Link: ${LINKS.booking}

Business details you may share: Saabai, founded by Shane Goldberg, Gold Coast, Queensland. Works Australia-wide online.
`;
}
