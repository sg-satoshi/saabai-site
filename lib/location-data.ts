/**
 * Location data: single source of truth for the Queensland city SEO pages (Gold Coast and Brisbane).
 *
 * Each LocationConfig drives the entire content of one /[city] landing page,
 * rendered by the shared LocationPage component. Content is written to be
 * genuinely unique per city so each page reads as a standalone resource.
 *
 * Canonical domain: https://www.saabai.ai
 */

const BASE_URL = "https://www.saabai.ai";

export interface LocationFaq {
  q: string;
  a: string;
}

export interface LocationCaseStudy {
  client: string;
  industry: string;
  context: string;
  outcome: string;
}

export interface LocationIndustryLink {
  /** e.g. "Website Care Plans" */
  industry: string;
  /** e.g. "/websites" */
  href: string;
  /** City-specific 1-2 sentence description for use as contextual link text */
  context: string;
}

export interface LocationConfig {
  city: string;
  slug: string;
  state: string;
  stateCode: string;
  heroHeadline: string;
  heroSubheading: string;
  /** Optional price line under the headline. Published prices only. */
  heroPrice?: string;
  industries: string[];
  /** 3-4 paragraphs, ~80-120 words each */
  marketContext: string[];
  challengesIntro: string;
  /** 5 per city */
  challenges: Array<{ title: string; detail: string }>;
  howWeHelpIntro: string;
  /** 6 per city */
  services: Array<{ title: string; detail: string }>;
  caseStudy: LocationCaseStudy;
  /** 3 per city, linking to existing industry pages */
  industryLinks: LocationIndustryLink[];
  /** 7 per city, genuinely city-specific questions */
  faqs: LocationFaq[];
  ctaHeadline: string;
  ctaSubtext: string;
  /** Extra block when a city page needs a topic the shared services list does not cover. */
  spotlight?: {
    eyebrow: string;
    title: string;
    paragraphs: string[];
    linkHref: string;
    linkLabel: string;
  };
  /** Visible breadcrumb and BreadcrumbList label. Defaults to "Websites and AI {city}". */
  breadcrumbName?: string;
  /** Service schema name. Defaults to "Websites and AI automation in {city}". */
  serviceName?: string;
  /** ISO date for the WebPage dateModified node. */
  dateModified?: string;
  seo: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    canonical: string;
  };
}

