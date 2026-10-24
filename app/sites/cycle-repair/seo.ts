import { tiers, additionalServiceWork, specialist } from "./services";
import { googleRating, googleReviewCount } from "./reviews";

export const SITE_URL = "https://stuscyclerepairs.com";

export const FACEBOOK_URL = "https://www.facebook.com/140958506038130";

/** Region only. Never add a street address. */
export const AREA_SERVED = [
  { "@type": "Place" as const, name: "Gold Coast, Queensland, Australia" },
  { "@type": "Place" as const, name: "Tweed Coast, New South Wales, Australia" },
  { "@type": "Place" as const, name: "Northern Rivers, NSW" },
];

export const COVERAGE_LINE = "from the Northern Rivers to Coomera and Ormeau";

export const SUBURB_GROUPS: Array<{ name: string; suburbs: string[] }> = [
  {
    name: "Central",
    suburbs: ["Southport", "Labrador", "Surfers Paradise", "Broadbeach", "Ashmore", "Nerang", "Robina", "Varsity Lakes", "Mudgeeraba"],
  },
  {
    name: "Southern",
    suburbs: ["Burleigh Heads", "Miami", "Palm Beach", "Elanora", "Currumbin", "Tugun", "Coolangatta", "Tweed Heads"],
  },
  {
    name: "Northern",
    suburbs: ["Coomera", "Upper Coomera", "Helensvale", "Hope Island", "Oxenford", "Pimpama", "Ormeau"],
  },
  {
    name: "Tweed Coast and Northern Rivers",
    suburbs: ["Tweed Heads", "Kingscliff", "Cabarita Beach", "Pottsville", "Murwillumbah", "Northern Rivers NSW"],
  },
];

/** Every indexable page on stuscyclerepairs.com. Keep in sync with real routes. */
export const SITEMAP_PATHS: Array<{ path: string; priority: number; changeFrequency: "weekly" | "monthly" }> = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/gold-coast", priority: 0.9, changeFrequency: "monthly" },
  { path: "/e-bike-repair-gold-coast", priority: 0.8, changeFrequency: "monthly" },
  { path: "/puncture-repair-gold-coast", priority: 0.8, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.7, changeFrequency: "monthly" },
  { path: "/quote", priority: 0.7, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.6, changeFrequency: "monthly" },
];

export const faqs: Array<{ q: string; a: string }> = [
  {
    q: "Where does Stu service bikes?",
    a: "Stu travels from the Northern Rivers to Coomera and Ormeau. He services bikes at your home or at work across the Gold Coast, the Tweed Coast and the Northern Rivers, NSW.",
  },
  {
    q: "Do I need to bring my bike to a shop?",
    a: "No. Stu arrives with a fully equipped mobile workshop and services your bike while you work, train or rest. For complex rebuilds, wheel builds or boxed bike assembly, he can collect your bike and return it test-ridden.",
  },
  {
    q: "What does a bike service cost?",
    a: "Servicing starts at $119 for the Bronze Safety Check, $189 for the Silver Essential Tune, $249 for the Gold Road service and $349 for the Gold MTB service. Parts are not included. The full price list is on the home page.",
  },
  {
    q: "What is included in each service?",
    a: "Bronze covers lubrication, gear and brake adjustment, wheel true and spoke tension check, headset, bottom bracket and hub adjustment, a torque check on all bolts and a test ride. Silver adds removing and cleaning the drive train and bottom bracket. Gold Road adds removing, re-greasing and reinstalling the hubs, bottom bracket and headset. Gold MTB adds a brake bleed and a check of the front and back shocks.",
  },
  {
    q: "Are parts included in the price?",
    a: "No. Service prices cover labour only, and parts are extra. Some jobs, such as glue for singles or sealant for tubeless tyres, are also charged separately.",
  },
  {
    q: "Is there a call-out fee?",
    a: "There is a $70 call-out fee for repairs under $120.",
  },
  {
    q: "Can Stu work on e-bikes?",
    a: "Yes. Stu works on all e-bike brands, with diagnostics and servicing for motors, drivetrains, brakes and firmware checks. E-bike servicing is $149 to $299, and e-bike wheel builds are $159 per end.",
  },
  {
    q: "Do you service kids' bikes?",
    a: "Yes. A service for a kid's bike up to 20 inch is $59.",
  },
  {
    q: "How much experience does Stu have?",
    a: "Stu has 37 years of experience as a bike mechanic, working on everything from carbon race bikes to daily commuters and e-bikes.",
  },
  {
    q: "How do I book?",
    a: "Call Stu on 0405 225 721, email stuscyclerepairs@gmail.com, or use the quote form on this website. If you are not sure whether Stu covers your suburb, send an enquiry and he will let you know.",
  },
  {
    q: "Which suburbs does Stu cover?",
    a: "Stu covers central, southern and northern Gold Coast suburbs, plus the Tweed Coast and Northern Rivers, from the Northern Rivers to Coomera and Ormeau. The suburb list is on the Gold Coast page, and if yours is not listed, call 0405 225 721.",
  },
  {
    q: "How much does a puncture repair cost?",
    a: "Fitting a tyre or tube is $20 per wheel. A rear fat e-bike tube is $70, and there is a $70 call-out fee for repairs under $120.",
  },
  {
    q: "Does Stu work on all e-bike brands?",
    a: "Yes. Stu works on all e-bike brands. E-bike servicing is $149 to $299, and e-bike wheel builds are $159 per end.",
  },
  {
    q: "Does Stu cover the Northern Rivers?",
    a: "Yes. Stu travels from the Northern Rivers to Coomera and Ormeau, including the Tweed Coast. Towns include Tweed Heads, Kingscliff, Cabarita Beach, Pottsville and Murwillumbah.",
  },
];

