/**
 * Blueprint search, AI-search, and conversion rules.
 *
 * This is the only file to edit when Google or AI search guidance changes.
 * Do not copy these lists into a second config.
 *
 * Weekly update:
 * 1. Check public guidance for Google Search indexing and for the AI crawlers
 *    buyers actually use (search crawlers and training crawlers are listed
 *    separately below, because blocking a training crawler can be deliberate).
 * 2. Adjust thresholds, crawler names, question banks, weights, or the
 *    "why it affects results" lines.
 * 3. Set `lastReviewed` to the day you checked them (YYYY-MM-DD).
 * 4. Run tests/blueprint-search-rules.test.ts.
 *
 * What this file will not do:
 * - Invent a rating, a price, a traffic number, or a result.
 * - Estimate lost revenue unless the client supplied the figures.
 * - Fetch pages. Crawl is GET-only and lives in lib/blueprint/search-audit.ts.
 *
 * First-screen checks are HTML only. The Blueprint runtime has no headless
 * browser, so "above the fold" means the header, the hero, and the first
 * slice of visible text (see `firstScreenChars`). Say so in the report.
 */

export const lastReviewed = "2026-10-26";

export const SEARCH_LIMITS = {
  lastReviewed,
  /** Visible words below this, on an indexable page, count as thin. */
  thinWords: 80,
  /** Placeholder copy counts as thin up to this many words. */
  placeholderWords: 150,
  /** Visible characters treated as the first screen, plus the header and hero. */
  firstScreenChars: 700,
  /** Characters after a matched phrase that can contain the answer. */
  answerWindowChars: 500,
  /** Homepage text under this, with scripts present, is a JavaScript shell. */
  jsShellChars: 200,
  maxHtmlPages: 8,
  maxSitemapUrls: 40,
  maxSitemapFiles: 2,
  fetchTimeoutMs: 8000,
} as const;

export const FOLD_NOTE =
  "We judge the first screen from the HTML of the page, not from a phone screenshot. The Blueprint does not run a headless browser. Words added by JavaScript after load, or pushed down by a tall photo, may not be counted. Those checks are marked as medium confidence.";

export type BusinessKind = "local-trade" | "professional" | "general";
export type QuestionBankId = "local" | "professional" | "property" | "general";
export type SearchArea = "indexing" | "questions" | "ai-search" | "conversion" | "gbp";
export type CheckStatus = "pass" | "partial" | "fail" | "unknown";
export type Confidence = "high" | "medium" | "low";
export type FindingBucket = "quick-win" | "owner-decision";

/**
 * Local trades: conversion and Google Business Profile carry the score.
 * Professional and B2B: buyer questions and AI search weigh the same, and
 * both weigh more than conversion. General sits between the two.
 */
export const AREA_WEIGHTS: Record<BusinessKind, Record<SearchArea, number>> = {
  "local-trade": { indexing: 1, questions: 1, "ai-search": 1, conversion: 2, gbp: 2 },
  professional: { indexing: 1, questions: 2, "ai-search": 2, conversion: 1, gbp: 0.5 },
  general: { indexing: 1, questions: 1.5, "ai-search": 1.5, conversion: 1.5, gbp: 1 },
};

export const AREA_LABEL: Record<SearchArea, string> = {
  indexing: "Indexing",
  questions: "Buyer questions",
  "ai-search": "AI search",
  conversion: "Conversion",
  gbp: "Google profile",
};

export function weightingNote(kind: BusinessKind): string {
  if (kind === "local-trade") {
    return "Weighted for a local trade: conversion leaks and the Google profile count for more of the score than the other sections.";
  }
  if (kind === "professional") {
    return "Weighted for a professional or B2B firm: buyer questions and AI search count equally, and both count for more than conversion.";
  }
  return "Weighted across indexing, buyer questions, AI search, conversion, and the Google profile. Buyer questions, AI search, and conversion count a little more than the rest.";
}

/**
 * Crawlers that fetch pages to answer a person's question.
 * Blocking these keeps the business out of AI answers.
 * Reviewed with lastReviewed. Googlebot is not in this list: it is normal
 * Google Search, and a block on it is an indexing problem.
 */
export const AI_SEARCH_CRAWLERS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
] as const;

/**
 * Crawlers that collect pages for training. Owners sometimes block these on
 * purpose. A block here is a decision, not the same failure as blocking search.
 */
export const AI_TRAINING_CRAWLERS = [
  "GPTBot",
  "Google-Extended",
  "CCBot",
  "Applebot-Extended",
  "anthropic-ai",
  "Bytespider",
  "Amazonbot",
  "Meta-ExternalAgent",
] as const;

export const PLACEHOLDER_RE = /\b(lorem ipsum|coming soon|placeholder|under construction|todo|tbd|your text here|sample text)\b/i;

/** Indexable pages that are not real offers. A hit here should be noindex or kept out of the sitemap. */
export const UTILITY_PATH = /\/(privacy|privacy-policy|terms|terms-of-service|legal|login|log-in|signin|sign-in|signup|sign-up|cart|checkout|thank-you|thanks|search|account|my-account|wp-admin|wp-login|tag|author|feed|cookie|cookies|wishlist|sitemap|404|unsubscribe)(\/|$)/i;

export const BLOG_PATH = /\/(blog|news|articles|insights|journal)(\/|$)/i;

export const COMPARISON_PHRASES = [" vs ", " versus ", "compared with", "compared to", "difference between", "how we compare"];

export const WHY = {
  orphans: "A page in the sitemap with no link to it is hard for a customer to find, and Google has little reason to treat it as important.",
  thin: "Thin or placeholder pages that Google can index compete with your real pages and make the site look unfinished.",
  utility: "Privacy, login, cart, and thank-you pages do not answer a buyer's question. If Google indexes them, they can show up instead of a service page.",
  canonical: "Without a canonical link, Google may keep more than one copy of the page, or choose an address you did not mean to promote.",
  host: "If both the www and the non-www address load as separate sites, Google splits your reputation across two copies.",
  robotsAll: "If robots.txt tells every crawler to skip the whole site, Google cannot list the pages customers search for.",
  aiSearch: "If AI search crawlers are blocked, you are left out when someone asks ChatGPT, Claude, Perplexity, or a similar tool who to call.",
  aiTraining: "Training crawlers are not the same as search crawlers. Blocking them can be a real choice. It should be a choice, not an accident.",
  llms: "llms.txt is a plain summary AI tools can read. If it is missing, or it does not match the business, they work from guesswork.",
  schema: "Structured data tells Google and AI tools your name, services, and prices. If it is missing, or it disagrees with the page, they may skip you or quote the wrong fact.",
  faq: "A real question with a short answer is what AI tools quote. Marking those questions up makes the quote more likely.",
  breadcrumb: "Breadcrumbs tell Google how a page fits the site. Inner pages without them are harder to place.",
  article: "An article or news page without article markup is less likely to be used as a cited source.",
  pricing: "Buyers and AI tools quote a page that states a price or a fee. A page that never mentions money is easy to skip.",
  comparison: "AI answers often quote a page that compares options. If you do not explain the choice, someone else gets the quote.",
  promise: "The first screen should repeat the promise that got the click. If the heading says something else, people leave.",
  rating: "A Google rating in the first screen is proof before the scroll. If it is missing, the page asks for trust without showing any.",
  cta: "On a phone, the first screen is often the only screen. If call or book is below it, a ready buyer has nothing to tap.",
  fromPrice: "A starting price ('from $X') lets a buyer see if you are in range before they scroll. Hiding it costs enquiries.",
  services: "One page per service gives each search its own answer. A single page that lists everything ranks for none of them as clearly.",
  gbp: "Many buyers check Google before they call. A link to the real profile helps them. If you do not use a Google profile, that is a decision, and we do not look a rating up.",
  questions: "People search in questions. If the site does not answer them in plain words, Google and AI tools quote a competitor.",
} as const;

const TRADE_TERMS = ["plumb", "electric", "builder", "building", "carpenter", "painter", "roof", "cleaner", "cleaning", "mechanic", "pest", "hvac", "air con", "aircon", "landscap", "locksmith", "plaster", "tiler", "tiling", "concret", "gardener", "gardening", "removalist", "towing", "appliance"];
const PROPERTY_TERMS = ["real estate", "realtor", "property management", "real-estate"];
const PRO_TERMS = ["lawyer", "solicitor", "attorney", "accountant", "accounting", "bookkeep", "financial advis", "consultant", "consulting", "agency", "b2b", "barrister", "notary", "architect", "professional service"];

export type BuyerQuestion = {
  id: string;
  text: string;
  /** Any one of these means the page is on this question. */
  phrases: string[];
  /** Mentioned, but not enough for a clear answer. */
  topics: string[];
  /** Must appear after the phrase. Do not repeat the phrase itself. */
  signals: string[];
};

const buyer = (id: string, text: string, phrases: string[], topics: string[], signals: string[]): BuyerQuestion => ({ id, text, phrases, topics, signals });

