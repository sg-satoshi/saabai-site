/**
 * Blueprint search onboarding.
 *
 * The paid fact-find (lib/audit-factfind.ts) collects team and workflow
 * answers and does not crawl. Search checks (search-rules.ts) score a
 * GET-only crawl plus an optional searchBrief. This module connects them:
 * read the site, ask only for facts the crawl cannot see, and turn buyer
 * question gaps into FAQ drafts that stay unpublished.
 *
 * Every question's checkId is a SEARCH_CHECK_IDS entry. Nothing here invents
 * a price, a rating, or an answer. Search Console and GA4 are an invite
 * instruction only.
 */

import {
  QUESTION_BANKS,
  SEARCH_CHECK_IDS,
  classifyBusiness,
  cleanFigures,
  evaluateSearch,
  isJsShell,
  jsonLd,
  ldTypes,
  visibleText,
  type CrawlSnapshot,
  type HtmlPage,
  type QuestionBankId,
  type SearchCheckId,
  type SearchClientInput,
} from "./search-rules";

export const ANALYTICS_INVITE_HELP =
  "Optional. In Google Search Console and in GA4, invite hello@saabai.ai as a read-only user. Do not type a password or send a login.";

export const PREVIEW_SAMPLE_URL = "https://preview.example/";

export type AnswerValue = string | number | null;
export type Answers = Record<string, AnswerValue>;

export type SiteFaq = { question: string; answer: string; page?: string };

export type SitePrefill = {
  url: string;
  services: string[];
  phone: string | null;
  serviceAreas: string | null;
  promise: string | null;
  gbpUrl: string | null;
  /** Written on the page. Never copied into the rating the client states. */
  ratingSeen: string | null;
  faqs: SiteFaq[];
  schemaTypes: string[];
  robots: "present" | "missing" | "unread";
  llms: "present" | "missing" | "unread";
  llmsExcerpt: string | null;
  sitemapPages: number | null;
  industryHint: string | null;
  shell: boolean;
  settledCheckIds: SearchCheckId[];
  pagesRead: number;
  note: string | null;
};

export type SearchOnboardingRecord = {
  updatedAt: string;
  completedAt?: string;
  crawlUrl?: string;
  prefill?: SitePrefill;
  answers: Answers;
};

export type FaqDraftStatus = "admin_review" | "client_review" | "approved" | "unanswered";
export type FaqAnswerSource = "client" | "site" | "unanswered";

export type FaqDraft = {
  id: string;
  buyerQuestionId: string | null;
  question: string;
  answer: string;
  source: FaqAnswerSource;
  sourceDetail: string;
  status: FaqDraftStatus;
  checkId: "question_gap" | "schema_faq";
};

export type FaqPageDoc = {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: { "@type": "Answer"; text: string };
  }>;
};

export type FaqDraftRecord = {
  generatedAt: string;
  questionBank: QuestionBankId;
  drafts: FaqDraft[];
  /** Answered drafts only. This document is not published to the website. */
  faqPage: FaqPageDoc | null;
  published: false;
};

export type OnboardingBrief = {
  promise?: string;
  services?: string[];
  businessKind?: "local-trade" | "professional" | "property" | "general";
  industry?: string;
  statedGoogleRating?: number;
  statedGoogleReviews?: number;
  figures?: {
    missedEnquiriesPerMonth?: number;
    closeRate?: number;
    averageJobAud?: number;
  };
};

export type FieldType = "text" | "textarea" | "number" | "select" | "choice" | "qa";

export type IntakeField = {
  id: string;
  checkId: SearchCheckId;
  label: string;
  help?: string;
  optional: boolean;
  type: FieldType;
  options?: { value: string; label: string }[];
  placement: "confirm" | "ask";
  found: string | null;
  /** Saved answer. Empty until the client saves, even when a suggestion is shown. */
  value: AnswerValue;
  /** Crawl text the client can keep or replace. Never a guessed rating or price. */
  suggestion: AnswerValue;
};

export type CompletenessRow = {
  checkId: SearchCheckId;
  label: string;
  state: "confirmed" | "found" | "missing";
  optional: boolean;
};

export type Completeness = {
  percent: number;
  ready: number;
  total: number;
  rows: CompletenessRow[];
};

type FieldDef = {
  id: string;
  checkId: SearchCheckId;
  label: string;
  help?: string;
  optional: boolean;
  type: FieldType;
  options?: { value: string; label: string }[];
  /** ask: the site cannot know this. confirm: show only when the crawl found it, otherwise ask. */
  when: "ask" | "confirm";
};

const BUSINESS_OPTIONS = [
  { value: "local-trade", label: "Local trade" },
  { value: "professional", label: "Professional firm" },
  { value: "property", label: "Property" },
  { value: "general", label: "Something else" },
];

const ACCESS_OPTIONS = [
  { value: "invite", label: "I will send a read-only invite" },
  { value: "not_now", label: "Not now" },
];