function priceLines(): string[] {
  return tiers.map((t) => `- ${t.name} (${t.tag}): ${t.price}`);
}

export function llmsSummary(): string {
  return `# Stu's Cycle Repairs

> Stu's Cycle Repairs is a mobile bicycle mechanic. Stu has 37 years of experience and travels to customers' homes or workplaces from the Northern Rivers to Coomera and Ormeau, with a fully equipped mobile workshop.

## Key facts
- Business: Stu's Cycle Repairs (mobile bike mechanic, no shopfront visits needed)
- Service area: from the Northern Rivers to Coomera and Ormeau, including the Gold Coast, Queensland, the Tweed Coast, and the Northern Rivers, NSW
- Phone: 0405 225 721
- Email: stuscyclerepairs@gmail.com
- Website: ${SITE_URL}
- Google rating: ${googleRating} from ${googleReviewCount} Google reviews

## Service prices (AUD, labour only, parts not included)
${priceLines().join("\n")}
- Call-out fee for repairs under $120: $70
- E-bike servicing: $149-$299
- Kid's bike service (up to 20"): $59

## Pages
- [Home, services and prices](${SITE_URL}/)
- [Mobile bike repairs on the Gold Coast](${SITE_URL}/gold-coast)
- [E-bike repair on the Gold Coast](${SITE_URL}/e-bike-repair-gold-coast)
- [Puncture repair on the Gold Coast](${SITE_URL}/puncture-repair-gold-coast)
- [FAQ](${SITE_URL}/faq)
- [Get a quote](${SITE_URL}/quote)
- [Contact Stu](${SITE_URL}/contact)
- [Full details for AI assistants](${SITE_URL}/llms-full.txt)
`;
}

export function llmsFull(): string {
  const extra = additionalServiceWork.map((l) => `- ${l.label}: ${l.price}`).join("\n");
  const spec = specialist.map((l) => `- ${l.label}: ${l.price}`).join("\n");
  const tierText = tiers
    .map((t) => `### ${t.name} (${t.tag}), ${t.price}\n${t.items.map((i) => `- ${i}`).join("\n")}`)
    .join("\n\n");
  const faqText = faqs.map((f) => `**${f.q}**\n${f.a}`).join("\n\n");
  return `${llmsSummary()}
## Service tiers
${tierText}

## Additional service work
${extra}

## Specialist care
${spec}

## FAQ
${faqText}
`;
}
