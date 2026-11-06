/**
 * POST /api/portal/blueprint/auth { token }
 * Exchanges a single-use magic link token for the portal session cookie.
 * A POST (not a GET link) so email scanners that pre-fetch links cannot burn the token.
 */
import { NextResponse } from "next/server";
import { portalAllowed, portalEnabled } from "../../../../../lib/portal-blueprint/flag";
import { consumePortalToken } from "../../../../../lib/portal-blueprint/links";
import { BP_COOKIE, bpCookieOptions, sameOrigin, signBpSession } from "../../../../../lib/portal-blueprint/session";
import { notFound } from "../../../../../lib/portal-blueprint/api";
import { findEngagementsByEmail } from "../../../../../lib/audit-store";
import { recordLogin } from "../../../../../lib/portal-blueprint/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!portalEnabled()) return notFound();
  if (!sameOrigin(req)) return Response.json({ error: "Forbidden" }, { status: 403 });
  let token: unknown = null;
  try {
    token = (await req.json())?.token;
  } catch {
    /* falls through */
  }
  const rec = await consumePortalToken(token);
  if (!rec || !portalAllowed(rec.email)) return Response.json({ error: "expired" }, { status: 401 });
  const res = NextResponse.json({ ok: true, redirect: rec.redirect });
  res.cookies.set(BP_COOKIE, signBpSession(rec.email), bpCookieOptions());
  const engagements = await findEngagementsByEmail(rec.email);
  if (engagements[0]) await recordLogin(engagements[0].id);
  return res;
}