export const QUESTION_BANKS: Record<QuestionBankId, BuyerQuestion[]> = {
  local: [
    buyer("local-areas", "Which areas do you cover?", ["service area", "areas we cover", "suburbs we", "we come to"], ["suburb", "location"], ["gold coast", "brisbane", "qld", "nsw", "vic", "based in", " km"]),
    buyer("local-emergency", "Do you offer same-day or emergency call-outs?", ["emergency", "same-day", "same day", "24 hour", "24/7"], ["urgent"], ["today", "after hours", "call-out", "call out", "available"]),
    buyer("local-cost", "What does a typical job cost, or what is the starting price?", ["our prices", "pricing", "starting at", "from $", "how much"], ["cost", "quote"], ["fixed", "per hour", "call-out", "no charge", "free quote", "$"]),
    buyer("local-licensed", "Are you licensed and insured?", ["licensed and insured", "fully licensed", "public liability", "qbcc"], ["licensed", "insured"], ["liability", "policy", "licensed", "insured", "qbcc"]),
    buyer("local-book", "How do I book or get a quote?", ["book now", "get a quote", "request a quote", "make a booking"], ["booking", "enquire"], ["phone", "call", "form", "online", "email"]),
    buyer("local-soon", "How soon can you come?", ["how soon", "we can come", "lead time"], ["availability"], ["today", "tomorrow", "same day", "within", "hours"]),
    buyer("local-included", "What is included in a standard visit?", ["what's included", "what is included", "included in the"], ["included"], ["inspection", "labour", "labor", "parts", "travel"]),
    buyer("local-callout", "Do you charge a call-out fee if I do not go ahead?", ["call-out fee", "call out fee", "callout fee"], ["call-out", "call out"], ["no charge", "free", "waived", "deducted", "$"]),
    buyer("local-warranty", "What warranty or guarantee do you offer?", ["warranty", "workmanship guarantee", "our guarantee"], ["guarantee"], ["year", "month", "labour", "labor", "parts", "written"]),
    buyer("local-weekends", "Do you work on weekends or after hours?", ["weekends", "after hours", "saturday", "sunday"], ["opening hours"], ["open", "closed", "available", "appointment", " am", " pm"]),
    buyer("local-duration", "How long does a typical job take?", ["how long", "typical job takes", "time it takes"], ["duration"], ["hour", "minutes", "days", "usually"]),
    buyer("local-pay", "Which payment methods do you take?", ["payment methods", "we accept", "pay by"], ["invoice"], ["card", "cash", "eftpos", "visa", "bank"]),
    buyer("local-both", "Do you work on homes, businesses, or both?", ["residential and commercial", "homes and businesses", "domestic and commercial"], ["residential", "commercial"], ["both", "home", "office", "strata"]),
    buyer("local-wait", "What should I do while I wait?", ["while you wait", "before we arrive"], ["shut off"], ["water", "power", "switch", "turn off", "safe"]),
    buyer("local-reviews", "Where can I read recent customer reviews?", ["google reviews", "our reviews", "testimonials"], ["review"], ["google", "star", "out of 5", "customers"]),
    buyer("local-brands", "Which brands, makes, or systems do you work on?", ["brands we", "makes we", "we repair all", "systems we"], ["brand"], ["makes", "brands", "install", "rheem", "daikin"]),
  ],
  professional: [
    buyer("pro-who", "Who do you usually work with?", ["who we work with", "our clients", "we work with"], ["clients"], ["business", "owner", "firm", "family", "individual"]),
    buyer("pro-services", "What services do you offer?", ["our services", "what we do", "services we"], ["services"], ["include", "advice", "tax", "law", "consult"]),
    buyer("pro-fees", "How do your fees work?", ["our fees", "how fees", "fee structure", "how we charge"], ["fees"], ["fixed", "hourly", "retainer", "invoice", "$"]),
    buyer("pro-start-cost", "What does it cost to get started?", ["cost to start", "starting fee", "engagement fee", "from $"], ["pricing"], ["$", "fixed", "from", "quote", "no charge"]),
    buyer("pro-duration", "How long does a typical engagement take?", ["how long", "typical engagement", "timeframe"], ["timeline"], ["week", "month", "days", "usually"]),
    buyer("pro-need", "What do you need from me to start?", ["what we need", "to get started you", "what you will need"], ["documents"], ["send", "id", "records", "brief", "email"]),
    buyer("pro-book", "How do I book a first conversation?", ["book a call", "book a consultation", "first conversation", "book now"], ["consultation"], ["call", "calendar", "phone", "email", "form"]),
    buyer("pro-who-deals", "Who will I actually deal with?", ["you will work with", "your adviser", "your lawyer", "your accountant", "who you deal"], ["our team"], ["principal", "director", "named", "directly", "not handed"]),
    buyer("pro-where", "Where are you based, and do you work remotely?", ["we are based", "remote", "work online", "our office"], ["located"], ["brisbane", "sydney", "melbourne", "australia", "zoom", "remote", "qld", "nsw"]),
    buyer("pro-privacy", "How is my information kept confidential?", ["confidential", "privacy", "we keep your"], ["secure"], ["private", "encrypted", "not shared", "obligation", "privilege"]),
    buyer("pro-not-included", "What is not included?", ["not included", "what's not", "does not include"], ["excluded"], ["extra", "separate", "not include", "disbursement", "third party"]),
    buyer("pro-reply", "How quickly do you reply?", ["we reply", "response time", "how quickly"], ["reply"], ["hour", "same day", "business day", "within"]),
    buyer("pro-after", "What happens after the first call?", ["after the first", "after we speak", "next step"], ["next steps"], ["proposal", "email", "scope", "we send", "you receive"]),
    buyer("pro-focus", "Which industries or matters do you focus on?", ["we focus", "we specialise", "we specialize", "our focus"], ["industries"], ["only", "mainly", "sector", "matters", "industry"]),
    buyer("pro-different", "How are you different from a larger firm?", ["unlike a large", "smaller firm", "why us", "how we are different"], ["boutique"], ["direct", "partner", "no handoff", "smaller", "personal"]),
    buyer("pro-example", "Can I see an example of the work, without invented results?", ["example of", "a typical matter", "sample engagement", "how a matter"], ["case study"], ["for example", "typical", "recent matter", "walk through"]),
  ],
  property: [
    buyer("prop-suburbs", "Which suburbs do you sell or manage in?", ["suburbs we", "areas we", "we sell in", "we manage in"], ["suburb"], ["qld", "nsw", "vic", "based", "gold coast", "brisbane"]),
    buyer("prop-fee", "What do you charge to sell or manage a property?", ["our commission", "management fee", "selling fee", "from $"], ["fees"], ["%", "percent", "fixed", "$", "plus gst"]),
    buyer("prop-book", "How do I book an appraisal or inspection?", ["book an appraisal", "book an inspection", "request an appraisal"], ["appraisal"], ["call", "online", "form", "phone", "email"]),
    buyer("prop-duration", "How long does a sale or a lease usually take?", ["days on market", "how long", "typical sale"], ["settlement"], ["day", "week", "month", "usually"]),
    buyer("prop-included", "What is included in your service?", ["what's included", "what is included", "our service includes"], ["included"], ["photos", "advertising", "inspections", "rent", "marketing"]),
    buyer("prop-find", "How do you find buyers or tenants?", ["find buyers", "find tenants", "how we market"], ["marketing"], ["portal", "database", "signboard", "inspection", "listing"]),
    buyer("prop-need", "What do you need from me to get started?", ["what we need from you", "to get started"], ["documents"], ["contract", "id", "keys", "title", "email"]),
    buyer("prop-who", "Who will handle my property day to day?", ["property manager", "your agent", "day to day"], ["our team"], ["named", "direct", "mobile", "one person", "manager"]),
    buyer("prop-report", "How do you report on price or rent?", ["we report", "vendor report", "owner report"], ["updates"], ["weekly", "monthly", "email", "portal", "price"]),
    buyer("prop-after", "What happens after the first call?", ["after the first", "after the appraisal", "next step"], ["next steps"], ["proposal", "market", "we send", "you receive"]),
    buyer("prop-reply", "How quickly do you reply?", ["we reply", "response time"], ["contact us"], ["hour", "same day", "within", "business day"]),
    buyer("prop-fee-shape", "Are your fees fixed or a percentage?", ["fixed fee", "percentage", "commission"], ["our fees"], ["fixed", "%", "percent", "plus"]),
    buyer("prop-repairs", "How do you handle repairs or maintenance?", ["repairs", "maintenance", "trades we"], ["maintenance"], ["approve", "quote", "invoice", "trades", "urgent"]),
    buyer("prop-reviews", "Where can I read recent client reviews?", ["google reviews", "our reviews", "testimonials"], ["review"], ["google", "star", "clients", "out of 5"]),
    buyer("prop-both", "Do you cover both sales and property management?", ["sales and property management", "we sell and manage", "sales and rentals"], ["property management"], ["both", "sales", "rentals", "manage"]),
    buyer("prop-process", "What does the process look like from listing to settlement or lease?", ["the process", "from listing", "step by step"], ["settlement"], ["step", "listing", "offer", "settlement", "lease"]),
  ],
  general: [
    buyer("gen-what", "What do you do, in plain words?", ["what we do", "we help", "our work"], ["about us"], ["business", "customers", "service", "build", "provide"]),
    buyer("gen-who", "Who is this for?", ["who this is for", "we work with", "ideal customer"], ["for small"], ["owner", "business", "team", "family", "local"]),
    buyer("gen-cost", "What does it cost to start?", ["cost to start", "starting at", "from $", "our pricing"], ["pricing"], ["$", "fixed", "quote", "from", "plan"]),
    buyer("gen-book", "How do I book or enquire?", ["book now", "get in touch", "contact us", "enquire"], ["contact"], ["phone", "email", "form", "call"]),
    buyer("gen-soon", "How soon can you start?", ["how soon", "we can start", "lead time"], ["availability"], ["today", "week", "days", "within"]),
    buyer("gen-included", "What is included?", ["what's included", "what is included", "includes"], ["included"], ["support", "setup", "training", "hosting", "calls"]),
    buyer("gen-excluded", "What is not included?", ["not included", "does not include"], ["extra"], ["extra", "separate", "not include", "add-on", "addon"]),
    buyer("gen-duration", "How long does it take?", ["how long", "timeframe", "it takes"], ["timeline"], ["day", "week", "month", "usually"]),
    buyer("gen-where", "Where are you based, and which areas do you cover?", ["we are based", "areas we", "service area"], ["located"], ["australia", "qld", "nsw", "remote", "based"]),
    buyer("gen-fees", "How do your fees work?", ["our fees", "how we charge", "fee"], ["invoice"], ["fixed", "monthly", "hourly", "$", "retainer"]),
    buyer("gen-who-deals", "Who will I deal with?", ["you will deal", "your contact", "work directly"], ["our team"], ["founder", "directly", "named", "one person"]),
    buyer("gen-reply", "How quickly do you reply?", ["we reply", "response time"], ["reply"], ["hour", "same day", "within", "business day"]),
    buyer("gen-proof", "Where can I read reviews or results you have actually published?", ["google reviews", "case stud", "results we have published"], ["testimonial"], ["google", "client", "published", "star"]),
    buyer("gen-after", "What happens after I get in touch?", ["after you", "what happens next", "next step"], ["next steps"], ["we call", "we email", "we send", "you receive"]),
    buyer("gen-different", "How are you different from other options?", ["how we are different", "why us", "unlike"], ["compare"], ["direct", "included", "local", "smaller", "one"]),
    buyer("gen-need", "What do you need from me to start?", ["what we need", "to get started"], ["send us"], ["email", "brief", "access", "photos", "login"]),
  ],
};

export type ClientFigures = {
  /** Client-stated missed enquiries per month. Never inferred. */
  missedEnquiriesPerMonth?: number;
  /** Fraction 0 to 1 after cleaning. Values from 1 to 100 are treated as percents. */
  closeRate?: number;
  averageJobAud?: number;
};