export const ONBOARDING_FIELDS: FieldDef[] = [
  { id: "business_type", checkId: "question_gap", label: "What kind of business is this?", help: "This chooses the buyer questions and how the score is weighted.", optional: false, type: "select", options: BUSINESS_OPTIONS, when: "ask" },
  { id: "industry", checkId: "question_gap", label: "What do you mainly do, in a few words?", help: "For example, emergency plumber or family lawyer.", optional: false, type: "text", when: "confirm" },
  { id: "services", checkId: "service_pages", label: "Which services should each have their own page?", help: "One service per line. Confirm the list we found, or replace it.", optional: false, type: "textarea", when: "confirm" },
  { id: "priority_services", checkId: "service_pages", label: "Which of those matter most right now?", help: "Optional. One per line.", optional: true, type: "textarea", when: "ask" },
  { id: "service_areas", checkId: "question_gap", label: "Which areas do you cover?", help: "Suburbs, cities, or Australia-wide.", optional: false, type: "textarea", when: "confirm" },
  { id: "ideal_customers", checkId: "question_gap", label: "Who is the ideal customer?", help: "The person who usually books or buys.", optional: false, type: "textarea", when: "ask" },
  { id: "buyer_questions", checkId: "question_gap", label: "What are the top questions customers ask?", help: "Up to 10. Leave an answer blank if you do not have one. We will not write it for you.", optional: false, type: "qa", when: "confirm" },
  { id: "competitors", checkId: "comparison", label: "Who do customers compare you with?", help: "Optional. Names only. We will not invent a comparison.", optional: true, type: "textarea", when: "ask" },
  { id: "gbp_url", checkId: "gbp_link", label: "Google Business Profile link", help: "Optional. The public link, if we did not find one on the site.", optional: true, type: "text", when: "confirm" },
  { id: "stated_rating", checkId: "rating_fold", label: "Your Google rating, if you want it quoted", help: "Optional. Type the number you see on your Google profile, from 1 to 5. Leave blank and we will not guess.", optional: true, type: "number", when: "ask" },
  { id: "stated_reviews", checkId: "rating_fold", label: "How many Google reviews is that based on?", help: "Optional. Only if you want the count quoted.", optional: true, type: "number", when: "ask" },
  { id: "analytics_access", checkId: "orphans", label: "Search Console and GA4", help: ANALYTICS_INVITE_HELP, optional: true, type: "choice", options: ACCESS_OPTIONS, when: "ask" },
  { id: "missed_enquiries", checkId: "leak_inputs", label: "About how many enquiries a month never become a conversation?", help: "Optional. Used only for your own leak arithmetic. We do not estimate this.", optional: true, type: "number", when: "ask" },
  { id: "close_rate", checkId: "leak_inputs", label: "What share of real conversations become a paid job?", help: "Optional. A percent, so 25 means 25%.", optional: true, type: "number", when: "ask" },
  { id: "average_job", checkId: "leak_inputs", label: "What is a typical paid job worth, in Australian dollars?", help: "Optional. A rough average is enough.", optional: true, type: "number", when: "ask" },
  { id: "ads", checkId: "cta_fold", label: "Current ads, and the landing pages they use", help: "Optional. One per line, for example: Google Ads, /hot-water", optional: true, type: "textarea", when: "ask" },
  { id: "promise", checkId: "promise", label: "What promise or offer do you lead with?", help: "The line a new visitor should see first.", optional: false, type: "textarea", when: "confirm" },
  { id: "phone", checkId: "cta_fold", label: "Best phone number for the call button", help: "Optional if we already found one.", optional: true, type: "text", when: "confirm" },
];

const FIELD_IDS = new Set(ONBOARDING_FIELDS.map((f) => f.id));

const CHECK_LABEL: Record<SearchCheckId, string> = {
  robots_index: "robots.txt",
  canonical: "Homepage canonical",
  host: "www and https",
  orphans: "Sitemap orphans",
  utility_indexable: "Utility pages",
  thin_indexable: "Thin pages",
  ai_search_crawlers: "AI search crawlers",
  ai_training_crawlers: "AI training crawlers",
  llms_present: "llms.txt",
  llms_accurate: "llms.txt accuracy",
  schema_business: "Business schema",
  schema_match: "Schema matches the page",
  schema_faq: "FAQ schema",
  schema_breadcrumb: "Breadcrumbs",
  schema_article: "Article schema",
  answerable_pricing: "A price on the page",
  comparison: "Comparison",
  promise: "Promise",
  rating_fold: "Google rating",
  cta_fold: "Call or book action",
  from_price: "Starting price",
  service_pages: "One page per service",
  gbp_link: "Google profile link",
  question_gap: "Buyer questions",
  questions_shell: "Buyer questions on a script-only page",
  conversion_shell: "First screen on a script-only page",
  leak_inputs: "Leak figures",
};

const OBSERVABLE: SearchCheckId[] = [
  "robots_index", "canonical", "host", "orphans", "utility_indexable", "thin_indexable",
  "ai_search_crawlers", "ai_training_crawlers", "llms_present", "schema_business", "schema_match",
  "schema_faq", "schema_breadcrumb", "schema_article", "answerable_pricing", "comparison",
  "from_price", "cta_fold", "rating_fold", "gbp_link",
];

const SECRET_KEY = /password|passwd|credential|secret|api[_-]?key/i;

export function onboardingCheckIds(): SearchCheckId[] {
  return ONBOARDING_FIELDS.map((f) => f.checkId);
}

export function knownBusinessKind(firmType?: string): OnboardingBrief["businessKind"] | null {
  const firm = (firmType ?? "").toLowerCase().trim();
  if (firm === "real-estate") return "property";
  if (firm === "law" || firm === "accounting" || firm === "financial-advisory") return "professional";
  return null;
}

export function knownBusinessLabel(firmType?: string): string | null {
  const kind = knownBusinessKind(firmType);
  if (kind === "property") return "Property, from your Blueprint order.";
  if (kind === "professional") return "Professional firm, from your Blueprint order.";
  return null;
}

