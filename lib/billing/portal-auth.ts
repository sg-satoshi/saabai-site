import { verifySession } from "../portal-session";
import { parseCookieHeader } from "../impersonation";
import { listSites } from "../site-registry";
import { listSiteBilling, type SiteBillingRecord } from "./store";

/** Resolve the portal client's site + billing record (one billing setup per site). */
export async function resolvePortalBilling(req: Request): Promise<{ email: string; siteId: string | null; siteName: string; domain?: string; rec: SiteBillingRecord | null } | null> {
  const token = parseCookieHeader(req.headers.get("cookie"), "portal_session");
  const session = token ? verifySession(token) : null;
  if (!session?.email) return null;
  const email = session.email.toLowerCase();
  const recs = await listSiteBilling().catch(() => [] as SiteBillingRecord[]);
  let rec = recs.find((r) => r.contact.email === email) || null;
  let site = null;
  try {
    const sites = await listSites();
    site = rec ? sites.find((s) => s.id === rec!.siteId) || null : sites.find((s) => (s.business?.email || "").toLowerCase() === email) || null;
  } catch { site = null; }
  if (!rec && site) rec = recs.find((r) => r.siteId === site!.id) || null;
  return { email, siteId: rec?.siteId || site?.id || null, siteName: rec?.siteName || site?.name || "", domain: (site?.domains || [])[0], rec };
}
