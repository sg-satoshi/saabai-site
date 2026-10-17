/** Shared helpers for /api/portal/blueprint routes. */
import { NextResponse } from "next/server";
import { portalAllowed, portalEnabled } from "./flag";
import { BP_COOKIE, BP_SESSION_TTL_MS, bpCookieOptions, getBpSession, sameOrigin, signBpSession } from "./session";
import { getOwnedEngagement } from "./store";
import type { AuditEngagement } from "../audit-types";
import { answersOf, computeProgress, planQuestions, planSections } from "./progress";

export const notFound = () => Response.json({ error: "Not found" }, { status: 404 });

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

export type Guard =
  | { ok: true; email: string; engagement: AuditEngagement; refresh: (res: Response) => Response }
  | { ok: false; response: Response };

/** Flag + origin (mutations) + session + ownership. Everything failing looks like 404 except a missing session (401). */
export async function guardEngagement(req: Request, id: string, mutating: boolean): Promise<Guard> {
  if (!portalEnabled()) return { ok: false, response: notFound() };
  if (mutating && !sameOrigin(req)) return { ok: false, response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  const s = await getBpSession();
  if (!s) return { ok: false, response: Response.json({ error: "Please sign in" }, { status: 401 }) };
  const own = await getOwnedEngagement(id, s.email);
  if (!own.ok || !portalAllowed(own.engagement.contactEmail)) return { ok: false, response: notFound() };
  // Sliding expiry: re-issue the cookie when under 6 days remain.
  const needsRefresh = s.exp - Date.now() < BP_SESSION_TTL_MS - 24 * 60 * 60 * 1000;
  const refresh = (res: Response): Response => {
    if (!needsRefresh) return res;
    const out = new NextResponse(res.body, res);
    out.cookies.set(BP_COOKIE, signBpSession(s.email), bpCookieOptions());
    return out;
  };
  return { ok: true, email: s.email, engagement: own.engagement, refresh };
}

/** What the client may see of an engagement. Never includes admin notes, Stripe data or the legacy token. */
export function publicView(e: AuditEngagement) {
  return {
    id: e.id,
    tier: e.tier,
    firmName: e.firmName,
    contactName: e.contactName,
    version: e.portal?.version ?? 0,
    locked: Boolean(e.portal?.submittedAt),
    submittedAt: e.portal?.submittedAt ?? null,
  };
}

export function snapshot(e: AuditEngagement) {
  const answers = answersOf(e);
  return {
    ...publicView(e),
    sections: planSections(e),
    questions: planQuestions(e).map((q) => {
      const { interviewPrompt, tiers, firmTypes, ...rest } = q;
      void interviewPrompt; void tiers; void firmTypes;
      return rest;
    }),
    answers,
    progress: computeProgress(e, answers),
  };
}