export type SearchClientInput = {
  name?: string;
  firmType?: string;
  /**
   * Set only when the client picked a kind in onboarding. Absent means the
   * kind is inferred from firm type and the words they already gave us.
   */
  businessKind?: "local-trade" | "professional" | "property" | "general";
  industry?: string;
  overview?: string;
  location?: string;
  promise?: string;
  services?: string[];
  /** A rating the client wrote down. Never treated as something we observed. */
  statedGoogleRating?: number;
  statedGoogleReviews?: number;
  figures?: ClientFigures;
};

/** Every check id evaluateSearch can emit. Onboarding questions map onto this list. */
export const SEARCH_CHECK_IDS = [
  "robots_index",
  "canonical",
  "host",
  "orphans",
  "utility_indexable",
  "thin_indexable",
  "ai_search_crawlers",
  "ai_training_crawlers",
  "llms_present",
  "llms_accurate",
  "schema_business",
  "schema_match",
  "schema_faq",
  "schema_breadcrumb",
  "schema_article",
  "answerable_pricing",
  "comparison",
  "promise",
  "rating_fold",
  "cta_fold",
  "from_price",
  "service_pages",
  "gbp_link",
  "question_gap",
  "questions_shell",
  "conversion_shell",
  "leak_inputs",
] as const;

export type SearchCheckId = (typeof SEARCH_CHECK_IDS)[number];

export type HostProbe = { url: string; status: number; location: string | null };
export type HtmlPage = { url: string; status: number; html: string; headers?: Record<string, string> };
export type TextDoc = { status: number; body: string } | null;

export type CrawlSnapshot = {
  requestedUrl: string;
  finalUrl: string;
  pages: HtmlPage[];
  /** null = the fetch failed. 404 = there is no file. */
  robots: TextDoc;
  sitemapStatus: number | null;
  sitemapUrls: string[];
  llms: TextDoc;
  hostProbes: HostProbe[];
  capped: boolean;
  error?: string;
};

export type SearchCheck = {
  id: string;
  area: SearchArea;
  status: CheckStatus;
  /** 0 means the check is shown but does not change the score (the question score already covers it). */
  points: number;
  what: string;
  why: string;
  page?: string;
  effort: string;
  effortMins: number;
  confidence: Confidence;
  bucket: FindingBucket;
  /** Set when this line used a fallback instead of a fact the client confirmed. */
  assumption?: string;
};

export type QuestionResult = {
  id: string;
  question: string;
  result: "clear" | "partial" | "missing";
  page?: string;
  why: string;
  confidence: Confidence;
  effort?: string;
  /** Set when the result was inferred from page wording, not confirmed by the client. */
  assumption?: string;
};

export type SearchAudit = {
  mode: "scored" | "unread";
  lastReviewed: string;
  foldNote: string;
  requestedUrl: string;
  finalUrl?: string;
  businessKind: BusinessKind;
  questionBank: QuestionBankId;
  weightingNote: string;
  pagesCrawled: string[];
  capped: boolean;
  checks: SearchCheck[];
  questions: QuestionResult[];
  questionScore: number | null;
  areas: Record<SearchArea, number | null>;
  overall: number | null;
  leak: { headline: string; detail: string; monthlyAud?: number };
  quickWins: SearchCheck[];
  ownerDecisions: SearchCheck[];
  unverified: SearchCheck[];
  unreadNote?: string;
};

export function classifyBusiness(input: Pick<SearchClientInput, "firmType" | "industry" | "overview" | "businessKind">): { kind: BusinessKind; bank: QuestionBankId } {
  if (input.businessKind === "property") return { kind: "local-trade", bank: "property" };
  if (input.businessKind === "professional") return { kind: "professional", bank: "professional" };
  if (input.businessKind === "general") return { kind: "general", bank: "general" };
  if (input.businessKind === "local-trade") {
    const chosen = `${input.industry ?? ""} ${input.overview ?? ""}`.toLowerCase();
    if (PROPERTY_TERMS.some((t) => chosen.includes(t))) return { kind: "local-trade", bank: "property" };
    return { kind: "local-trade", bank: "local" };
  }
  const firm = (input.firmType ?? "").toLowerCase().trim();
  if (firm === "real-estate" || firm === "real estate" || firm === "property") return { kind: "local-trade", bank: "property" };
  if (["law", "legal", "accounting", "financial-advisory", "financial", "professional"].includes(firm)) return { kind: "professional", bank: "professional" };
  const blob = `${input.industry ?? ""} ${input.overview ?? ""}`.toLowerCase();
  if (PROPERTY_TERMS.some((t) => blob.includes(t))) return { kind: "local-trade", bank: "property" };
  if (TRADE_TERMS.some((t) => blob.includes(t))) return { kind: "local-trade", bank: "local" };
  if (PRO_TERMS.some((t) => blob.includes(t))) return { kind: "professional", bank: "professional" };
  return { kind: "general", bank: "general" };
}

/** Keep only figures the client actually supplied. Out-of-range numbers are dropped, not repaired into a guess. */
export function cleanFigures(input: ClientFigures | undefined): ClientFigures | undefined {
  if (!input) return undefined;
  const out: ClientFigures = {};
  const missed = num(input.missedEnquiriesPerMonth);
  const job = num(input.averageJobAud);
  const rateRaw = num(input.closeRate);
  if (missed !== undefined && missed >= 0 && missed <= 100000) out.missedEnquiriesPerMonth = missed;
  if (job !== undefined && job >= 0 && job <= 100000000) out.averageJobAud = job;
  if (rateRaw !== undefined && rateRaw >= 0 && rateRaw <= 100) out.closeRate = rateRaw > 1 ? rateRaw / 100 : rateRaw;
  return out.missedEnquiriesPerMonth !== undefined || out.averageJobAud !== undefined || out.closeRate !== undefined ? out : undefined;
}

export function leakEstimate(figures: ClientFigures | undefined, siteRead: boolean): SearchAudit["leak"] {
  const f = cleanFigures(figures);
  if (!f || f.missedEnquiriesPerMonth === undefined || f.closeRate === undefined || f.averageJobAud === undefined) {
    return { headline: "Needs client data", detail: "A dollar figure is shown only when you have given us three numbers: missed enquiries per month, your close rate, and your average job value. We do not estimate those." };
  }
  const monthly = Math.round(f.missedEnquiriesPerMonth * f.closeRate * f.averageJobAud);
  const pct = Math.round(f.closeRate * 1000) / 10;
  const tie = siteRead
    ? "The conversion leaks in this report are reasons that can happen. This is your arithmetic, not a forecast of extra sales."
    : "The site was not read, so this is not tied to a page. This is your arithmetic, not a forecast.";
  return {
    headline: `About $${monthly.toLocaleString("en-AU")} a month, using only your numbers`,
    detail: `You said ${f.missedEnquiriesPerMonth} enquiries a month do not become a conversation. At your close rate of ${pct}% and an average job of $${f.averageJobAud.toLocaleString("en-AU")}, that is about $${monthly.toLocaleString("en-AU")} a month. ${tie}`,
    monthlyAud: monthly,
  };
}

export function bareHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

export function visibleText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function isJsShell(html: string): boolean {
  const text = visibleText(html);
  return text.length < SEARCH_LIMITS.jsShellChars && /<script\b/i.test(html);
}

/** Header, hero, and the first slice of body text. Not a rendered phone viewport. */
export function firstScreenHtml(html: string): string {
  const header = html.match(/<header\b[\s\S]*?<\/header>/i)?.[0] ?? "";
  const nav = header ? "" : (html.match(/<nav\b[\s\S]*?<\/nav>/i)?.[0] ?? "");
  const hero = html.match(/<(section|div)\b[^>]*(?:hero|banner|masthead|above-the-fold)[^>]*>[\s\S]*?<\/\1>/i)?.[0] ?? "";
  const bodyInner = html.match(/<body\b[^>]*>([\s\S]*)$/i)?.[1] ?? html;
  return `${header}\n${nav}\n${hero}\n${sliceHtmlByVisibleChars(bodyInner, SEARCH_LIMITS.firstScreenChars)}`;
}

export function sliceHtmlByVisibleChars(html: string, maxChars: number): string {
  let out = "";
  let count = 0;
  const re = /<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<[^>]+>|[^<]+/gi;
  for (const m of html.matchAll(re)) {
    const part = m[0];
    if (part.startsWith("<")) {
      out += part;
      continue;
    }
    if (count >= maxChars) break;
    const room = maxChars - count;
    let take = part.length <= room ? part : part.slice(0, room);
    if (part.length > room) {
      // Stop on a word. Cutting "$2,000" to "$2,0" would put a price in the report that is not on the page.
      take = take.replace(/\S+$/, "");
    }
    out += take;
    count += take.replace(/\s+/g, " ").trim().length ? Math.min(take.replace(/\s+/g, " ").length, room) : 0;
    if (part.length > room) break;
  }
  return out;
}

export function jsonLd(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(m[1].trim()) as unknown;
      const walk = (n: unknown) => {
        if (Array.isArray(n)) n.forEach(walk);
        else if (n && typeof n === "object") {
          out.push(n as Record<string, unknown>);
          const g = (n as Record<string, unknown>)["@graph"];
          if (g) walk(g);
        }
      };
      walk(parsed);
    } catch { /* ignore broken blocks */ }
  }
  return out;
}

export function ldTypes(n: Record<string, unknown>): string[] {
  return ([] as unknown[]).concat(n["@type"] ?? []).map(String);
}

/** True when this crawler's group, or * if it has no group, disallows the whole site. */
export function agentsBlocked(robots: string, names: readonly string[]): string[] {
  const groups: { agents: string[]; rules: string[] }[] = [];
  let cur: { agents: string[]; rules: string[] } | null = null;
  let lastWasAgent = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const k = m[1].toLowerCase();
    const v = m[2].trim();
    if (k === "user-agent") {
      if (!cur || !lastWasAgent) {
        cur = { agents: [], rules: [] };
        groups.push(cur);
      }
      cur.agents.push(v.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (cur && (k === "disallow" || k === "allow")) cur.rules.push(`${k}:${v}`);
    }
  }
  const blocksAll = (g?: { rules: string[] }) => {
    if (!g) return false;
    const disallow = g.rules.filter((r) => r.startsWith("disallow:")).map((r) => r.slice("disallow:".length).trim());
    const allow = g.rules.filter((r) => r.startsWith("allow:")).map((r) => r.slice("allow:".length).trim());
    return disallow.includes("/") && !allow.includes("/");
  };
  const star = groups.find((g) => g.agents.includes("*"));
  return names.filter((b) => {
    const g = groups.find((x) => x.agents.includes(b.toLowerCase()));
    return g ? blocksAll(g) : blocksAll(star);
  });
}