export function isPreviewSampleUrl(url: string): boolean {
  try { return new URL(url).hostname === "preview.example"; } catch { return false; }
}

export function prefillFromSnapshot(snapshot: CrawlSnapshot): SitePrefill {
  const home = snapshot.pages[0];
  const shell = home ? isJsShell(home.html) : false;
  const pages = snapshot.pages.filter((p) => p.status >= 200 && p.status < 300);
  const homeHtml = home?.html ?? "";
  const faqs = pages.flatMap((p) => extractFaqs(p));
  const phone = phoneFrom(homeHtml);
  const gbpUrl = gbpFrom(pages.map((p) => p.html).join("\n"));
  const promise = h1(homeHtml);
  const services = navLabels(homeHtml, home?.url ?? snapshot.finalUrl);
  const serviceAreas = areaSentence(pages);
  const ratingSeen = ratingSeenIn(pages.map((p) => visibleText(p.html)).join("\n"));
  const schemaTypes = [...new Set(pages.flatMap((p) => jsonLd(p.html).flatMap((n) => ldTypes(n))))].slice(0, 12);
  const industryHint = titleOf(homeHtml);
  const robots = !snapshot.robots ? "unread" : snapshot.robots.status === 404 || snapshot.robots.status === 410 ? "missing" : snapshot.robots.status >= 200 && snapshot.robots.status < 300 ? "present" : "unread";
  const llms = !snapshot.llms ? "unread" : snapshot.llms.status === 404 || snapshot.llms.status === 410 ? "missing" : snapshot.llms.status >= 200 && snapshot.llms.status < 300 && !/<html/i.test(snapshot.llms.body.slice(0, 400)) ? "present" : snapshot.llms.status >= 200 && snapshot.llms.status < 300 ? "missing" : "unread";
  const llmsExcerpt = llms === "present" && snapshot.llms ? clip(snapshot.llms.body.replace(/\s+/g, " ").trim(), 180) : null;
  return {
    url: snapshot.finalUrl || snapshot.requestedUrl,
    services,
    phone,
    serviceAreas,
    promise,
    gbpUrl,
    ratingSeen,
    faqs: faqs.slice(0, 10),
    schemaTypes,
    robots,
    llms,
    llmsExcerpt,
    sitemapPages: snapshot.sitemapStatus === null ? null : snapshot.sitemapUrls.length,
    industryHint,
    shell,
    settledCheckIds: settledChecks(snapshot, shell),
    pagesRead: snapshot.pages.length,
    note: snapshot.error ?? null,
  };
}

export function planIntake(args: {
  firmType?: string;
  prefill: SitePrefill | null;
  answers: Answers;
}): { confirms: IntakeField[]; asks: IntakeField[]; completeness: Completeness; knownBusiness: string | null } {
  const known = knownBusinessLabel(args.firmType);
  const confirms: IntakeField[] = [];
  const asks: IntakeField[] = [];
  for (const def of ONBOARDING_FIELDS) {
    if (def.id === "business_type" && known && args.answers.business_type == null) continue;
    const suggestion = suggestionFor(def.id, args.prefill);
    const saved = args.answers[def.id];
    const hasSaved = saved !== undefined && saved !== null && !(typeof saved === "string" && saved.trim() === "");
    const found = foundLabel(def.id, args.prefill);
    const placement = def.when === "confirm" && found && !hasSaved ? "confirm" : "ask";
    const optional = def.id === "industry" && !!known ? true : def.optional;
    const field: IntakeField = {
      ...def,
      optional,
      placement,
      found: placement === "confirm" ? found : null,
      value: hasSaved ? saved : null,
      suggestion: hasSaved ? null : suggestion,
    };
    if (placement === "confirm") confirms.push(field);
    else asks.push(field);
  }
  return { confirms, asks, completeness: dataCompleteness(args), knownBusiness: known };
}

export function dataCompleteness(args: {
  firmType?: string;
  firmName?: string;
  prefill: SitePrefill | null;
  answers: Answers;
}): Completeness {
  const rows: CompletenessRow[] = [];
  const prefill = args.prefill;
  const shell = !!prefill?.shell;
  if (prefill) {
    for (const id of OBSERVABLE) {
      if (shell && ["from_price", "cta_fold", "rating_fold", "comparison", "answerable_pricing", "schema_faq"].includes(id)) continue;
      const upgraded = answerState(id, args);
      const settled = prefill.settledCheckIds.includes(id);
      const state = upgraded === "confirmed" ? "confirmed" : settled ? "found" : upgraded === "found" ? "found" : "missing";
      rows.push({ checkId: id, label: CHECK_LABEL[id], state, optional: false });
    }
    if (shell) {
      rows.push({ checkId: "questions_shell", label: CHECK_LABEL.questions_shell, state: "found", optional: false });
      rows.push({ checkId: "conversion_shell", label: CHECK_LABEL.conversion_shell, state: "found", optional: false });
    }
  } else {
    for (const id of ["promise", "service_pages", "gbp_link", "cta_fold", "comparison"] as SearchCheckId[]) {
      rows.push({ checkId: id, label: CHECK_LABEL[id], state: answerState(id, args) === "confirmed" ? "confirmed" : "missing", optional: id === "gbp_link" || id === "comparison" });
    }
  }
  rows.push(clientRow("promise", args, false));
  rows.push(clientRow("service_pages", args, false));
  rows.push(clientRow("llms_accurate", args, false));
  rows.push(clientRow("question_gap", args, false));
  rows.push(clientRow("leak_inputs", args, true));
  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    if (seen.has(r.checkId)) return false;
    seen.add(r.checkId);
    return true;
  });
  const weights = unique.map((r) => weightOf(r, prefill));
  const total = unique.length || 1;
  const sum = weights.reduce((n, w) => n + w, 0);
  return {
    percent: Math.round((sum / total) * 100),
    ready: weights.filter((w) => w === 1).length,
    total: unique.length,
    rows: unique,
  };
}

