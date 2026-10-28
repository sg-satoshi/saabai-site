/**
 * Token-gated search onboarding. Demo mode returns the same shape and writes nothing.
 * Completing the form stores answers and unpublished FAQ drafts. It does not email the client.
 */

import type { AuditEngagement } from "../audit-types";
import { crawlForSearch, type Fetcher } from "./search-audit";
import {
  PREVIEW_SAMPLE_URL,
  applyDraftAction,
  buildFaqDrafts,
  clientInputFromBrief,
  isPreviewSampleUrl,
  missingRequired,
  parseQaList,
  planIntake,
  prefillFromSnapshot,
  previewCrawlSnapshot,
  sanitizeAnswers,
  searchBriefFromAnswers,
  type Answers,
  type FaqDraftRecord,
  type SearchOnboardingRecord,
} from "./onboarding";
import { notifyAdminFaqQueue } from "./onboarding-notify";

export type OnboardingBody =
  | { action: "prefill"; url?: string }
  | { action: "save"; answers?: unknown; complete?: boolean }
  | { action: "faq-answer"; draftId?: string; answer?: string }
  | { action: "faq-approve"; draftId?: string };

type Eng = Pick<AuditEngagement, "id" | "firmName" | "firmType" | "contactName" | "contactEmail" | "website" | "location" | "searchBrief" | "searchOnboarding" | "faqDrafts">;

export async function handleOnboarding(args: {
  engagement: Eng;
  body: OnboardingBody;
  persist: boolean;
  fetchImpl?: Fetcher;
  now?: string;
  notify?: typeof notifyAdminFaqQueue;
}): Promise<{ status: number; body: Record<string, unknown>; patch?: Partial<AuditEngagement>; log?: { type: "onboarding_saved" | "faq_drafts_ready"; label: string }; notify: boolean }> {
  const now = args.now ?? new Date().toISOString();
  const eng = args.engagement;
  const record = readRecord(eng.searchOnboarding);
  if (args.body.action === "prefill") {
    const url = (args.body.url || eng.website || "").trim();
    if (!url) return { status: 400, body: { error: "Add the website address first." }, notify: false };
    if (isPreviewSampleUrl(url) && args.persist) return { status: 400, body: { error: "Use the real website address." }, notify: false };
    const snapshot = isPreviewSampleUrl(url) ? previewCrawlSnapshot() : await crawlForSearch(url, args.fetchImpl);
    const prefill = prefillFromSnapshot(snapshot);
    const next: SearchOnboardingRecord = { ...record, updatedAt: now, crawlUrl: prefill.url || url, prefill, answers: record.answers };
    const view = viewOf(eng, next);
    if (!args.persist) return { status: 200, body: { ...view, saved: false, demo: true, resume: resumeOf(next, eng.faqDrafts) }, notify: false };
    return {
      status: 200,
      body: view,
      patch: { searchOnboarding: next, website: eng.website || prefill.url || url },
      log: { type: "onboarding_saved", label: "Search onboarding read the website" },
      notify: false,
    };
  }
  if (args.body.action === "save") {
    const cleaned = sanitizeAnswers(args.body.answers ?? {});
    if (cleaned.error) return { status: 400, body: { error: cleaned.error }, notify: false };
    const answers: Answers = { ...record.answers, ...cleaned.answers };
    const complete = args.body.complete === true;
    if (complete) {
      const missing = missingRequired({ firmType: eng.firmType, prefill: record.prefill ?? null, answers });
      if (missing.length) return { status: 400, body: { error: "A few answers are still needed.", missing }, notify: false };
    }
    const brief = searchBriefFromAnswers({ previous: eng.searchBrief, answers, firmType: eng.firmType });
    const next: SearchOnboardingRecord = {
      ...record,
      updatedAt: now,
      answers,
      completedAt: complete ? record.completedAt ?? now : record.completedAt,
    };
    let faqs = eng.faqDrafts;
    let notify = false;
    if (complete) {
      const built = await draftsFor(eng, next, brief, args.fetchImpl, now);
      const first = !eng.faqDrafts;
      faqs = built;
      notify = first;
    }
    const view = viewOf({ ...eng, faqDrafts: faqs }, next);
    if (!args.persist) return { status: 200, body: { ...view, saved: true, complete, demo: true, resume: resumeOf(next, faqs) }, notify: false };
    return {
      status: 200,
      body: { ...view, saved: true, complete },
      patch: { searchOnboarding: next, searchBrief: brief, ...(complete ? { faqDrafts: faqs } : {}) },
      log: { type: complete ? "faq_drafts_ready" : "onboarding_saved", label: complete ? "Search onboarding finished. FAQ drafts are waiting for review." : "Search onboarding saved" },
      notify,
    };
  }
  if (args.body.action === "faq-answer" || args.body.action === "faq-approve") {
    if (!eng.faqDrafts) return { status: 400, body: { error: "There are no FAQ drafts yet." }, notify: false };
    const draftId = (args.body.draftId || "").trim();
    const result = applyDraftAction(
      eng.faqDrafts,
      args.body.action === "faq-approve" ? "approve" : "answer",
      draftId,
      args.body.action === "faq-answer" ? args.body.answer : undefined,
    );
    if (result.error && !result.changed) return { status: 400, body: { error: result.error }, notify: false };
    const filled = args.body.action === "faq-answer" && result.changed;
    const view = viewOf({ ...eng, faqDrafts: result.record }, record);
    if (!args.persist) return { status: 200, body: { ...view, demo: true, resume: resumeOf(record, result.record) }, notify: false };
    return {
      status: 200,
      body: view,
      patch: { faqDrafts: result.record },
      log: { type: "faq_drafts_ready", label: args.body.action === "faq-approve" ? "Client approved an FAQ draft. It is not published." : "Client added an FAQ answer. It is back with Saabai for review." },
      notify: filled,
    };
  }
  return { status: 400, body: { error: "Unknown action." }, notify: false };
}