function ruleHits(rule: string, path: string): boolean {
  if (rule === "/") return true;
  const r = rule.endsWith("/") ? rule.slice(0, -1) : rule;
  if (!r.startsWith("/")) return false;
  const p = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  return p === r || p.startsWith(`${r}/`);
}

/** Longest matching Allow or Disallow for User-agent * wins. Allow wins a tie. */
export function pathBlockedByRobots(robots: string | null, path: string): boolean {
  if (!robots) return false;
  const rules: { disallow: boolean; path: string }[] = [];
  let applies = false;
  let last = false;
  for (const raw of robots.split(/\r?\n/)) {
    const m = raw.replace(/#.*/, "").trim().match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const k = m[1].toLowerCase();
    const v = m[2].trim();
    if (k === "user-agent") {
      if (!last) applies = false;
      applies = applies || v === "*";
      last = true;
    } else {
      last = false;
      if (applies && (k === "disallow" || k === "allow") && v) rules.push({ disallow: k === "disallow", path: v });
    }
  }
  const p = path.startsWith("/") ? path : `/${path}`;
  let best: { len: number; disallow: boolean } | null = null;
  for (const r of rules) {
    if (!ruleHits(r.path, p)) continue;
    const len = r.path.length;
    if (!best || len > best.len || (len === best.len && !r.disallow)) best = { len, disallow: r.disallow };
  }
  return !!best?.disallow;
}

export function evaluateSearch(snapshot: CrawlSnapshot, client: SearchClientInput = {}): SearchAudit {
  const kindInfo = classifyBusiness(client);
  const base = {
    lastReviewed,
    foldNote: FOLD_NOTE,
    requestedUrl: snapshot.requestedUrl,
    finalUrl: snapshot.finalUrl || undefined,
    businessKind: kindInfo.kind,
    questionBank: kindInfo.bank,
    weightingNote: weightingNote(kindInfo.kind),
    pagesCrawled: snapshot.pages.map((p) => p.url),
    capped: snapshot.capped,
  };
  if (!snapshot.pages.length || snapshot.error) {
    return {
      ...base,
      mode: "unread",
      checks: [],
      questions: [],
      questionScore: null,
      areas: emptyAreas(),
      overall: null,
      leak: leakEstimate(client.figures, false),
      quickWins: [],
      ownerDecisions: [],
      unverified: [],
      unreadNote: snapshot.error || "We could not read the website, so search and conversion were not scored. Nothing here is guessed.",
    };
  }

  const home = snapshot.pages[0];
  const shell = isJsShell(home.html);
  const robotsBody = snapshot.robots && snapshot.robots.status >= 200 && snapshot.robots.status < 300 ? snapshot.robots.body : snapshot.robots && snapshot.robots.status === 404 ? "" : null;
  const checks: SearchCheck[] = [];
  checks.push(robotsIndexCheck(snapshot, robotsBody, home.url));
  checks.push(canonicalCheck(snapshot));
  checks.push(hostCheck(snapshot));
  checks.push(orphanCheck(snapshot));
  checks.push(...thinAndUtility(snapshot, robotsBody));
  checks.push(...aiCrawlerChecks(snapshot, robotsBody));
  checks.push(...llmsChecks(snapshot, client));
  checks.push(...schemaChecks(snapshot, shell));
  checks.push(...contentChecks(snapshot, shell));
  if (shell) {
    const questionsShell = unknownCheck("questions_shell", "questions", "Buyer questions were not scored.", "The homepage is built by JavaScript and the HTML has almost no text, so we did not mark questions as missing.", home.url, "medium");
    questionsShell.assumption = "Buyer questions were not scored from empty HTML. Nothing was marked missing.";
    checks.push(questionsShell);
    const conversionShell = unknownCheck("conversion_shell", "conversion", "First-screen conversion checks were not scored from empty HTML.", FOLD_NOTE, home.url, "low");
    conversionShell.assumption = "First-screen checks were not scored from empty HTML. Nothing was filled in.";
    checks.push(conversionShell);
  } else {
    checks.push(promiseCheck(home, client));
    checks.push(ratingCheck(snapshot, client));
    checks.push(ctaCheck(home));
    checks.push(priceCheck(snapshot));
    checks.push(serviceCheck(snapshot, client));
  }
  checks.push(gbpCheck(snapshot, client, shell));
  checks.push(leakInputsCheck(client, home.url));

  const questions = shell ? [] : scoreBuyerQuestions(snapshot.pages, QUESTION_BANKS[kindInfo.bank]);
  const questionScore = questions.length ? Math.round((questions.reduce((n, q) => n + (q.result === "clear" ? 1 : q.result === "partial" ? 0.5 : 0), 0) / questions.length) * 100) : null;
  if (!shell && questions.some((q) => q.result !== "clear")) {
    const missing = questions.filter((q) => q.result === "missing").length;
    const partial = questions.filter((q) => q.result === "partial").length;
    checks.push({
      id: "question_gap",
      area: "questions",
      status: questionScore !== null && questionScore >= 70 ? "partial" : "fail",
      points: 0,
      what: `${missing} of ${questions.length} buyer questions are missing${partial ? ` and ${partial} are only partly answered` : ""}.`,
      why: WHY.questions,
      page: home.url,
      effort: "About 10 minutes per missing answer, in your own words.",
      effortMins: 60,
      confidence: "medium",
      bucket: "owner-decision",
      assumption: questionGapAssumption(client),
    });
  }

  const areas = scoreAreas(checks, questionScore);
  const overall = scoreOverall(areas, kindInfo.kind);
  const findings = checks.filter((c) => c.status === "fail" || c.status === "partial");
  const order = (a: SearchCheck, b: SearchCheck) => (a.status === b.status ? a.effortMins - b.effortMins : a.status === "fail" ? -1 : 1);
  return {
    ...base,
    mode: "scored",
    checks,
    questions,
    questionScore,
    areas,
    overall,
    leak: leakEstimate(client.figures, true),
    quickWins: findings.filter((c) => c.bucket === "quick-win").sort(order),
    ownerDecisions: findings.filter((c) => c.bucket === "owner-decision").sort(order),
    unverified: checks.filter((c) => c.status === "unknown"),
  };
}

export function scoreBuyerQuestions(pages: HtmlPage[], bank: BuyerQuestion[]): QuestionResult[] {
  const prepared = pages.filter((p) => p.status >= 200 && p.status < 300 && /<html|<!doctype/i.test(p.html)).map((p) => ({
    url: p.url,
    text: norm(visibleText(p.html)),
    headings: norm(visibleText((p.html.match(/<h[1-3]\b[^>]*>[\s\S]*?<\/h[1-3]>/gi) ?? []).join(" "))),
  }));
  return bank.map((q) => {
    const phrases = q.phrases.map(norm).filter(Boolean);
    const topics = q.topics.map(norm).filter(Boolean);
    const signals = q.signals.map(norm).filter(Boolean);
    let partial: { url: string } | null = null;
    for (const page of prepared) {
      const phrase = phrases.find((p) => page.text.includes(p));
      const topic = topics.find((t) => page.text.includes(t));
      if (!phrase && !topic) continue;
      if (phrase) {
        const at = page.text.indexOf(phrase);
        const window = page.text.slice(at + phrase.length, at + phrase.length + SEARCH_LIMITS.answerWindowChars);
        const signalHit = signals.some((s) => (s === "$" ? /\d/.test(window) : window.includes(s)));
        if (signalHit) {
          const inHeading = page.headings.includes(phrase);
          return {
            id: q.id,
            question: q.text,
            result: "clear" as const,
            page: page.url,
            why: "A direct answer follows the question on this page.",
            confidence: inHeading ? "high" as const : "medium" as const,
            assumption: "Marked clear from words on the page. You have not confirmed this answer.",
          };
        }
      }
      if (!partial) partial = { url: page.url };
    }
    if (partial) {
      return {
        id: q.id,
        question: q.text,
        result: "partial",
        page: partial.url,
        why: "The topic is on this page, but a buyer does not get a direct answer.",
        confidence: "medium",
        effort: "Write a short answer in your own words. About 10 minutes.",
        assumption: "The topic is on the page. No answer was filled in.",
      };
    }
    return {
      id: q.id,
      question: q.text,
      result: "missing",
      why: "We did not find this answered on the pages we opened.",
      confidence: "medium",
      effort: "Write a short answer in your own words. About 10 minutes.",
    };
  });
}

function scoreAreas(checks: SearchCheck[], questionScore: number | null): Record<SearchArea, number | null> {
  const areas = emptyAreas();
  for (const area of Object.keys(areas) as SearchArea[]) {
    if (area === "questions") {
      areas.questions = questionScore;
      continue;
    }
    const known = checks.filter((c) => c.area === area && c.status !== "unknown" && c.points > 0);
    if (!known.length) continue;
    const avail = known.reduce((n, c) => n + c.points, 0);
    const earned = known.reduce((n, c) => n + (c.status === "pass" ? c.points : c.status === "partial" ? c.points / 2 : 0), 0);
    areas[area] = Math.round((earned / avail) * 100);
  }
  return areas;
}

function scoreOverall(areas: Record<SearchArea, number | null>, kind: BusinessKind): number | null {
  const w = AREA_WEIGHTS[kind];
  let num = 0;
  let den = 0;
  for (const area of Object.keys(areas) as SearchArea[]) {
    const score = areas[area];
    if (score === null) continue;
    num += score * w[area];
    den += w[area];
  }
  return den > 0 ? Math.round(num / den) : null;
}

function emptyAreas(): Record<SearchArea, number | null> {
  return { indexing: null, questions: null, "ai-search": null, conversion: null, gbp: null };
}

function robotsIndexCheck(snapshot: CrawlSnapshot, robotsBody: string | null, page: string): SearchCheck {
  if (robotsBody === null) return unknownCheck("robots_index", "indexing", "We could not read robots.txt.", "Indexing rules were not guessed.", page, "low");
  if (robotsBody && pathBlockedByRobots(robotsBody, "/")) {
    return failCheck("robots_index", "indexing", 3, "robots.txt tells search engines to skip the whole site.", WHY.robotsAll, page, "About 15 minutes, once you decide the site should be listed.", 15, "high", "owner-decision");
  }
  return passCheck("robots_index", "indexing", 3, "robots.txt does not block the whole site.", page);
}

function canonicalCheck(snapshot: CrawlSnapshot): SearchCheck {
  const htmlPages = snapshot.pages.filter((p) => p.status >= 200 && p.status < 300 && /<html|<!doctype/i.test(p.html));
  const home = htmlPages[0];
  if (!home) return unknownCheck("canonical", "indexing", "Homepage canonical was not checked.", "The homepage HTML was not available.", snapshot.finalUrl, "low");
  const homeHref = canonicalHref(home.html, home.url);
  const others = htmlPages.slice(1).filter((p) => !canonicalHref(p.html, p.url));
  if (!homeHref) {
    return failCheck("canonical", "indexing", 3, "The homepage has no canonical link.", WHY.canonical, home.url, "About 15 minutes.", 15, "high", "quick-win");
  }
  if (!sameUrl(homeHref, home.url)) {
    return failCheck("canonical", "indexing", 3, `The homepage canonical points at ${homeHref}, not at this page.`, WHY.canonical, home.url, "About 15 minutes.", 15, "high", "quick-win");
  }
  if (others.length) {
    return partialCheck("canonical", "indexing", 3, `The homepage canonical is correct. ${others.length} other page${others.length === 1 ? "" : "s"} we opened ${others.length === 1 ? "has" : "have"} no canonical link.`, WHY.canonical, others[0].url, "About 30 minutes.", 30, "high", "quick-win");
  }
  return passCheck("canonical", "indexing", 3, "The homepage canonical points at itself.", home.url);
}

function hostCheck(snapshot: CrawlSnapshot): SearchCheck {
  const https = snapshot.hostProbes.filter((p) => /^https:/i.test(p.url));
  const http = snapshot.hostProbes.filter((p) => /^http:/i.test(p.url));
  if (https.length < 2) return unknownCheck("host", "indexing", "The www and non-www addresses were not both checked.", "Host consolidation was not guessed.", snapshot.finalUrl, "low");
  const live = https.filter((p) => p.status >= 200 && p.status < 300);
  const failed = https.filter((p) => !p.status);
  if (live.length > 1) {
    return failCheck("host", "indexing", 3, "Both the www and the non-www address load as separate sites.", WHY.host, snapshot.finalUrl, "About 30 minutes in your host settings.", 30, "high", "quick-win");
  }
  if (live.length === 1 && failed.length) return unknownCheck("host", "indexing", "One of the host addresses did not answer, so consolidation was not scored.", "We only describe hosts we could open.", live[0].url, "low");
  if (live.length !== 1) return unknownCheck("host", "indexing", "Neither host address returned a normal page.", "Host consolidation was not guessed.", snapshot.finalUrl, "low");
  const preferred = new URL(live[0].url).hostname.toLowerCase();
  const other = https.find((p) => p !== live[0]);
  const httpsOk = !!other && redirectsTo(other, preferred);
  const bare = bareHost(preferred);
  const httpOpen = http.filter((p) => p.status >= 200 && p.status < 300);
  const httpOffHttps = http.filter((p) => p.status >= 300 && p.status < 400 && !httpsOnSameSite(p, bare));
  if (!httpsOk) {
    return failCheck("host", "indexing", 3, "The spare host does not redirect to the address that loads.", WHY.host, other?.url ?? snapshot.finalUrl, "About 30 minutes in your host settings.", 30, "high", "quick-win");
  }
  if (httpOpen.length || httpOffHttps.length) {
    return partialCheck("host", "indexing", 3, "The www and non-www addresses agree, but the old http address does not send people to https.", WHY.host, httpOpen[0]?.url ?? httpOffHttps[0]?.url ?? snapshot.finalUrl, "About 30 minutes in your host settings.", 30, "high", "quick-win");
  }
  if (!http.length || http.every((p) => !p.status)) return partialCheck("host", "indexing", 3, "The www and non-www addresses agree. The http address did not answer, so that redirect was not confirmed.", WHY.host, snapshot.finalUrl, "About 30 minutes if http is still open.", 30, "medium", "quick-win");
  return passCheck("host", "indexing", 3, "One host loads, the other redirects to it, and http redirects to https.", snapshot.finalUrl);
}

function orphanCheck(snapshot: CrawlSnapshot): SearchCheck {
  if (snapshot.sitemapStatus === null) return unknownCheck("orphans", "indexing", "The sitemap was not read, so orphan pages were not checked.", "We do not guess which pages lack a link.", snapshot.finalUrl, "low");
  if (snapshot.sitemapStatus === 404 || !snapshot.sitemapUrls.length) {
    return unknownCheck("orphans", "indexing", snapshot.sitemapStatus === 404 ? "No sitemap was found, so orphan pages were not checked." : "The sitemap has no page addresses, so orphan pages were not checked.", "An orphan is a sitemap page with no internal link. Without a sitemap list, that check does not run.", snapshot.finalUrl, "medium");
  }
  const host = bareHost(new URL(snapshot.finalUrl).hostname);
  const linked = new Set<string>();
  for (const page of snapshot.pages) {
    for (const href of hrefs(page.html, page.url)) {
      try {
        const u = new URL(href);
        if (bareHost(u.hostname) === host) linked.add(normalPage(u.toString()));
      } catch { /* skip */ }
    }
  }
  const homeKey = normalPage(snapshot.finalUrl);
  const orphans = snapshot.sitemapUrls.filter((u) => {
    try {
      const url = new URL(u);
      if (bareHost(url.hostname) !== host) return false;
      if (/\.(jpg|jpeg|png|gif|webp|pdf|xml|css|js)$/i.test(url.pathname)) return false;
      const key = normalPage(url.toString());
      return key !== homeKey && !linked.has(key);
    } catch { return false; }
  });
  if (!orphans.length) return passCheck("orphans", "indexing", 2, "Every sitemap page we checked has an internal link, or is the homepage.", snapshot.finalUrl);
  const shown = orphans.slice(0, 8).join(", ");
  const more = orphans.length > 8 ? ` and ${orphans.length - 8} more` : "";
  const cap = snapshot.capped ? " We did not open every page, so a link from a page we skipped would clear one of these." : "";
  const finding = failCheck("orphans", "indexing", 2, `${orphans.length} sitemap page${orphans.length === 1 ? "" : "s"} had no internal link: ${shown}${more}.${cap}`, WHY.orphans, orphans[0], "About 30 to 60 minutes. Add a link, or take the page out of the sitemap.", 45, snapshot.capped ? "medium" : "high", "quick-win");
  if (snapshot.capped) finding.assumption = "The crawl stopped at the page cap, so a link on a page we did not open could clear one of these.";
  return finding;
}

function thinAndUtility(snapshot: CrawlSnapshot, robotsBody: string | null): SearchCheck[] {
  const out: SearchCheck[] = [];
  const utility: HtmlPage[] = [];
  const thin: { page: HtmlPage; words: number; placeholder: boolean }[] = [];
  for (const page of snapshot.pages) {
    if (page.status < 200 || page.status >= 300 || !/<html|<!doctype/i.test(page.html)) continue;
    let path = "/";
    try { path = new URL(page.url).pathname; } catch { continue; }
    if (!indexable(page, robotsBody)) continue;
    if (UTILITY_PATH.test(path)) {
      utility.push(page);
      continue;
    }
    if (isJsShell(page.html)) continue;
    const text = visibleText(page.html);
    const words = text ? text.split(/\s+/).length : 0;
    const placeholder = PLACEHOLDER_RE.test(text);
    if (placeholder && words < SEARCH_LIMITS.placeholderWords) thin.push({ page, words, placeholder: true });
    else if (words < SEARCH_LIMITS.thinWords) thin.push({ page, words, placeholder: false });
  }
  if (utility.length) {
    out.push(failCheck("utility_indexable", "indexing", 2, `${utility.length} utility page${utility.length === 1 ? " is" : "s are"} open to Google: ${utility.map((p) => pathOf(p.url)).join(", ")}.`, WHY.utility, utility[0].url, "About 15 minutes. Add noindex, or leave them out of the sitemap.", 15, "high", "quick-win"));
  } else out.push(passCheck("utility_indexable", "indexing", 2, "Utility pages we opened are not indexable, or we did not find any.", snapshot.finalUrl));
  if (thin.length) {
    const placeholder = thin.every((t) => t.placeholder);
    const what = `${thin.length} thin page${thin.length === 1 ? " is" : "s are"} open to Google: ${thin.map((t) => `${pathOf(t.page.url)} (${t.words} words${t.placeholder ? ", placeholder copy" : ""})`).join("; ")}.`;
    out.push(placeholder
      ? failCheck("thin_indexable", "indexing", 2, what, WHY.thin, thin[0].page.url, "About 15 minutes to noindex a placeholder, or remove it from the sitemap.", 15, "high", "quick-win")
      : failCheck("thin_indexable", "indexing", 2, what, WHY.thin, thin[0].page.url, "Your call: write the page properly, or noindex it. About an hour if you write it.", 60, "medium", "owner-decision"));
  } else out.push(passCheck("thin_indexable", "indexing", 2, "Pages we opened are not thin placeholders left open to Google.", snapshot.finalUrl));
  return out;
}

function aiCrawlerChecks(snapshot: CrawlSnapshot, robotsBody: string | null): SearchCheck[] {
  const page = snapshot.finalUrl;
  if (robotsBody === null) {
    return [
      unknownCheck("ai_search_crawlers", "ai-search", "AI search crawlers were not checked.", "robots.txt did not load, so we did not guess who is blocked.", page, "low"),
      unknownCheck("ai_training_crawlers", "ai-search", "AI training crawlers were not checked.", "robots.txt did not load.", page, "low"),
    ];
  }
  if (!robotsBody.trim()) {
    return [
      passCheck("ai_search_crawlers", "ai-search", 3, "No robots.txt rules, so AI search crawlers are not blocked.", page),
      passCheck("ai_training_crawlers", "ai-search", 1, "No robots.txt rules, so AI training crawlers are not blocked.", page),
    ];
  }
  const searchBlocked = agentsBlocked(robotsBody, AI_SEARCH_CRAWLERS);
  const trainingBlocked = agentsBlocked(robotsBody, AI_TRAINING_CRAWLERS);
  const search = searchBlocked.length === 0
    ? passCheck("ai_search_crawlers", "ai-search", 3, "AI search crawlers are allowed.", page)
    : searchBlocked.length === AI_SEARCH_CRAWLERS.length
      ? failCheck("ai_search_crawlers", "ai-search", 3, `AI search crawlers are blocked: ${searchBlocked.join(", ")}.`, WHY.aiSearch, page, "About 15 minutes once you decide they may read the site.", 15, "high", "owner-decision")
      : partialCheck("ai_search_crawlers", "ai-search", 3, `Some AI search crawlers are blocked: ${searchBlocked.join(", ")}.`, WHY.aiSearch, page, "About 15 minutes once you decide.", 15, "high", "owner-decision");
  const training = trainingBlocked.length === 0
    ? passCheck("ai_training_crawlers", "ai-search", 1, "AI training crawlers are allowed.", page)
    : partialCheck("ai_training_crawlers", "ai-search", 1, `Some AI training crawlers are blocked: ${trainingBlocked.join(", ")}. Search crawlers are a separate check.`, WHY.aiTraining, page, "Leave the block if it is deliberate, or allow them. About 15 minutes.", 15, "high", "owner-decision");
  return [search, training];
}

function llmsChecks(snapshot: CrawlSnapshot, client: SearchClientInput): SearchCheck[] {
  let page = snapshot.finalUrl;
  try {
    const u = new URL(snapshot.finalUrl);
    page = `${u.protocol}//${u.host}/llms.txt`;
  } catch { /* keep the final URL if it is not parseable */ }
  const doc = snapshot.llms;
  if (!doc) return [unknownCheck("llms_present", "ai-search", "llms.txt was not checked.", "The file did not load, so we did not mark it missing.", page, "low"), unknownCheck("llms_accurate", "ai-search", "llms.txt accuracy was not checked.", "The file did not load.", page, "low")];
  if (doc.status === 404 || doc.status === 410) {
    return [
      failCheck("llms_present", "ai-search", 2, "No llms.txt file.", WHY.llms, page, "About 30 minutes to write a plain summary of the business.", 30, "high", "quick-win"),
      unknownCheck("llms_accurate", "ai-search", "llms.txt accuracy was not checked.", "There is no file to compare.", page, "high"),
    ];
  }
  if (doc.status < 200 || doc.status >= 300) return [unknownCheck("llms_present", "ai-search", "llms.txt did not return a normal response.", "We did not mark it missing.", page, "low"), unknownCheck("llms_accurate", "ai-search", "llms.txt accuracy was not checked.", "The file did not load cleanly.", page, "low")];
  const body = doc.body.trim();
  if (/<html/i.test(body.slice(0, 400))) {
    return [failCheck("llms_present", "ai-search", 2, "The llms.txt address returned a web page, not a plain summary.", WHY.llms, page, "About 30 minutes.", 30, "high", "quick-win"), unknownCheck("llms_accurate", "ai-search", "llms.txt accuracy was not checked.", "The file is a web page, not a summary.", page, "high")];
  }
  if (body.length < 40) {
    return [partialCheck("llms_present", "ai-search", 2, "llms.txt exists but says almost nothing.", WHY.llms, page, "About 30 minutes.", 30, "high", "quick-win"), unknownCheck("llms_accurate", "ai-search", "llms.txt accuracy was not checked.", "The file is too short to compare.", page, "high")];
  }
  const present = passCheck("llms_present", "ai-search", 2, "llms.txt is present.", page);
  const name = (client.name ?? "").trim();
  if (!name) {
    const accurate = unknownCheck("llms_accurate", "ai-search", "llms.txt is present. Accuracy was not scored because no business name was supplied.", "We do not invent a name to compare it with.", page, "medium");
    accurate.assumption = "No business name was supplied, so accuracy was not scored.";
    return [present, accurate];
  }
  if (!nameMatches(body, name)) {
    return [present, failCheck("llms_accurate", "ai-search", 2, `llms.txt does not mention ${name}.`, WHY.llms, page, "About 15 minutes to add the real name and what you do.", 15, "high", "quick-win")];
  }
  const services = (client.services ?? []).map((s) => s.trim()).filter(Boolean);
  const missed = services.filter((s) => !nameMatches(body, s) && !body.toLowerCase().includes(s.toLowerCase()));
  if (missed.length) {
    return [present, partialCheck("llms_accurate", "ai-search", 2, `llms.txt names the business, but it does not mention: ${missed.join(", ")}.`, WHY.llms, page, "About 15 minutes.", 15, "medium", "quick-win")];
  }
  const accurate = passCheck("llms_accurate", "ai-search", 2, services.length ? "llms.txt names the business and the services you supplied." : "llms.txt names the business. No service list was supplied, so only the name was checked.", page);
  if (!services.length) accurate.assumption = "No service list was supplied, so only the business name was checked.";
  return [present, accurate];
}

const BUSINESS_TYPE_RE = /LocalBusiness|Organization|ProfessionalService|HomeAndConstructionBusiness|MedicalBusiness|FinancialService|LegalService|RealEstateAgent|AccountingService|Store|Dentist|Attorney|Plumber|Electrician|Contractor|HousePainter|RoofingContractor|Locksmith|HVACBusiness|GeneralContractor|MedicalClinic|Physician|Restaurant|AutoRepair|HomeAndConstructionBusiness/i;

function schemaChecks(snapshot: CrawlSnapshot, shell: boolean): SearchCheck[] {
  const home = snapshot.pages[0];
  const nodes = snapshot.pages.flatMap((p) => jsonLd(p.html).map((n) => ({ n, url: p.url, text: visibleText(p.html) })));
  const business = nodes.filter(({ n }) => {
    const types = ldTypes(n);
    if (types.some((t) => BUSINESS_TYPE_RE.test(t))) return true;
    return types.length > 0 && !!n.name && !!(n.address || n.telephone);
  });
  const schemaBusiness = business.length
    ? passCheck("schema_business", "ai-search", 2, "The site has business structured data.", business[0].url)
    : shell
      ? unknownCheck("schema_business", "ai-search", "Business structured data was not judged on a JavaScript shell.", "Head markup was checked, and none was found in the HTML. It may be added after load. We did not guess.", home.url, "low")
      : failCheck("schema_business", "ai-search", 2, "No business structured data (LocalBusiness, Organization, or a similar type).", WHY.schema, home.url, "About 1 hour.", 60, "high", "quick-win");

  const mismatches: string[] = [];
  let mismatchPage = home.url;
  for (const { n, url, text } of nodes) {
    const digits = text.replace(/\D/g, "");
    const name = typeof n.name === "string" ? n.name : "";
    if (name && ldTypes(n).some((t) => BUSINESS_TYPE_RE.test(t) || /Organization|LocalBusiness/i.test(t)) && !nameMatches(text, name)) {
      mismatches.push(`Business name in the code is "${name}", which is not in the visible text.`);
      mismatchPage = url;
    }
    const phone = typeof n.telephone === "string" ? n.telephone : "";
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length >= 8 && !digits.includes(phoneDigits.slice(-8))) {
      mismatches.push(`Phone in the code is ${phone}, which is not in the visible text.`);
      mismatchPage = url;
    }
    for (const price of ldPrices(n)) {
      const d = price.replace(/[^\d.]/g, "");
      if (d && !text.replace(/,/g, "").includes(d)) {
        mismatches.push(`Price in the code is ${price}, which is not in the visible text.`);
        mismatchPage = url;
      }
    }
    if (ldTypes(n).includes("FAQPage")) {
      for (const q of ldFaqQuestions(n)) {
        if (q && !norm(text).includes(norm(q))) {
          mismatches.push(`FAQ schema asks "${q}", which is not in the visible text.`);
          mismatchPage = url;
        }
      }
    }
  }
  const uniqueMismatches = [...new Set(mismatches)];
  const schemaMatch = !business.length && uniqueMismatches.length === 0
    ? unknownCheck("schema_match", "ai-search", "Structured data was not compared with the page.", "There was no business or FAQ block to compare. We did not invent values.", home.url, "high")
    : uniqueMismatches.length
      ? failCheck("schema_match", "ai-search", 3, uniqueMismatches.slice(0, 4).join(" "), WHY.schema, mismatchPage, "About 1 hour to make the code match the page.", 60, "high", "quick-win")
      : passCheck("schema_match", "ai-search", 3, "Structured data we found matches the visible page. No extra prices or ratings were added.", home.url);

  const faqNodes = nodes.filter(({ n }) => ldTypes(n).includes("FAQPage"));
  const visibleFaqs = snapshot.pages.some((p) => (p.html.match(/<h[2-4][^>]*>[^<]*\?/gi) ?? []).length >= 2 || /\bfaq\b|frequently asked/i.test(p.html));
  const faq = faqNodes.length
    ? passCheck("schema_faq", "ai-search", 1, "FAQ schema is present.", faqNodes[0].url)
    : visibleFaqs
      ? partialCheck("schema_faq", "ai-search", 1, "The page asks questions, but they are not marked up as an FAQ.", WHY.faq, home.url, "About 30 minutes.", 30, "medium", "quick-win")
      : shell
        ? unknownCheck("schema_faq", "ai-search", "FAQ schema was not judged on a JavaScript shell.", FOLD_NOTE, home.url, "low")
        : partialCheck("schema_faq", "ai-search", 1, "No FAQ schema, and no clear question-and-answer block on the pages we opened.", WHY.faq, home.url, "About 1 hour to write real questions buyers ask.", 60, "medium", "owner-decision");

  const inner = snapshot.pages.slice(1).filter((p) => p.status >= 200 && p.status < 300);
  const crumbs = nodes.filter(({ n }) => ldTypes(n).includes("BreadcrumbList"));
  const breadcrumb = !inner.length
    ? unknownCheck("schema_breadcrumb", "ai-search", "Breadcrumbs were not checked.", "We did not open an inner page.", home.url, "medium")
    : crumbs.length
      ? passCheck("schema_breadcrumb", "ai-search", 1, "Breadcrumb schema is present.", crumbs[0].url)
      : partialCheck("schema_breadcrumb", "ai-search", 1, "Inner pages we opened have no breadcrumb schema.", WHY.breadcrumb, inner[0].url, "About 30 minutes.", 30, "medium", "quick-win");

  const posts = snapshot.pages.filter((p) => {
    try { return BLOG_PATH.test(new URL(p.url).pathname); } catch { return false; }
  });
  const article = !posts.length
    ? unknownCheck("schema_article", "ai-search", "Article schema was not checked.", "No blog or news page was in the pages we opened.", home.url, "medium")
    : posts.some((p) => jsonLd(p.html).some((n) => ldTypes(n).some((t) => /Article|BlogPosting|NewsArticle/i.test(t))))
      ? passCheck("schema_article", "ai-search", 1, "Article pages include article schema.", posts[0].url)
      : partialCheck("schema_article", "ai-search", 1, "A blog or news page has no article schema.", WHY.article, posts[0].url, "About 30 minutes.", 30, "medium", "quick-win");

  return [schemaBusiness, schemaMatch, faq, breadcrumb, article];
}