export function missingRequired(args: { firmType?: string; prefill: SitePrefill | null; answers: Answers }): string[] {
  const plan = planIntake(args);
  const missing: string[] = [];
  for (const field of [...plan.confirms, ...plan.asks]) {
    if (field.optional) continue;
    const value = args.answers[field.id] ?? null;
    if (!isFilled(field, value)) missing.push(field.label);
  }
  return missing;
}

export function sanitizeAnswers(input: unknown): { answers: Answers; error?: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { answers: {} };
  const raw = input as Record<string, unknown>;
  const secret = rejectSecrets(raw);
  if (secret) return { answers: {}, error: secret };
  const answers: Answers = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!FIELD_IDS.has(key)) continue;
    const def = ONBOARDING_FIELDS.find((f) => f.id === key)!;
    const cleaned = cleanValue(def, value);
    if (cleaned === undefined) continue;
    answers[key] = cleaned;
  }
  return { answers };
}

export function rejectSecrets(input: Record<string, unknown>): string | null {
  for (const [key, value] of Object.entries(input)) {
    if (SECRET_KEY.test(key)) return "We do not collect passwords or login details.";
    if (typeof value === "string" && /^\s*(password|passwd|api[_-]?key)\s*[:=]/i.test(value)) {
      return "We do not collect passwords or login details.";
    }
  }
  const access = input.analytics_access;
  if (typeof access === "string" && access.trim() && access !== "invite" && access !== "not_now") {
    return "Search Console and GA4 are a read-only invite. Do not send a password or a login.";
  }
  return null;
}

export function searchBriefFromAnswers(args: {
  previous?: OnboardingBrief | null;
  answers: Answers;
  firmType?: string;
}): OnboardingBrief {
  const prev = args.previous ?? {};
  const next: OnboardingBrief = {};
  const promise = text(args.answers.promise);
  if (promise) next.promise = promise;
  else if (prev.promise) next.promise = prev.promise;
  const services = lines(text(args.answers.services));
  if (services.length) next.services = services;
  else if (prev.services?.length) next.services = prev.services;
  const picked = text(args.answers.business_type) as OnboardingBrief["businessKind"] | "";
  const kind = picked === "local-trade" || picked === "professional" || picked === "property" || picked === "general"
    ? picked
    : knownBusinessKind(args.firmType) ?? prev.businessKind;
  if (kind) next.businessKind = kind;
  const industry = text(args.answers.industry);
  if (industry) next.industry = industry;
  else if (prev.industry) next.industry = prev.industry;
  const rating = finite(args.answers.stated_rating);
  const reviews = finite(args.answers.stated_reviews);
  if (rating !== undefined && rating >= 1 && rating <= 5) next.statedGoogleRating = Math.round(rating * 10) / 10;
  else if (prev.statedGoogleRating !== undefined) next.statedGoogleRating = prev.statedGoogleRating;
  if (reviews !== undefined && reviews >= 0 && reviews <= 1000000) next.statedGoogleReviews = Math.round(reviews);
  else if (prev.statedGoogleReviews !== undefined) next.statedGoogleReviews = prev.statedGoogleReviews;
  const figures = cleanFigures({
    missedEnquiriesPerMonth: finite(args.answers.missed_enquiries),
    closeRate: finite(args.answers.close_rate),
    averageJobAud: finite(args.answers.average_job),
  });
  if (figures) next.figures = figures;
  else if (prev.figures) next.figures = prev.figures;
  return next;
}

export function clientInputFromBrief(args: { firmName?: string; firmType?: string; location?: string; brief?: OnboardingBrief | null; overview?: string }): SearchClientInput {
  const brief = args.brief ?? {};
  return {
    name: args.firmName,
    firmType: args.firmType,
    businessKind: brief.businessKind,
    industry: brief.industry,
    overview: args.overview,
    location: args.location,
    promise: brief.promise,
    services: brief.services,
    statedGoogleRating: brief.statedGoogleRating,
    statedGoogleReviews: brief.statedGoogleReviews,
    figures: brief.figures,
  };
}

export function parseQaList(raw: AnswerValue | undefined): { question: string; answer: string }[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 10).map((item) => {
      const rec = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return {
        question: typeof rec.question === "string" ? rec.question.trim().slice(0, 300) : "",
        answer: typeof rec.answer === "string" ? rec.answer.trim().slice(0, 600) : "",
      };
    }).filter((item) => item.question);
  } catch {
    return [];
  }
}