export function onboardingView(eng: Eng) {
  return viewOf(eng, readRecord(eng.searchOnboarding));
}

export async function sendOnboardingNotice(eng: Eng, notify: typeof notifyAdminFaqQueue = notifyAdminFaqQueue): Promise<{ sent: boolean }> {
  const faqs = eng.faqDrafts;
  if (!faqs) return { sent: false };
  const unanswered = faqs.drafts.filter((d) => d.status === "unanswered" || !d.answer.trim()).length;
  return notify({
    firmName: eng.firmName,
    engagementId: eng.id,
    draftCount: faqs.drafts.length,
    unanswered,
    clientEmail: eng.contactEmail,
  });
}

function viewOf(eng: Eng, record: SearchOnboardingRecord) {
  const plan = planIntake({ firmType: eng.firmType, prefill: record.prefill ?? null, answers: record.answers });
  return {
    firmName: eng.firmName,
    contactName: eng.contactName,
    website: record.crawlUrl || eng.website || "",
    completed: Boolean(record.completedAt),
    knownBusiness: plan.knownBusiness,
    confirms: plan.confirms,
    asks: plan.asks,
    completeness: plan.completeness,
    faqs: eng.faqDrafts ?? null,
    accessHelp: "Invite hello@saabai.ai as a read-only user. Do not send a password.",
    sampleUrl: PREVIEW_SAMPLE_URL,
  };
}

async function draftsFor(eng: Eng, record: SearchOnboardingRecord, brief: ReturnType<typeof searchBriefFromAnswers>, fetchImpl: Fetcher | undefined, now: string): Promise<FaqDraftRecord> {
  const url = record.crawlUrl || eng.website || "";
  let snapshot = null;
  if (url && isPreviewSampleUrl(url)) snapshot = previewCrawlSnapshot();
  else if (url) {
    try { snapshot = await crawlForSearch(url, fetchImpl); } catch { snapshot = null; }
  }
  const overview = textAnswer(record.answers.ideal_customers);
  return buildFaqDrafts({
    snapshot,
    client: clientInputFromBrief({ firmName: eng.firmName, firmType: eng.firmType, location: eng.location, brief, overview }),
    clientQas: parseQaList(record.answers.buyer_questions),
    now,
    previous: eng.faqDrafts,
  });
}

function readRecord(raw: SearchOnboardingRecord | undefined): SearchOnboardingRecord {
  return {
    updatedAt: raw?.updatedAt || "",
    completedAt: raw?.completedAt,
    crawlUrl: raw?.crawlUrl,
    prefill: raw?.prefill,
    answers: raw?.answers && typeof raw.answers === "object" ? raw.answers : {},
  };
}

function resumeOf(record: SearchOnboardingRecord, faqs: FaqDraftRecord | undefined) {
  return { crawlUrl: record.crawlUrl ?? null, prefill: record.prefill ?? null, answers: record.answers, faqs: faqs ?? null };
}

function textAnswer(value: Answers[string] | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