function contentChecks(snapshot: CrawlSnapshot, shell: boolean): SearchCheck[] {
  if (shell) {
    return [
      unknownCheck("answerable_pricing", "ai-search", "Pricing content was not scored.", "The HTML has almost no text.", snapshot.finalUrl, "low"),
      unknownCheck("comparison", "ai-search", "Comparison content was not scored.", "The HTML has almost no text.", snapshot.finalUrl, "low"),
    ];
  }
  const blob = snapshot.pages.map((p) => visibleText(p.html)).join("\n");
  const low = ` ${norm(blob)} `;
  const prices = moneyMentions(blob);
  const pricingPhrase = /pric|fee|from \$|cost|quote|charg/i.test(blob);
  const pricing = prices.length && pricingPhrase
    ? passCheck("answerable_pricing", "ai-search", 2, `A price is written on the site: ${prices[0]}.`, pageWith(snapshot, prices[0]) ?? snapshot.finalUrl)
    : failCheck("answerable_pricing", "ai-search", 2, "No price a buyer can read on the pages we opened. We have not invented one.", WHY.pricing, snapshot.finalUrl, "Your call whether to publish a starting price. The edit itself is short.", 30, "medium", "owner-decision");
  const compared = COMPARISON_PHRASES.some((p) => low.includes(norm(p)));
  const comparison = compared
    ? passCheck("comparison", "ai-search", 1, "The site compares options or explains a choice in plain words.", pageWith(snapshot, "compar") ?? snapshot.finalUrl)
    : partialCheck("comparison", "ai-search", 1, "Nothing on the pages we opened compares options or explains the choice.", WHY.comparison, snapshot.finalUrl, "Your call. A short comparison is about an hour to write.", 60, "medium", "owner-decision");
  return [pricing, comparison];
}

