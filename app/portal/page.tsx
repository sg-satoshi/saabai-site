import { redirect } from "next/navigation";
import Link from "next/link";
import { getBpSession } from "../../lib/portal-blueprint/session";
import { portalAllowed } from "../../lib/portal-blueprint/flag";
import { findEngagementsByEmail } from "../../lib/audit-store";
import { orderRef, TIER_NAMES } from "../../lib/portal-blueprint/progress";

export default async function PortalIndex() {
  const s = await getBpSession();
  if (!s) redirect("/portal/login");
  const list = portalAllowed(s.email) ? await findEngagementsByEmail(s.email) : [];
  if (list.length === 0) redirect("/portal/login");
  if (list.length === 1) redirect(`/portal/${list[0].id}`);
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px" }}>
      <h1>Your orders</h1>
      <p className="lead">Pick the Blueprint you want to work on.</p>
      <div className="bp-card bp-list">
        {list.map((e) => (
          <Link key={e.id} href={`/portal/${e.id}/factfind`}>
            <span><b>{e.firmName}</b><br /><span className="mono" style={{ fontSize: 13, color: "var(--muted)" }}>{orderRef(e)} · {TIER_NAMES[e.tier]}</span></span>
            <span aria-hidden="true">Open</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
