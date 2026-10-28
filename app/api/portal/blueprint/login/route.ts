/**
 * POST /api/portal/blueprint/login { email }
 * Emails a one-time sign-in link to a Blueprint buyer. Always answers the same
 * way so it cannot be used to discover which emails have orders.
 */
import { after } from "next/server";
import { portalEnabled } from "../../../../../lib/portal-blueprint/flag";
import { portalBaseUrl, sendPortalLink, underIpLimit } from "../../../../../lib/portal-blueprint/links";
import { clientIp, notFound } from "../../../../../lib/portal-blueprint/api";
import { sameOrigin } from "../../../../../lib/portal-blueprint/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!portalEnabled()) return notFound();
  if (!sameOrigin(req)) return Response.json({ error: "Forbidden" }, { status: 403 });
  let email: unknown = null;
  try {
    email = (await req.json())?.email;
  } catch {
    /* identical response below */
  }
  const ip = clientIp(req);
  const base = portalBaseUrl(req);
  after(async () => {
    if (await underIpLimit(ip)) await sendPortalLink(email, { base });
  });
  return Response.json({ ok: true });
}