function promiseCheck(home: HtmlPage, client: SearchClientInput): SearchCheck {
  const screen = visibleText(firstScreenHtml(home.html));
  const promise = (client.promise ?? "").trim();
  if (promise) {
    const words = significant(promise);
    const hit = words.filter((w) => norm(screen).includes(w));
    const ratio = words.length ? hit.length / words.length : 0;
    if (ratio >= 0.6) return passCheck("promise", "conversion", 2, "The promise you supplied appears in the first screen.", home.url);
    if (ratio >= 0.3) return partialCheck("promise", "conversion", 2, "Only part of the promise you supplied appears in the first screen.", WHY.promise, home.url, "Your call on the wording. The edit is about 15 minutes.", 15, "medium", "owner-decision");
    return failCheck("promise", "conversion", 2, "The promise you supplied does not appear in the first screen.", WHY.promise, home.url, "Your call on the wording. The edit is about 15 minutes.", 15, "medium", "owner-decision");
  }
  const title = (home.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const h1 = visibleText((home.html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i)?.[0] ?? ""));
  const assumption = "No promise was supplied, so the title and the heading were compared. That is not your offer in your words.";
  if (!title && !h1) {
    const check = failCheck("promise", "conversion", 2, "The homepage has no title and no main heading to carry the promise.", WHY.promise, home.url, "Your call on the words. About 15 minutes to add a heading.", 15, "medium", "owner-decision");
    check.assumption = assumption;
    return check;
  }
  const tw = significant(title);
  const hw = new Set(significant(h1));
  const overlap = tw.length ? tw.filter((w) => hw.has(w)).length / tw.length : h1 ? 1 : 0;
  if (title && h1 && overlap >= 0.5) {
    const check = passCheck("promise", "conversion", 2, `No separate promise was supplied. The title and the main heading agree. Heading: "${clip(h1, 120)}".`, home.url);
    check.assumption = assumption;
    return check;
  }
  if (title && h1) {
    const check = partialCheck("promise", "conversion", 2, `No promise was supplied. The title and the main heading do not say the same thing. Title: "${clip(title, 120)}". Heading: "${clip(h1, 120)}".`, WHY.promise, home.url, "Your call on which line is the promise.", 20, "medium", "owner-decision");
    check.assumption = assumption;
    return check;
  }
  const check = partialCheck("promise", "conversion", 2, `No promise was supplied. ${title ? "There is a title but no main heading." : "There is a main heading but no title."}`, WHY.promise, home.url, "About 15 minutes.", 15, "medium", "owner-decision");
  check.assumption = assumption;
  return check;
}

