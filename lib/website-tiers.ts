/**
 * Published website packages (AUD, GST not applicable).
 * /websites, the homepage, Mia and the care-plan schema all read this list.
 */
import { formatAud } from "./money";

export { formatAud };

export type WebsiteTier = {
  name: "Presence" | "Growth" | "Signature";
  tagline: string;
  /** One-off build, starting price in AUD. */
  buildFrom: number;
  /** Monthly care in AUD. Hosting, care and a trained enquiry chatbot are included. */
  monthly: number;
  priceNote: string;
  description: string;
  features: readonly string[];
  /** Homepage package-card bullets. Each one is also a feature on /websites. */
  homePoints: readonly string[];
  highlight: boolean;
};

/**
 * Split testing for client sites. Per Shane's 17 Oct 2026 rule it is a paid add-on, switched on per site after
 * his approval, never free. Draft offer: Growth and Signature only (Presence sites rarely have the traffic).
 */
export const SPLIT_TESTING = {
  name: "Split Testing Optimisation Machine",
  tierFeature: "Split Testing Optimisation Machine add-on",
  tiers: ["Growth", "Signature"] as readonly WebsiteTier["name"][],
} as const;

export const WEBSITE_TIERS: readonly WebsiteTier[] = [
  {
    name: "Presence",
    tagline: "Get online with an AI that answers",
    buildFrom: 2000,
    monthly: 100,
    priceNote: "one-off build",
    description:
      "A polished, fast website built for your business, with a trained enquiry chatbot that answers common questions and captures every lead.",
    features: [
      "Custom site designed for your business",
      "Fast, mobile, SEO and AI search ready out of the box",
      "Google reviews carousel showing your real reviews",
      "AI information gathering and a basic training session before we build",
      "Trained enquiry chatbot that answers FAQs",
      "Lead capture straight to your inbox",
      "Hosting, security and updates included",
    ],
    homePoints: [
      "Trained enquiry chatbot that answers FAQs",
      "Google reviews carousel showing your real reviews",
      "Hosting, security and updates included",
    ],
    highlight: false,
  },
  {
    name: "Growth",
    tagline: "For businesses that want the site to sell",
    buildFrom: 4000,
    monthly: 200,
    priceNote: "one-off build",
    description:
      "Everything in Presence, on a larger or rebuilt site, with a chatbot that qualifies leads, books calls and hands off to your CRM.",
    features: [
      "Everything in Presence",
      "Larger site, or a full rebuild of your current one",
      "Lead qualifying chatbot with booking",
      "Handoff to your CRM or inbox",
      "Light workflow automations",
      "Split Testing Optimisation Machine add-on",
    ],
    homePoints: [
      "Everything in Presence",
      "Lead qualifying chatbot with booking",
      "Handoff to your CRM or inbox",
      "Split Testing Optimisation Machine add-on",
    ],
    highlight: true,
  },
  {
    name: "Signature",
    tagline: "Your brand, with an AI that sounds like you",
    buildFrom: 6500,
    monthly: 300,
    priceNote: "one-off build",
    description:
      "Everything in Growth, plus a custom avatar trained to look and sound like the persona you choose, with deeper automations and priority support.",
    features: [
      "Everything in Growth",
      "Custom avatar trained to your chosen persona",
      "Looks and sounds like your brand voice",
      "Workflow automations across your enquiries",
      "Priority support",
      "Split Testing Optimisation Machine add-on",
    ],
    homePoints: [
      "Everything in Growth",
      "Custom avatar trained to your chosen persona",
      "Priority support",
      "Split Testing Optimisation Machine add-on",
    ],
    highlight: false,
  },
];

/** Big price on /websites, e.g. "from $2,000". */
export function websiteBuildPrice(tier: WebsiteTier): string {
  return `from ${formatAud(tier.buildFrom)}`;
}

/** Care line on /websites, e.g. "then $100/mo care". */
export function websiteMonthlyCare(tier: WebsiteTier): string {
  return `then ${formatAud(tier.monthly)}/mo care`;
}

/** Note under the homepage package price. */
export function websiteHomeCareNote(tier: WebsiteTier): string {
  return `from, AUD, then ${formatAud(tier.monthly)}/mo care`;
}

/** One homepage Web Solutions bullet per tier. */
export function websiteOfferLine(tier: WebsiteTier): string {
  const avatar = tier.features.some((feature) => /custom avatar/i.test(feature));
  const price = `${tier.name} from ${formatAud(tier.buildFrom)} + ${formatAud(tier.monthly)}/mo`;
  return avatar ? `${price}, with a custom avatar` : price;
}

function joinAnd(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** FAQ answer on /websites. Prices come from WEBSITE_TIERS. */
export function websiteCareFaqAnswer(): string {
  const monthly = joinAnd(WEBSITE_TIERS.map((tier) => `${tier.name} is ${formatAud(tier.monthly)} a month`));
  const builds = joinAnd(WEBSITE_TIERS.map((tier) => formatAud(tier.buildFrom)));
  return `${monthly} (AUD). Builds start from ${builds} respectively. Not sure which fits? Take the free AI score at saabai.ai/score or book a free consult.`;
}

function tierMentionsChatbot(tier: WebsiteTier, seen = new Set<string>()): boolean {
  if (seen.has(tier.name)) return false;
  seen.add(tier.name);
  const own = [tier.description, ...tier.features].join("\n");
  if (/chatbot/i.test(own)) return true;
  const parentName = tier.features
    .find((feature) => feature.startsWith("Everything in "))
    ?.slice("Everything in ".length);
  const parent = WEBSITE_TIERS.find((item) => item.name === parentName);
  return parent ? tierMentionsChatbot(parent, seen) : false;
}

for (const tier of WEBSITE_TIERS) {
  if (tier.features.includes(SPLIT_TESTING.tierFeature) !== SPLIT_TESTING.tiers.includes(tier.name)) {
    throw new Error(`${tier.name} split testing feature does not match SPLIT_TESTING.tiers`);
  }
  for (const point of tier.homePoints) {
    if (!tier.features.includes(point)) {
      throw new Error(`${tier.name} homepage point is not a /websites feature: ${point}`);
    }
  }
  if (!tierMentionsChatbot(tier)) {
    throw new Error(`${tier.name} does not include a trained enquiry chatbot`);
  }
}