export function buildFaqDrafts(args: {
  snapshot: CrawlSnapshot | null;
  client: SearchClientInput;
  clientQas: { question: string; answer: string }[];
  now: string;
  previous?: FaqDraftRecord | null;
}): FaqDraftRecord {
  const kind = classifyBusiness(args.client);
  const bank = QUESTION_BANKS[kind.bank];
  const audit = args.snapshot && args.snapshot.pages.length && !args.snapshot.error
    ? evaluateSearch(args.snapshot, args.client)
    : null;
  const results = new Map((audit?.questions ?? []).map((q) => [q.id, q]));
  const pages = args.snapshot?.pages ?? [];
  const siteFaqs = pages.flatMap((p) => extractFaqs(p));
  const used = new Set<number>();
  const drafts: FaqDraft[] = bank.map((q) => {
    const clientHit = args.clientQas.findIndex((item, i) => !used.has(i) && overlaps(item.question, q.text));
    const clientQa = clientHit >= 0 ? args.clientQas[clientHit] : undefined;
    if (clientQa) used.add(clientHit);
    const site = siteFaqs.find((f) => overlaps(f.question, q.text) && f.answer.trim() && answerIsOnPage(f.answer, pages));
    const result = results.get(q.id);
    let answer = "";
    let source: FaqAnswerSource = "unanswered";
    let sourceDetail = "No answer yet. Listed for the client. Nothing was invented.";
    if (clientQa && clientQa.answer.trim()) {
      const sameAsSite = site && norm(clientQa.answer) === norm(site.answer);
      answer = clip(clientQa.answer.trim(), 400);
      if (sameAsSite) {
        source = "site";
        sourceDetail = `Site text${site.page ? ` on ${site.page}` : ""}, confirmed by the client.`;
      } else {
        source = "client";
        sourceDetail = "Written by the client in onboarding.";
      }
    } else if (site) {
      answer = clip(site.answer.trim(), 400);
      source = "site";
      sourceDetail = `Site text${site.page ? ` on ${site.page}` : ""}.`;
    } else if (result?.result === "clear") {
      const quote = excerptFor(pages, q.phrases);
      if (quote) {
        answer = clip(quote.text, 400);
        source = "site";
        sourceDetail = `Site text on ${quote.page}.`;
      }
    }
    const status: FaqDraftStatus = answer ? "admin_review" : "unanswered";
    return {
      id: `faq_${q.id}`,
      buyerQuestionId: q.id,
      question: q.text,
      answer,
      source: answer ? source : "unanswered",
      sourceDetail,
      status,
      checkId: "question_gap",
    };
  });
  args.clientQas.forEach((item, i) => {
    if (used.has(i) || !item.question.trim() || !item.answer.trim()) return;
    drafts.push({
      id: `faq_extra_${i + 1}`,
      buyerQuestionId: null,
      question: item.question.trim().slice(0, 300),
      answer: clip(item.answer.trim(), 400),
      source: "client",
      sourceDetail: "Written by the client in onboarding.",
      status: "admin_review",
      checkId: "schema_faq",
    });
  });
  const merged = drafts.map((draft) => {
    const old = args.previous?.drafts.find((d) => d.id === draft.id);
    if (!old) return draft;
    if (old.answer === draft.answer && (old.status === "approved" || old.status === "client_review") && draft.answer.trim()) {
      return { ...draft, status: old.status };
    }
    return draft;
  });
  return lockDrafts({
    generatedAt: args.now,
    questionBank: kind.bank,
    drafts: merged,
    faqPage: faqPageFrom(merged),
    published: false,
  });
}

export function lockDrafts(record: FaqDraftRecord): FaqDraftRecord {
  const drafts = record.drafts.map((d) => {
    const answer = (d.answer ?? "").trim();
    const status: FaqDraftStatus = !answer ? "unanswered" : d.status === "client_review" || d.status === "approved" ? d.status : d.status === "unanswered" ? "admin_review" : "admin_review";
    const source: FaqAnswerSource = !answer ? "unanswered" : d.source === "site" || d.source === "client" ? d.source : "client";
    return { ...d, answer, status, source };
  });
  return { ...record, drafts, faqPage: faqPageFrom(drafts), published: false };
}

export function applyDraftAction(record: FaqDraftRecord, action: "to_client" | "hold" | "approve" | "answer", draftId: string, answer?: string): { record: FaqDraftRecord; error?: string; changed: boolean } {
  const draft = record.drafts.find((d) => d.id === draftId);
  if (!draft) return { record: lockDrafts(record), error: "That draft was not found.", changed: false };
  const drafts = record.drafts.map((d) => {
    if (d.id !== draftId) return d;
    if (action === "to_client") {
      if (!d.answer.trim() || d.status !== "admin_review") return d;
      return { ...d, status: "client_review" as const };
    }
    if (action === "hold") {
      if (!d.answer.trim()) return { ...d, status: "unanswered" as const };
      return { ...d, status: "admin_review" as const };
    }
    if (action === "approve") {
      if (d.status !== "client_review" || !d.answer.trim()) return d;
      return { ...d, status: "approved" as const };
    }
    const next = clip((answer ?? "").trim(), 400);
    if (!next) return { ...d, answer: "", source: "unanswered" as const, sourceDetail: "No answer yet. Listed for the client. Nothing was invented.", status: "unanswered" as const };
    return { ...d, answer: next, source: "client" as const, sourceDetail: "Written by the client in onboarding.", status: "admin_review" as const };
  });
  const changed = JSON.stringify(drafts) !== JSON.stringify(record.drafts);
  if (action === "to_client" && !changed && !draft.answer.trim()) {
    return { record: lockDrafts(record), error: "Unanswered questions stay with the client. There is no answer to approve.", changed: false };
  }
  if (action === "approve" && !changed) {
    return { record: lockDrafts(record), error: "Only a draft Saabai has sent for approval can be approved.", changed: false };
  }
  return { record: lockDrafts({ ...record, drafts, published: false }), changed };
}