function ratingCheck(snapshot: CrawlSnapshot, client: SearchClientInput): SearchCheck {
  const home = snapshot.pages[0];
  const screenText = visibleText(firstScreenHtml(home.html));
  const fullText = snapshot.pages.map((p) => visibleText(p.html)).join("\n");
  const onScreen = ratingIn(screenText);
  const onPage = ratingIn(fullText);
  const stated = cleanRating(client.statedGoogleRating);
  const reviews = cleanReviews(client.statedGoogleReviews);
  const told = stated !== undefined ? ` You told us your Google rating is ${stated}${reviews !== undefined ? ` from ${reviews} reviews` : ""}.` : "";
  if (onScreen) return passCheck("rating_fold", "conversion", 2, `The first screen shows a rating of ${onScreen}. That number is on the page.${told}`, home.url);
  if (onPage) return partialCheck("rating_fold", "conversion", 2, `A rating of ${onPage} is on the page, but not in the first screen.${told}`, WHY.rating, home.url, "About 30 minutes to move the real rating up.", 30, "medium", "owner-decision");
  const schemaRating = ldRating(home.html);
  if (schemaRating) return partialCheck("rating_fold", "conversion", 2, `The page code includes a rating of ${schemaRating}, but that number is not in the first screen text.${told}`, WHY.rating, home.url, "About 30 minutes, and only show a rating that is true.", 30, "medium", "owner-decision");
  return failCheck("rating_fold", "conversion", 2, `No Google rating is visible in the first screen. We have not guessed one.${told}`, WHY.rating, home.url, "Your call to show the real Google rating. We will not invent one.", 30, "medium", "owner-decision");
}

