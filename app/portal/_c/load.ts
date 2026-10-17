import { redirect } from "next/navigation";
import { portalAllowed } from "../../../lib/portal-blueprint/flag";
import { getBpSession } from "../../../lib/portal-blueprint/session";
import { getOwnedEngagement } from "../../../lib/portal-blueprint/store";
import { snapshot } from "../../../lib/portal-blueprint/api";
import { orderRef, TIER_NAMES } from "../../../lib/portal-blueprint/progress";

/** Session + ownership for a portal page. Redirects to sign in, or 404s the same way for strangers. */
export async function loadPortalPage(id: string) {
  const s = await getBpSession();
  if (!s) redirect("/portal/login");
  const own = await getOwnedEngagement(id, s.email);
  if (!own.ok || !portalAllowed(own.engagement.contactEmail)) redirect("/portal/login");
  const e = own.engagement;
  return { e, snap: snapshot(e), ref: orderRef(e), plan: TIER_NAMES[e.tier] };
}
