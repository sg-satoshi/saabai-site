/**
 * Public, token-gated Blueprint search onboarding.
 * GET resumes. POST reads the site (GET-only crawl), saves answers, or updates FAQ drafts.
 * Demo tokens (preview-demo) store nothing and email no one.
 * This route does not create leads and does not email the client.
 */

import { getEngagementByToken, logEvent, updateEngagement } from "../../../../../lib/audit-store";
import { demoEngagement, isDemoFactFindToken } from "../../../../../lib/audit-factfind-demo";
import type { AuditEngagement } from "../../../../../lib/audit-types";
import { handleOnboarding, onboardingView, sendOnboardingNotice, type OnboardingBody } from "../../../../../lib/blueprint/onboarding-handle";
import { lockDrafts, sanitizeAnswers, type FaqDraftRecord, type SearchOnboardingRecord, type SitePrefill } from "../../../../../lib/blueprint/onboarding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  const demo = isDemoFactFindToken(token);
  const engagement = demo ? demoEngagement(token) : await getEngagementByToken(token);
  if (!engagement) return Response.json({ error: "Invalid or expired link" }, { status: 404 });
  return Response.json({ ...onboardingView(engagement), demo });
}

export async function POST(req: Request, { params }: Params) {
  const { token } = await params;
  const demo = isDemoFactFindToken(token);
  const stored = demo ? demoEngagement(token) : await getEngagementByToken(token);
  if (!stored) return Response.json({ error: "Invalid or expired link" }, { status: 404 });

  let body: OnboardingBody & { session?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("action" in body)) {
    return Response.json({ error: "Unknown action." }, { status: 400 });
  }

  const engagement = demo ? hydrateDemo(stored, body.session) : stored;
  const result = await handleOnboarding({ engagement, body, persist: !demo });
  if (!demo && result.patch) {
    const updated = await updateEngagement(engagement.id, result.patch);
    if (!updated) return Response.json({ error: "Storage unavailable" }, { status: 503 });
    if (result.log) await logEvent(engagement.id, result.log.type, result.log.label);
    if (result.notify) await sendOnboardingNotice(updated);
  }
  return Response.json(result.body, { status: result.status });
}

function hydrateDemo(base: AuditEngagement, session: unknown): AuditEngagement {
  if (!session || typeof session !== "object") return base;
  const raw = session as Record<string, unknown>;
  const answers = sanitizeAnswers(raw.answers).answers;
  const prefill = asPrefill(raw.prefill);
  const crawlUrl = typeof raw.crawlUrl === "string" ? raw.crawlUrl.slice(0, 300) : undefined;
  const record: SearchOnboardingRecord = { updatedAt: "", answers, prefill, crawlUrl };
  return {
    ...base,
    website: crawlUrl || base.website,
    searchOnboarding: record,
    faqDrafts: cleanFaqs(raw.faqs),
  };
}

function asPrefill(raw: unknown): SitePrefill | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const p = raw as SitePrefill;
  if (typeof p.url !== "string") return undefined;
  return {
    ...p,
    url: p.url.slice(0, 300),
    services: Array.isArray(p.services) ? p.services.filter((s) => typeof s === "string").slice(0, 12) : [],
    faqs: Array.isArray(p.faqs) ? p.faqs.slice(0, 10) : [],
    schemaTypes: Array.isArray(p.schemaTypes) ? p.schemaTypes.filter((s) => typeof s === "string").slice(0, 12) : [],
    settledCheckIds: Array.isArray(p.settledCheckIds) ? p.settledCheckIds : [],
    pagesRead: typeof p.pagesRead === "number" ? p.pagesRead : 0,
    shell: Boolean(p.shell),
    phone: typeof p.phone === "string" ? p.phone : null,
    serviceAreas: typeof p.serviceAreas === "string" ? p.serviceAreas : null,
    promise: typeof p.promise === "string" ? p.promise : null,
    gbpUrl: typeof p.gbpUrl === "string" ? p.gbpUrl : null,
    ratingSeen: typeof p.ratingSeen === "string" ? p.ratingSeen : null,
    industryHint: typeof p.industryHint === "string" ? p.industryHint : null,
    note: typeof p.note === "string" ? p.note : null,
  };
}

function cleanFaqs(raw: unknown): FaqDraftRecord | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const rec = raw as FaqDraftRecord;
  if (!Array.isArray(rec.drafts) || (rec.questionBank !== "local" && rec.questionBank !== "professional" && rec.questionBank !== "property" && rec.questionBank !== "general")) return undefined;
  return lockDrafts({ ...rec, published: false });
}