function ctaCheck(home: HtmlPage): SearchCheck {
  const html = firstScreenHtml(home.html);
  const text = visibleText(html);
  const tel = /href\s*=\s*["']tel:/i.test(html) || /href\s*=\s*["']sms:/i.test(html);
  const book = /calendly|href\s*=\s*["'][^"']*(book|quote|appointment)/i.test(html) || /\b(book now|get a quote|request a quote|call us|call now|book a call|free quote|make a booking)\b/i.test(text);
  if (tel || book) return passCheck("cta_fold", "conversion", 3, tel ? "The first screen has a tap-to-call link." : "The first screen has a book or quote action.", home.url);
  return failCheck("cta_fold", "conversion", 3, "The first screen has no call or book action.", WHY.cta, home.url, "About 30 minutes.", 30, "medium", "quick-win");
}

function priceCheck(snapshot: CrawlSnapshot): SearchCheck {
  const home = snapshot.pages[0];
  const screen = visibleText(firstScreenHtml(home.html));
  const fromScreen = screen.match(/from\s+\$\s?[\d,]+(?:\.\d{2})?/i);
  if (fromScreen) return passCheck("from_price", "conversion", 2, `The first screen shows a starting price: ${fromScreen[0]}.`, home.url);
  const anyScreen = moneyMentions(screen);
  if (anyScreen.length) return partialCheck("from_price", "conversion", 2, `The first screen shows ${anyScreen[0]}, but not as a starting price ('from $X').`, WHY.fromPrice, home.url, "Your call on the wording. About 15 minutes.", 15, "medium", "owner-decision");
  const deeper = snapshot.pages.map((p) => ({ url: p.url, hit: moneyMentions(visibleText(p.html))[0] })).find((p) => p.hit);
  if (deeper?.hit) return partialCheck("from_price", "conversion", 2, `A price appears further down (${deeper.hit}), not in the first screen.`, WHY.fromPrice, deeper.url, "Your call. Moving a real price up is about 15 minutes.", 15, "medium", "owner-decision");
  return failCheck("from_price", "conversion", 2, "No starting price is on the pages we opened. We have not made one up.", WHY.fromPrice, home.url, "Your call whether to publish a 'from' price.", 20, "medium", "owner-decision");
}

function serviceCheck(snapshot: CrawlSnapshot, client: SearchClientInput): SearchCheck {
  const home = snapshot.pages[0];
  const supplied = (client.services ?? []).map((s) => s.trim()).filter((s) => s.length > 1);
  if (supplied.length) {
    const nav = navServices(home);
    const missing = supplied.filter((service) => {
      if (snapshot.pages.slice(1).some((p) => pageAbout(p, service))) return false;
      return !nav.some((n) => linkAbout(n, service));
    });
    if (!missing.length) return passCheck("service_pages", "conversion", 2, "Each service you listed has its own page.", home.url);
    return failCheck("service_pages", "conversion", 2, `These services do not have their own page: ${missing.join(", ")}.`, WHY.services, home.url, "Your call which services deserve a page. Each page is a writing job.", 120, "medium", "owner-decision");
  }
  const assumption = "No service list was supplied. The menu was treated as the list, which may not be what you sell.";
  const nav = navServices(home);
  if (nav.length < 2) {
    const check = unknownCheck("service_pages", "conversion", "One page per service was not scored.", "No service list was supplied, and the menu does not show separate services. We have not invented a list.", home.url, "medium");
    check.assumption = assumption;
    return check;
  }
  const distinct = new Set(nav.map((n) => {
    try { return new URL(n.url).pathname.replace(/\/+$/, "") || "/"; } catch { return n.url; }
  }));
  if (distinct.size === 1 && [...distinct][0] === "/") {
    const check = failCheck("service_pages", "conversion", 2, `The menu names ${nav.map((n) => n.text).join(", ")}, but they all point at the homepage.`, WHY.services, home.url, "Your call which of these get a page.", 120, "medium", "owner-decision");
    check.assumption = assumption;
    return check;
  }
  const check = passCheck("service_pages", "conversion", 2, `The menu gives these their own pages: ${nav.map((n) => n.text).join(", ")}.`, home.url);
  check.assumption = assumption;
  return check;
}

function gbpCheck(snapshot: CrawlSnapshot, client: SearchClientInput, shell: boolean): SearchCheck {
  if (shell) return unknownCheck("gbp_link", "gbp", "The Google profile link was not checked.", "The homepage HTML has almost no text.", snapshot.finalUrl, "low");
  const html = snapshot.pages.map((p) => p.html).join("\n");
  const linked = /google\.[a-z.]+\/maps|maps\.google|g\.page\/|g\.co\/kgs|share\.google\/|goo\.gl\/maps|maps\.app\.goo\.gl/i.test(html);
  const stated = cleanRating(client.statedGoogleRating);
  const note = stated !== undefined ? ` You told us the rating is ${stated}. We did not look it up.` : " We did not look up a rating.";
  if (linked) return passCheck("gbp_link", "gbp", 3, `The site links to a Google profile.${note}`, pageWith(snapshot, "google.") ?? snapshot.finalUrl);
  return failCheck("gbp_link", "gbp", 3, `No Google profile link on the pages we opened.${note}`, WHY.gbp, snapshot.finalUrl, "Your call to link the real profile. About 10 minutes once you have the address.", 15, "medium", "owner-decision");
}

function questionGapAssumption(client: SearchClientInput): string {
  const firm = (client.firmType ?? "").toLowerCase().trim();
  const knownFirm = ["law", "legal", "accounting", "financial-advisory", "financial", "professional", "real-estate", "real estate", "property"].includes(firm);
  const typed = Boolean(client.businessKind || knownFirm || (client.industry ?? "").trim());
  const base = "A question is marked clear only when the page uses a set phrase and a nearby signal. Different wording can be missed.";
  if (typed) return base;
  return `${base} Business type was not confirmed, so the question list is a best fit from the words on hand.`;
}

function leakInputsCheck(client: SearchClientInput, page: string): SearchCheck {
  const figures = cleanFigures(client.figures);
  const ready = figures?.missedEnquiriesPerMonth !== undefined && figures.closeRate !== undefined && figures.averageJobAud !== undefined;
  if (ready) {
    return passCheck("leak_inputs", "conversion", 0, "Missed enquiries, close rate, and average job value were supplied by the client.", page);
  }
  const check = unknownCheck("leak_inputs", "conversion", figures ? "The leak estimate is still missing one of the three client numbers." : "The leak estimate has no client numbers.", "A dollar figure is only your arithmetic. Missing numbers are not estimated.", page, "high");
  check.points = 0;
  check.assumption = "Missing enquiry, close rate, or job value figures were not estimated.";
  return check;
}

function passCheck(id: string, area: SearchArea, points: number, what: string, page: string): SearchCheck {
  return { id, area, status: "pass", points, what, why: "", page, effort: "", effortMins: 0, confidence: "high", bucket: "quick-win" };
}
function failCheck(id: string, area: SearchArea, points: number, what: string, why: string, page: string | undefined, effort: string, effortMins: number, confidence: Confidence, bucket: FindingBucket): SearchCheck {
  return { id, area, status: "fail", points, what, why, page, effort, effortMins, confidence, bucket };
}
function partialCheck(id: string, area: SearchArea, points: number, what: string, why: string, page: string | undefined, effort: string, effortMins: number, confidence: Confidence, bucket: FindingBucket): SearchCheck {
  return { id, area, status: "partial", points, what, why, page, effort, effortMins, confidence, bucket };
}
function unknownCheck(id: string, area: SearchArea, what: string, why: string, page: string | undefined, confidence: Confidence): SearchCheck {
  return { id, area, status: "unknown", points: 1, what, why, page, effort: "", effortMins: 0, confidence, bucket: "owner-decision" };
}

function indexable(page: HtmlPage, robotsBody: string | null): boolean {
  const headers = page.headers ?? {};
  const xrobots = `${headers["x-robots-tag"] ?? ""}`;
  if (/noindex/i.test(xrobots)) return false;
  if (/<meta\b[^>]*(?:name\s*=\s*["']robots["'][^>]*content\s*=\s*["'][^"']*noindex|content\s*=\s*["'][^"']*noindex[^"']*["'][^>]*name\s*=\s*["']robots["'])/i.test(page.html)) return false;
  try {
    if (robotsBody && pathBlockedByRobots(robotsBody, new URL(page.url).pathname)) return false;
  } catch { /* ignore */ }
  return true;
}

function canonicalHref(html: string, pageUrl: string): string | null {
  const tag = html.match(/<link\b[^>]*rel\s*=\s*["'][^"']*canonical[^"']*["'][^>]*>/i)?.[0] ?? html.match(/<link\b[^>]*href\s*=\s*["'][^"']+["'][^>]*rel\s*=\s*["'][^"']*canonical[^"']*["'][^>]*>/i)?.[0];
  if (!tag) return null;
  const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
  if (!href) return null;
  try { return new URL(href, pageUrl).toString(); } catch { return null; }
}

function sameUrl(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    const path = (p: string) => p.replace(/\/+$/, "") || "/";
    return ua.protocol === ub.protocol && ua.host.toLowerCase() === ub.host.toLowerCase() && path(ua.pathname) === path(ub.pathname);
  } catch { return false; }
}

function redirectsTo(p: HostProbe, hostname: string): boolean {
  if (p.status < 300 || p.status >= 400 || !p.location) return false;
  try {
    const u = new URL(p.location, p.url);
    return u.protocol === "https:" && u.hostname.toLowerCase() === hostname.toLowerCase();
  } catch { return false; }
}

/** http may hop via the other host (apex https, then www). It still has to land on https for this site. */
function httpsOnSameSite(p: HostProbe, bare: string): boolean {
  if (p.status < 300 || p.status >= 400 || !p.location) return false;
  try {
    const u = new URL(p.location, p.url);
    return u.protocol === "https:" && bareHost(u.hostname) === bare;
  } catch { return false; }
}

function normalPage(url: string): string {
  const u = new URL(url);
  const path = u.pathname.replace(/\/+$/, "") || "/";
  return `${bareHost(u.hostname)}${path}`.toLowerCase();
}

function hrefs(html: string, base: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)) {
    const raw = m[1].trim();
    if (!raw || /^(mailto|tel|sms|javascript):/i.test(raw)) continue;
    try { out.push(new URL(raw, base).toString()); } catch { /* skip */ }
  }
  return out;
}

function pathOf(url: string): string {
  try { return new URL(url).pathname || "/"; } catch { return url; }
}

function pageWith(snapshot: CrawlSnapshot, needle: string): string | undefined {
  const n = needle.toLowerCase();
  return snapshot.pages.find((p) => visibleText(p.html).toLowerCase().includes(n) || p.html.toLowerCase().includes(n))?.url;
}

function moneyMentions(text: string): string[] {
  return [...text.matchAll(/\$\s?[\d,]+(?:\.\d{2})?/g)].map((m) => m[0].replace(/\s+/g, ""));
}

function ratingIn(text: string): string | null {
  const m = text.match(/(\d(?:\.\d)?)\s*(?:\/\s*5|out of\s*5|stars?)/i) ?? text.match(/(?:rated|rating)\s+(\d(?:\.\d)?)/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return m[1];
}

function ldRating(html: string): string | null {
  for (const n of jsonLd(html)) {
    const agg = n.aggregateRating;
    if (agg && typeof agg === "object" && !Array.isArray(agg)) {
      const v = (agg as Record<string, unknown>).ratingValue;
      if (typeof v === "number" || (typeof v === "string" && v.trim())) return String(v);
    }
  }
  return null;
}

function ldPrices(n: Record<string, unknown>): string[] {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    const o = node as Record<string, unknown>;
    if (typeof o.price === "number" || (typeof o.price === "string" && /\d/.test(o.price))) out.push(String(o.price));
    for (const k of ["offers", "priceSpecification", "hasOfferCatalog", "itemListElement"]) walk(o[k]);
  };
  walk(n.offers);
  walk(n.priceSpecification);
  walk(n.hasOfferCatalog);
  return out;
}

function ldFaqQuestions(n: Record<string, unknown>): string[] {
  const out: string[] = [];
  const entities = Array.isArray(n.mainEntity) ? n.mainEntity : n.mainEntity ? [n.mainEntity] : [];
  for (const e of entities) {
    if (!e || typeof e !== "object") continue;
    const name = (e as Record<string, unknown>).name;
    if (typeof name === "string") out.push(name);
  }
  return out;
}

function pageAbout(page: HtmlPage, service: string): boolean {
  const blob = norm(`${page.url} ${visibleText((page.html.match(/<title[^>]*>[\s\S]*?<\/title>/i)?.[0] ?? "") + (page.html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i)?.[0] ?? ""))}`);
  return wordsMatch(blob, service);
}

function linkAbout(link: { text: string; url: string }, service: string): boolean {
  let path = "";
  try { path = decodeURIComponent(new URL(link.url).pathname).replace(/[-_/]+/g, " "); } catch { path = link.url; }
  return wordsMatch(norm(`${link.text} ${path}`), service);
}

function wordsMatch(blob: string, service: string): boolean {
  const words = significant(service);
  if (!words.length) return blob.includes(norm(service));
  return words.filter((w) => blob.includes(w)).length / words.length >= 0.6;
}

const NAV_SKIP = /^(home|about|about us|contact|contact us|blog|news|faq|privacy|terms|login|log in|client login|sign in|signin|menu|services)$/i;

function navServices(home: HtmlPage): { text: string; url: string }[] {
  const nav = (home.html.match(/<(?:nav|header)\b[\s\S]*?<\/(?:nav|header)>/gi) ?? []).join("\n");
  const out: { text: string; url: string }[] = [];
  let host = "";
  try { host = bareHost(new URL(home.url).hostname); } catch { return []; }
  for (const m of nav.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = visibleText(m[2]).replace(/\s+/g, " ").trim();
    if (!text || text.length > 40 || NAV_SKIP.test(text)) continue;
    try {
      const u = new URL(m[1], home.url);
      if (bareHost(u.hostname) !== host) continue;
      if (/\.(jpg|png|pdf|css|js)$/i.test(u.pathname)) continue;
      out.push({ text, url: u.toString() });
    } catch { /* skip */ }
  }
  const seen = new Set<string>();
  return out.filter((item) => {
    const key = norm(item.text);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

function nameMatches(page: string, name: string): boolean {
  const n = (x: string) => x.toLowerCase().replace(/[\u2018\u2019'`]/g, "").replace(/&amp;|&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
  const words = n(name).split(" ").filter((w) => w.length > 2 && !["the", "and", "pty", "ltd"].includes(w));
  const blob = ` ${n(page)} `;
  if (!words.length) return blob.includes(` ${n(name)} `);
  return words.filter((w) => blob.includes(w)).length / words.length >= 0.6;
}

function significant(s: string): string[] {
  return norm(s).split(" ").filter((w) => w.length > 3 && !["this", "that", "with", "from", "your", "have", "will", "about"].includes(w));
}

function norm(s: string): string {
  return s.toLowerCase().replace(/&amp;/g, " and ").replace(/[^a-z0-9$% ]+/g, " ").replace(/\s+/g, " ").trim();
}

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n - 3)}...`;
}

function num(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function cleanRating(v: unknown): number | undefined {
  const n = num(v);
  if (n === undefined || n < 1 || n > 5) return undefined;
  return Math.round(n * 10) / 10;
}

function cleanReviews(v: unknown): number | undefined {
  const n = num(v);
  if (n === undefined || n < 0 || n > 1000000) return undefined;
  return Math.round(n);
}