export function previewCrawlSnapshot(): CrawlSnapshot {
  const html = `<!doctype html><html><head><title>Acme Plumbing Burleigh | Gold Coast plumber</title>
<link rel="canonical" href="https://preview.example/">
<script type="application/ld+json">{"@type":"Plumber","name":"Acme Plumbing","telephone":"0755551234"}</script>
<script type="application/ld+json">{"@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Do you charge a call-out fee if I do not go ahead?","acceptedAnswer":{"@type":"Answer","text":"The call-out fee is waived if you go ahead."}}]}</script>
</head><body>
<header>
<a href="tel:0755551234">Call 07 5555 1234</a>
<a href="/hot-water">Hot water</a>
<a href="/drains">Blocked drains</a>
<a href="https://maps.google.com/maps?q=acme">Google profile</a>
</header>
<h1>Same-day hot water repairs</h1>
<h2>Service area</h2>
<p>Our service area covers the Gold Coast and Brisbane. We are based in Burleigh, within 40 km.</p>
<h2>Do you charge a call-out fee if I do not go ahead?</h2>
<p>The call-out fee is waived if you go ahead.</p>
</body></html>`;
  return {
    requestedUrl: PREVIEW_SAMPLE_URL,
    finalUrl: PREVIEW_SAMPLE_URL,
    pages: [{ url: PREVIEW_SAMPLE_URL, status: 200, html }],
    robots: { status: 200, body: "User-agent: *\nAllow: /\n" },
    sitemapStatus: 200,
    sitemapUrls: [PREVIEW_SAMPLE_URL, "https://preview.example/hot-water"],
    llms: { status: 200, body: "# Acme Plumbing\nGold Coast plumber for hot water and blocked drains." },
    hostProbes: [
      { url: "https://preview.example/", status: 200, location: null },
      { url: "https://www.preview.example/", status: 301, location: PREVIEW_SAMPLE_URL },
      { url: "http://preview.example/", status: 301, location: PREVIEW_SAMPLE_URL },
      { url: "http://www.preview.example/", status: 301, location: PREVIEW_SAMPLE_URL },
    ],
    capped: false,
  };
}

function clientRow(id: SearchCheckId, args: { firmType?: string; firmName?: string; prefill: SitePrefill | null; answers: Answers }, optional: boolean): CompletenessRow {
  return { checkId: id, label: CHECK_LABEL[id], state: answerState(id, args), optional };
}

function weightOf(row: CompletenessRow, prefill: SitePrefill | null): number {
  if (row.state === "confirmed") return 1;
  if (row.state === "missing") return 0;
  if (prefill?.settledCheckIds.includes(row.checkId)) return 1;
  if (row.checkId === "questions_shell" || row.checkId === "conversion_shell") return 1;
  return 0.5;
}

function answerState(id: SearchCheckId, args: { firmType?: string; firmName?: string; prefill: SitePrefill | null; answers: Answers }): CompletenessRow["state"] {
  const a = args.answers;
  if (id === "promise") return filledText(a.promise) ? "confirmed" : args.prefill?.promise ? "found" : "missing";
  if (id === "service_pages") return lines(text(a.services)).length ? "confirmed" : args.prefill?.services.length ? "found" : "missing";
  if (id === "llms_accurate") {
    const name = !!args.firmName?.trim();
    const services = lines(text(a.services)).length > 0;
    if (name && services) return "confirmed";
    if (name && args.prefill?.services.length) return "found";
    return "missing";
  }
  if (id === "question_gap") return questionGapState(args);
  if (id === "leak_inputs") {
    const figures = cleanFigures({
      missedEnquiriesPerMonth: finite(a.missed_enquiries),
      closeRate: finite(a.close_rate),
      averageJobAud: finite(a.average_job),
    });
    return figures?.missedEnquiriesPerMonth !== undefined && figures.closeRate !== undefined && figures.averageJobAud !== undefined ? "confirmed" : "missing";
  }
  if (id === "gbp_link") return filledText(a.gbp_url) ? "confirmed" : "missing";
  if (id === "cta_fold") return filledText(a.phone) ? "confirmed" : "missing";
  if (id === "comparison") return filledText(a.competitors) ? "confirmed" : "missing";
  if (id === "schema_faq") return parseQaList(a.buyer_questions).some((q) => q.answer.trim()) ? "confirmed" : args.prefill?.faqs.some((f) => f.answer.trim()) ? "found" : "missing";
  if (id === "rating_fold") return finite(a.stated_rating) !== undefined ? "confirmed" : "missing";
  if (id === "orphans") return a.analytics_access === "invite" || a.analytics_access === "not_now" ? "confirmed" : "missing";
  return "missing";
}

function questionGapState(args: { firmType?: string; prefill: SitePrefill | null; answers: Answers }): CompletenessRow["state"] {
  const kind = filledText(args.answers.business_type) || knownBusinessKind(args.firmType) ? "confirmed" : "missing";
  const areas = filledText(args.answers.service_areas) ? "confirmed" : args.prefill?.serviceAreas ? "found" : "missing";
  const ideal = filledText(args.answers.ideal_customers) ? "confirmed" : "missing";
  const qa = parseQaList(args.answers.buyer_questions).length || args.answers.buyer_questions === "[]"
    ? "confirmed"
    : args.prefill?.faqs.length ? "found" : "missing";
  const parts = [kind, areas, ideal, qa];
  if (parts.includes("missing")) return "missing";
  if (parts.includes("found")) return "found";
  return "confirmed";
}