// ---------------------------------------------------------------------------
// BRISBANE
// ---------------------------------------------------------------------------
export const BRISBANE: LocationConfig = {
  city: "Brisbane",
  slug: "brisbane",
  state: "Queensland",
  stateCode: "QLD",
  heroHeadline: "Websites and AI systems for Brisbane small businesses",
  heroPrice: "Websites from $2,000 plus $100 a month.",
  heroSubheading:
    "From growth-corridor trades in Logan and Moreton Bay to CBD practices, we build, host and manage websites that win work, and map exactly where AI can take the admin off your plate with a Saabai Blueprint.",
  industries: [
    "Clinics & Local Services",
    "Construction & Trades",
    "Manufacturing",
    "Technology",
    "Property & Real Estate",
    "Growth Corridor Businesses",
  ],
  marketContext: [
    "Brisbane is in the middle of a once-in-a-generation build-up. With the 2032 Olympics anchoring more than a decade of infrastructure and venue investment, the city's construction, professional services and property sectors are expanding faster than most local teams can hire. That growth is good news, but it also means more quoting, more compliance paperwork and more client correspondence landing on the same number of people.",
    "The southeast growth corridor (Ipswich, Logan, Moreton Bay and the western suburbs) is where a lot of this expansion is happening. Trades businesses, building suppliers and sub-contractors here are taking on more work than ever, often while still running quotes, invoices and supplier orders through spreadsheets and email. The admin load grows in lockstep with the job book, and it tends to land on the owner after hours.",
    "Brisbane's local service businesses are growing up alongside the boom. Clinics, studios, agencies, retailers and service businesses that once won work on word of mouth now win it on responsiveness and on being found. Customers expect a fast website, same-day replies and to see you when they ask Google or ChatGPT for a recommendation, whatever size you are.",
    "What ties these sectors together is a familiar bottleneck: skilled people doing low-value administrative work because there was never time to build a better system. That is exactly where targeted AI automation pays off. The goal is not to replace anyone. It is to take the repetitive, rules-based parts of the day and hand them to software, so the experienced staff you fought to hire can focus on judgement, relationships and delivery.",
  ],
  challengesIntro:
    "Brisbane businesses tend to share a recognisable set of operational pressures as they scale through the current growth cycle. These are the ones we see most often.",
  challenges: [
    {
      title: "Quoting can't keep pace with the work",
      detail:
        "Trades, suppliers and project businesses are winning more work than ever, but quotes still get built by hand. A backlog of un-priced jobs is lost revenue, and slow quotes lose tenders to faster competitors.",
    },
    {
      title: "Admin lands on senior people",
      detail:
        "When hiring is tight, owners and senior staff end up doing data entry, chasing invoices and copying details between systems: the highest-paid people doing the lowest-value work.",
    },
    {
      title: "Client response times set the standard",
      detail:
        "Brisbane clients increasingly expect the responsiveness of a large firm. Enquiries that sit unanswered overnight or over a weekend quietly leak to competitors who reply first.",
    },
    {
      title: "Disconnected systems create double handling",
      detail:
        "Most growing businesses run a patchwork of tools (accounting, CRM, job management, email) that don't talk to each other. Staff bridge the gaps manually, and details get re-keyed three or four times.",
    },
    {
      title: "Growth outpaces process",
      detail:
        "Systems that worked at ten staff break at thirty. Onboarding, compliance and reporting that were once handled informally become bottlenecks exactly when the business can least afford delay.",
    },
  ],
  howWeHelpIntro:
    "We start by mapping where time actually goes, then automate the highest-impact, lowest-risk tasks first. Every engagement is grounded in your existing tools, not a rip-and-replace.",
  services: [
    {
      title: "A Brisbane website that keeps up with the boom",
      detail:
        "We build, host and manage a fast, mobile-first site from $2,000 plus $100 a month, set up to catch quote requests from across Ipswich, Logan, Moreton Bay and the inner suburbs.",
    },
    {
      title: "Automated quoting & estimating",
      detail:
        "Custom AI agents that price jobs from your own rules and rate cards, particularly valuable for Brisbane's busy trades, suppliers and project businesses fighting to turn quotes around faster.",
    },
    {
      title: "Customer enquiry & intake automation",
      detail:
        "AI-powered intake that answers, qualifies and routes enquiries around the clock, so weekend and after-hours leads are captured instead of lost to a faster competitor.",
    },
    {
      title: "Document & compliance automation",
      detail:
        "Drafting, populating and checking the repetitive documents your business produces (contracts, reports, certificates and onboarding packs), with a human reviewing before anything goes out.",
    },
    {
      title: "Systems integration",
      detail:
        "Connecting your accounting, CRM and job-management tools so data flows automatically instead of being re-keyed, eliminating the double handling that grows with headcount.",
    },
    {
      title: "Internal knowledge assistants",
      detail:
        "Private AI assistants trained on your own procedures and documentation, so staff find the right answer in seconds rather than interrupting a senior colleague.",
    },
  ],
  caseStudy: {
    client: "PlasticOnline (Holland Plastics)",
    industry: "Manufacturing & Industrial Supply",
    context:
      "Holland Plastics sells cut-to-size plastics where every order needs individual pricing based on material, dimensions and finishing. Quoting was a manual, expert-dependent task that capped how many enquiries the team could handle in a day.",
    outcome:
      "We built Rex, a custom AI pricing agent that quotes cut-to-size orders instantly from the company's own pricing logic. Enquiries are answered in seconds rather than hours, freeing the team to focus on complex orders and customer relationships while routine pricing runs itself.",
  },
  industryLinks: [
    {
      industry: "Website Care Plans",
      href: "/websites",
      context:
        "Brisbane small businesses get a fast, mobile-first website built, hosted and looked after on a care plan: Presence $100, Growth $200 or Signature $300 a month, with an AI enquiry chatbot included.",
    },
    {
      industry: "The Saabai Blueprint",
      href: "/blueprint",
      context:
        "Find out where AI saves your Brisbane business the most time, and whether Google, ChatGPT, Claude, Perplexity and Gemini can find you. Starter $497, Pro $1,497, Business $3,500.",
    },
    {
      industry: "Free AI Score",
      href: "/score",
      context:
        "Not sure where to start? A few quick questions show how ready your Brisbane business is for AI and what to do first. Free, about 5 minutes.",
    },
  ],
  spotlight: {
    eyebrow: "Custom AI chatbots",
    title: "Custom AI chatbots in Brisbane",
    paragraphs: [
      "Saabai builds custom AI chatbots for business websites in Brisbane, the Gold Coast and the Sunshine Coast.",
      "We are based in Merrimac on the Gold Coast and work with Brisbane clients mostly remotely.",
      "Your chatbot learns your services, hours and policies. New enquiries arrive by email, and we can also send alerts to Telegram, WhatsApp or SMS.",
    ],
    linkHref: "/ai-chatbot-developer-queensland",
    linkLabel: "Custom AI chatbots in Queensland",
  },
  dateModified: "2026-10-25",
  faqs: [
    {
      q: "How much does an AI chatbot cost?",
      a: "It depends on what your chatbot needs to do. Book a free 30 minute call for a quote.",
    },
    {
      q: "Do you work with Brisbane businesses in person, or only remotely?",
      a: "We work with Brisbane and southeast Queensland businesses both remotely and on-site where it helps. Most discovery and build work is done remotely and efficiently, but we're happy to meet in person for scoping and key milestones, particularly for businesses across the Ipswich, Logan and Moreton Bay growth corridor.",
    },
    {
      q: "Is AI automation worth it for a small Brisbane trades or supply business?",
      a: "Often yes. Small businesses tend to see the fastest payback because the owner is usually the one absorbing the admin. Automating quoting, enquiry handling and invoicing frees up the most expensive person in the business. We always start with a Saabai Blueprint so you know the return before committing to a build. Pricing: Starter $497, Pro $1,497 or Business $3,500, credited against a build booked within 30 days. The free AI Readiness Score is a good first step.",
    },
    {
      q: "How does the 2032 Olympics build-up affect the case for automating now?",
      a: "The build-up means more work flowing to Brisbane's construction, property and local service businesses over the next decade, but hiring can't always keep pace. Automating admin now lets you absorb more of that growth without proportionally growing headcount, which is a real advantage in a tight labour market.",
    },
    {
      q: "We already use accounting and job-management software. Can you work with what we have?",
      a: "Yes. We deliberately build around your existing tools rather than replacing them. Most of our work involves connecting systems you already pay for so data flows automatically, plus adding AI agents on top for tasks those tools don't handle.",
    },
    {
      q: "Will automation replace our staff?",
      a: "No. The goal is to remove repetitive work, not people. In a tight Brisbane labour market, the bigger problem is usually that skilled staff are stuck doing low-value admin. Automation hands that work to software so your team can focus on judgement, delivery and client relationships.",
    },
    {
      q: "How long before we see results?",
      a: "A Saabai Blueprint delivers a prioritised roadmap in days, not months. First automations (typically quoting or enquiry handling) are often live within a few weeks after that. We sequence the highest-impact, lowest-risk wins first so you see returns early.",
    },
    {
      q: "What does an engagement with Saabai cost?",
      a: "It depends on scope, which is why we start with a fixed-price Saabai Blueprint. That gives you a clear picture of opportunities and expected return before any build commitment, so you can make the decision on real numbers rather than a guess. Pricing: Starter $497, Pro $1,497 or Business $3,500, credited against a build booked within 30 days. The free AI Readiness Score is a good first step.",
    },
  ],
  ctaHeadline: "Ready to free your Brisbane team from busywork?",
  ctaSubtext:
    "Get your Saabai Blueprint and a ranked plan for where automation saves your Brisbane business the most time, or start with the free AI Readiness Score.",
  seo: {
    title: "Websites and AI Automation in Brisbane | Saabai",
    description:
      "Brisbane websites from $2,000 plus $100 a month, plus custom AI chatbots for local businesses. Book a free 30 minute call for a chatbot quote.",
    ogTitle: "Websites and AI Automation in Brisbane | Saabai",
    ogDescription:
      "Brisbane websites from $2,000 plus $100 a month, plus custom AI chatbots for local businesses. Book a free 30 minute call for a chatbot quote.",
    canonical: `${BASE_URL}/brisbane`,
  },
};