function suggestionFor(id: string, prefill: SitePrefill | null): AnswerValue {
  if (!prefill) return null;
  if (id === "industry") return prefill.industryHint;
  if (id === "services") return prefill.services.length ? prefill.services.join("\n") : null;
  if (id === "service_areas") return prefill.serviceAreas;
  if (id === "promise") return prefill.promise;
  if (id === "phone") return prefill.phone;
  if (id === "gbp_url") return prefill.gbpUrl;
  if (id === "buyer_questions" && prefill.faqs.length) {
    return JSON.stringify(prefill.faqs.map((f) => ({ question: f.question, answer: f.answer })));
  }
  return null;
}

function foundLabel(id: string, prefill: SitePrefill | null): string | null {
  if (!prefill) return null;
  if (id === "industry" && prefill.industryHint) return `Found on the site: ${prefill.industryHint}`;
  if (id === "services" && prefill.services.length) return `Found in the menu: ${prefill.services.join(", ")}`;
  if (id === "service_areas" && prefill.serviceAreas) return "Found a service-area line on the site.";
  if (id === "promise" && prefill.promise) return "Found the main heading on the homepage.";
  if (id === "phone" && prefill.phone) return `Found a phone number: ${prefill.phone}`;
  if (id === "gbp_url" && prefill.gbpUrl) return "Found a Google profile link on the site.";
  if (id === "buyer_questions" && prefill.faqs.length) return `Found ${prefill.faqs.length} question${prefill.faqs.length === 1 ? "" : "s"} already on the site.`;
  return null;
}

function isFilled(field: IntakeField, value: AnswerValue): boolean {
  if (field.type === "qa") return typeof value === "string" && (value.trim() === "[]" || parseQaList(value).length > 0);
  if (typeof value === "number") return Number.isFinite(value);
  return typeof value === "string" && value.trim().length > 0;
}

function cleanValue(def: FieldDef, value: unknown): AnswerValue | undefined {
  if (value === null || value === "") return null;
  if (def.type === "number") {
    const n = finite(value);
    return n === undefined ? undefined : n;
  }
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (def.type === "select") return def.options?.some((o) => o.value === trimmed) ? trimmed : undefined;
  if (def.type === "choice") return trimmed === "invite" || trimmed === "not_now" ? trimmed : undefined;
  if (def.type === "qa") {
    const list = parseQaList(trimmed);
    return JSON.stringify(list);
  }
  return clip(trimmed, def.type === "text" ? 500 : 2000);
}

function settledChecks(snapshot: CrawlSnapshot, shell: boolean): SearchCheckId[] {
  const ids: SearchCheckId[] = [];
  const add = (id: SearchCheckId) => { if (!ids.includes(id)) ids.push(id); };
  if (snapshot.robots) {
    add("robots_index");
    add("ai_search_crawlers");
    add("ai_training_crawlers");
  }
  if (snapshot.pages.length) {
    if (!shell) add("canonical");
    add("utility_indexable");
    add("thin_indexable");
    add("schema_business");
    add("schema_match");
    add("schema_breadcrumb");
    add("schema_article");
    add("llms_present");
    if (!shell) {
      add("answerable_pricing");
      add("comparison");
      add("from_price");
      add("cta_fold");
      add("rating_fold");
      add("gbp_link");
      add("schema_faq");
    }
  }
  if (snapshot.hostProbes.filter((p) => p.url.startsWith("https:")).length >= 2) add("host");
  if (snapshot.sitemapStatus !== null) add("orphans");
  if (snapshot.llms) add("llms_present");
  return ids.filter((id) => (SEARCH_CHECK_IDS as readonly string[]).includes(id));
}

function extractFaqs(page: HtmlPage): SiteFaq[] {
  const text = visibleText(page.html);
  const out: SiteFaq[] = [];
  for (const node of jsonLd(page.html)) {
    if (!ldTypes(node).includes("FAQPage")) continue;
    const entities = Array.isArray(node.mainEntity) ? node.mainEntity : node.mainEntity ? [node.mainEntity] : [];
    for (const entity of entities) {
      if (!entity || typeof entity !== "object") continue;
      const rec = entity as Record<string, unknown>;
      const question = typeof rec.name === "string" ? rec.name.trim() : "";
      const accepted = rec.acceptedAnswer && typeof rec.acceptedAnswer === "object" ? rec.acceptedAnswer as Record<string, unknown> : null;
      const answer = accepted && typeof accepted.text === "string" ? accepted.text.trim() : "";
      if (!question) continue;
      out.push({ question: clip(question, 300), answer: answer && answerIsOnPage(answer, [page]) ? clip(answer, 600) : "", page: page.url });
    }
  }
  const headings = [...page.html.matchAll(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi)];
  for (const heading of headings) {
    const question = visibleText(heading[1]).replace(/\s+/g, " ").trim();
    if (!question.endsWith("?")) continue;
    if (out.some((f) => norm(f.question) === norm(question))) continue;
    const after = page.html.slice((heading.index ?? 0) + heading[0].length);
    const para = after.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const answer = para ? visibleText(para[1]).replace(/\s+/g, " ").trim() : "";
    out.push({ question: clip(question, 300), answer: answer ? clip(answer, 600) : "", page: page.url });
  }
  return out.filter((f) => f.question && text.toLowerCase().includes(f.question.toLowerCase().slice(0, 24)));
}

function answerIsOnPage(answer: string, pages: HtmlPage[]): boolean {
  const needle = norm(answer).slice(0, 80);
  if (needle.length < 8) return false;
  return pages.some((p) => norm(visibleText(p.html)).includes(needle));
}

const EXCERPT_MAX = 240;

function blockTexts(html: string): string[] {
  const parts = html.match(/<(p|h1|h2|h3|li)\b[^>]*>[\s\S]*?<\/\1>/gi) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const text = visibleText(part).replace(/\s+/g, " ").trim();
    const key = text.toLowerCase();
    if (!text || text.length > EXCERPT_MAX || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function excerptFor(pages: HtmlPage[], phrases: string[]): { text: string; page: string } | null {
  for (const page of pages) {
    const pageText = visibleText(page.html);
    const blocks = blockTexts(page.html);
    for (const phrase of phrases) {
      for (const block of blocks) {
        if (!block.toLowerCase().includes(phrase.toLowerCase())) continue;
        const sentence = sentenceAround(block, phrase) ?? block;
        if (sentence.length > phrase.length + 8 && sentence.length <= EXCERPT_MAX && pageText.includes(sentence)) {
          return { text: sentence, page: page.url };
        }
      }
    }
  }
  return null;
}

function sentenceAround(text: string, phrase: string): string | null {
  const idx = text.toLowerCase().indexOf(phrase.toLowerCase());
  if (idx < 0) return null;
  let start = 0;
  for (const mark of [". ", "? ", "! "]) {
    const at = text.lastIndexOf(mark, idx - 1);
    if (at >= start) start = at + mark.length;
  }
  let end = text.length;
  for (const mark of [".", "?", "!"]) {
    const at = text.indexOf(mark, idx + phrase.length);
    if (at >= 0 && at < end) end = at + 1;
  }
  const sentence = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (!sentence || sentence.length > EXCERPT_MAX) return null;
  return sentence;
}

function faqPageFrom(drafts: FaqDraft[]): FaqPageDoc | null {
  const mainEntity = drafts.filter((d) => d.answer.trim() && d.source !== "unanswered").map((d) => ({
    "@type": "Question" as const,
    name: d.question,
    acceptedAnswer: { "@type": "Answer" as const, text: d.answer },
  }));
  if (!mainEntity.length) return null;
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity };
}

function overlaps(a: string, b: string): boolean {
  const aw = words(a);
  const bw = words(b);
  if (!aw.length || !bw.length) return norm(a) === norm(b);
  const set = new Set(bw);
  const hit = aw.filter((w) => set.has(w)).length;
  return hit / Math.min(aw.length, bw.length) >= 0.5;
}

const STOP = new Set(["this", "that", "with", "from", "your", "have", "will", "about", "what", "does", "they", "them", "when", "where", "which", "offer", "usually"]);

function words(s: string): string[] {
  return norm(s).split(" ").filter((w) => w.length > 3 && !STOP.has(w));
}

function norm(s: string): string {
  return s.toLowerCase().replace(/&amp;/g, " and ").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

function phoneFrom(html: string): string | null {
  const tel = html.match(/href\s*=\s*["']tel:([^"']+)["']/i)?.[1];
  if (tel) return tel.replace(/^tel:/i, "").trim().slice(0, 40);
  for (const node of jsonLd(html)) {
    if (typeof node.telephone === "string" && node.telephone.trim()) return node.telephone.trim().slice(0, 40);
  }
  return null;
}

function gbpFrom(html: string): string | null {
  const hrefs = [...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  return hrefs.find((h) => /google\.[a-z.]+\/maps|maps\.google|g\.page\/|maps\.app\.goo\.gl/i.test(h)) ?? null;
}

function h1(html: string): string | null {
  const text = visibleText(html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i)?.[0] ?? "").replace(/\s+/g, " ").trim();
  return text ? clip(text, 180) : null;
}

function titleOf(html: string): string | null {
  const text = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
  return text ? clip(text, 180) : null;
}

function navLabels(html: string, base: string): string[] {
  const nav = (html.match(/<(?:nav|header)\b[\s\S]*?<\/(?:nav|header)>/gi) ?? []).join("\n");
  const skip = /^(home|about|about us|contact|contact us|blog|news|faq|privacy|terms|login|menu|services|call|google profile)$/i;
  const out: string[] = [];
  for (const m of nav.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const label = visibleText(m[2]).replace(/\s+/g, " ").trim();
    if (!label || label.length > 40 || skip.test(label) || /^call\b/i.test(label) || /^[\d\s+()-]+$/.test(label)) continue;
    try {
      const u = new URL(m[1], base);
      if (/^https?:$/i.test(u.protocol) === false) continue;
    } catch { continue; }
    if (!out.some((item) => item.toLowerCase() === label.toLowerCase())) out.push(label);
  }
  return out.slice(0, 8);
}

function areaSentence(pages: HtmlPage[]): string | null {
  let short: string | null = null;
  for (const page of pages) {
    for (const block of blockTexts(page.html)) {
      if (!/service area|areas we cover|\bwe cover\b/i.test(block)) continue;
      if (block.length > 40) return block;
      short ??= block;
    }
  }
  return short;
}

function ratingSeenIn(text: string): string | null {
  const m = text.match(/(\d(?:\.\d)?)\s*(?:\/\s*5|out of\s*5|stars?)/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return m[1];
}

function lines(value: string): string[] {
  return value.split(/\n|,/).map((s) => s.trim()).filter((s) => s.length > 1).slice(0, 12);
}

function text(value: AnswerValue | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function filledText(value: AnswerValue | undefined): boolean {
  return text(value).length > 0;
}

function finite(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n).replace(/\s+\S*$/, "").trim();
  return cut || t.slice(0, n).trim();
}