// ---------------------------------------------------------------------------
// GOLD COAST
// ---------------------------------------------------------------------------
export const GOLD_COAST: LocationConfig = {
  city: "Gold Coast",
  slug: "gold-coast",
  state: "Queensland",
  stateCode: "QLD",
  heroHeadline: "Web design Gold Coast, hosting included, from $2,000",
  heroSubheading:
    "Saabai is based on the Gold Coast. Web design for local small businesses starts from $2,000 plus $100 a month care, with hosting included.",
  breadcrumbName: "Web design Gold Coast",
  serviceName: "Web design Gold Coast, hosting included",
  dateModified: "2026-10-25",
  industries: [
    "Trades & Construction",
    "Property Development",
    "Tourism & Hospitality",
    "Clinics & Studios",
    "Retail",
    "Health & Wellness",
  ],
  marketContext: [
    "The Gold Coast runs on small, agile businesses. Far more than in the capital cities, the local economy is built around owner-operators and lean teams: the builder who also does the quoting, the practice owner who also handles reception, the cafe group running on a skeleton back office. That structure keeps the city entrepreneurial, but it also means admin has nowhere to go but onto people who are already stretched.",
    "Trades and construction are a huge part of the local story, riding strong population growth and a steady pipeline of residential and commercial development. These businesses live and die on how fast they can quote and how reliably they invoice. Yet most still build quotes manually and chase payments by hand, capping how much work a busy crew can realistically take on without the owner working nights.",
    "Tourism and hospitality bring a different challenge: seasonality. Enquiries, bookings and staffing swing hard between peak and off-peak, and the businesses that cope best are the ones whose systems handle the surge automatically. When a venue or operator is fielding triple the enquiries in school holidays, manual handling is where bookings get dropped and reviews suffer.",
    "Property development and local service businesses round out the picture, both defined by coordination: keeping trades, clients, contracts and approvals moving in sync. The common thread across every sector here is the same: small teams doing the work of larger ones, held back by manual admin. Well-targeted AI automation lets a lean Gold Coast business punch well above its headcount.",
  ],
  challengesIntro:
    "Gold Coast businesses share a distinct profile: small, fast-moving and admin-heavy. These are the pressures we hear about most.",
  challenges: [
    {
      title: "The owner is the bottleneck",
      detail:
        "In lean Gold Coast businesses, the owner often handles quoting, enquiries and invoicing personally. Every hour on admin is an hour not spent winning or delivering work, and growth stalls at the owner's capacity.",
    },
    {
      title: "Quoting backlogs cost jobs",
      detail:
        "Trades and construction businesses lose work simply because quotes take too long to turn around. In a competitive local market, the fastest quote often wins the job.",
    },
    {
      title: "Seasonal enquiry surges overwhelm small teams",
      detail:
        "Tourism, hospitality and retail face sharp peaks. When enquiries triple in holiday periods, a manual process can't keep up and bookings or sales slip through the cracks.",
    },
    {
      title: "After-hours leads go cold",
      detail:
        "A lot of Gold Coast enquiries arrive evenings and weekends. Without automated intake, those leads sit until the next business day, by which point many have already booked elsewhere.",
    },
    {
      title: "Coordination eats time",
      detail:
        "Property developers and project businesses spend hours chasing trades, clients and approvals across email and phone. This coordination work is repetitive but rarely systematised.",
    },
  ],
  howWeHelpIntro:
    "We focus on getting the most leverage from small teams. That means automating the tasks that consume the owner's day first, using the tools you already run.",
  services: [
    {
      title: "A Gold Coast website we build and look after",
      detail:
        "Mobile-first sites built, hosted and managed from $2,000 plus $100 a month, like the ones we run for local businesses such as Stu's Cycle Repairs. You get one local contact for changes, not a ticket queue.",
    },
    {
      title: "Automated quoting & estimating",
      detail:
        "AI agents that build quotes from your own pricing rules, so trades and construction businesses turn jobs around in minutes and stop losing work to slower-quoting competitors.",
    },
    {
      title: "Booking & enquiry automation",
      detail:
        "Round-the-clock AI intake that handles enquiries and bookings through seasonal surges, so peak-period demand is captured instead of dropped. Built for tourism, hospitality and wellness operators.",
    },
    {
      title: "Invoicing & payment follow-up",
      detail:
        "Automated invoicing and gentle payment chasing that keeps cash flow healthy without the owner personally hounding clients every week.",
    },
    {
      title: "Systems integration",
      detail:
        "Connecting your booking, accounting and CRM tools so a small team isn't re-keying the same details across three apps all day.",
    },
    {
      title: "Internal knowledge assistants",
      detail:
        "Private AI assistants that give staff instant answers from your own procedures, so the owner isn't the only person who knows how everything works.",
    },
  ],
  caseStudy: {
    client: "PlasticOnline (Holland Plastics)",
    industry: "Manufacturing & Industrial Supply",
    context:
      "Gold Coast-based Holland Plastics sells cut-to-size plastics, where every order is individually priced on material, size and finishing. Manual quoting limited how many enquiries the small team could process and tied up expert staff in routine pricing.",
    outcome:
      "We built Rex, an AI pricing agent that quotes cut-to-size orders instantly from the company's own pricing logic. The lean team now handles far more enquiries without adding headcount, with routine quoting running itself and people freed for complex orders and relationships.",
  },
  industryLinks: [
    {
      industry: "Website Care Plans",
      href: "/websites",
      context:
        "Your website built and looked after by a team down the road: Presence $100, Growth $200 or Signature $300 a month, with an AI enquiry chatbot on every plan.",
    },
    {
      industry: "The Saabai Blueprint",
      href: "/blueprint",
      context:
        "A fixed-price AI audit for Gold Coast businesses, with SEO and AI search visibility included. Starter $497, Pro $1,497, Business $3,500.",
    },
    {
      industry: "Free AI Score",
      href: "/score",
      context:
        "Not sure where to start? A few quick questions show how ready your Gold Coast business is for AI and what to do first. Free, about 5 minutes.",
    },
  ],
  faqs: [
    {
      q: "Is hosting included?",
      a: "Yes. A Gold Coast website starts from $2,000 plus $100 a month care, and that care includes hosting.",
    },
    {
      q: "I run a small Gold Coast business. Is AI automation overkill for me?",
      a: "Quite the opposite. Smaller businesses usually get the biggest benefit because the owner is the one absorbing the admin. Automating quoting, bookings and invoicing frees up the most valuable person in the business. We scope to fit small budgets and start with the highest-impact task first.",
    },
    {
      q: "How do you handle the seasonal swings tourism and hospitality businesses face?",
      a: "Automation shines exactly when demand spikes. AI intake and booking handling scale instantly to absorb holiday-period surges that would otherwise overwhelm a small team, then sit quietly during off-peak. You capture peak demand without hiring temporary staff just to answer enquiries.",
    },
    {
      q: "Can you help us capture leads that come in after hours and on weekends?",
      a: "Yes, this is one of the most common Gold Coast wins. A lot of enquiries arrive evenings and weekends when nobody's at the desk. Automated AI intake answers, qualifies and captures those leads instantly, so they don't go cold or book with a competitor before Monday.",
    },
    {
      q: "Do you work on-site on the Gold Coast or only remotely?",
      a: "Both. Most work is done remotely and efficiently, but we're happy to meet in person on the Coast for scoping and key milestones. Being close to Brisbane and the broader southeast Queensland region, in-person sessions are easy to arrange when they add value.",
    },
    {
      q: "We're a trades business losing jobs because quotes take too long. Can you fix that?",
      a: "That's a core use case. We build AI quoting agents that price jobs from your own rules and rate cards in minutes instead of hours, so you respond while the lead is still warm. Faster quotes routinely translate directly into a higher win rate.",
    },
    {
      q: "How quickly will we see a return?",
      a: "A Saabai Blueprint gives you a prioritised roadmap in days, and first automations are typically live a few weeks after that. We deliberately sequence quick, high-impact wins first so the value shows up early rather than at the end of a long project.",
    },
    {
      q: "What does it cost to get started?",
      a: "We start with a Saabai Blueprint, a fixed-price plan that ranks the opportunities and expected return for your business. That keeps the entry point affordable for small businesses and means you decide based on real numbers, not a guess. Pricing: Starter $497, Pro $1,497 or Business $3,500, credited against a build booked within 30 days. The free AI Readiness Score is a good first step.",
    },
  ],
  ctaHeadline: "Make your lean Gold Coast team run like a bigger one",
  ctaSubtext:
    "Get your Saabai Blueprint from the team down the road, or start with the free AI Readiness Score and see where your business stands in a few minutes.",
  seo: {
    title: "Web Design Gold Coast, Hosting Included, From $2,000 | Saabai",
    description:
      "Web design on the Gold Coast from $2,000 plus $100 a month care, with hosting included. Saabai is based in Merrimac, and Blueprint AI plans start from $497.",
    ogTitle: "Web Design Gold Coast, Hosting Included, From $2,000 | Saabai",
    ogDescription:
      "Web design on the Gold Coast from $2,000 plus $100 a month care, with hosting included. Saabai is based in Merrimac, and Blueprint AI plans start from $497.",
    canonical: `${BASE_URL}/gold-coast`,
  },
};

export const LOCATION_CONFIGS: Record<string, LocationConfig> = {
  "gold-coast": GOLD_COAST,
  brisbane: BRISBANE,
};

export const ALL_LOCATIONS = Object.values(LOCATION_CONFIGS);
