import { requireAdmin } from "@/lib/require-admin";
import { listDocs } from "@/lib/growth/store";
import AdminShell from "../AdminSidebar";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { Badge } from "../ui/Badge";
import type { MarketingDraft } from "@/app/api/admin/marketing/drafts/route";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marketing drafts" };

export default async function MarketingPage() {
  await requireAdmin("/saabai-admin/marketing");
  let drafts: MarketingDraft[] = [];
  let err = "";
  try { drafts = await listDocs<MarketingDraft>("marketing_drafts", 100); } catch { err = "Couldn't load drafts. Try again shortly."; }
  return (
    <AdminShell activePath="/saabai-admin/marketing">
      <div className="pg">
        <div className="ph"><div><h1>Marketing drafts</h1><p className="sub">Drafts from Pulse and growth automations. Nothing here has been sent.</p></div></div>
        <Card>
          <CardHeader title={`Drafts (${drafts.length})`} />
          {err && <CardBody><p className="muted">{err}</p></CardBody>}
          {!err && !drafts.length && <CardBody><p className="muted">No drafts yet. Use Send to Marketing in Pulse to create one.</p></CardBody>}
          {drafts.map((d) => (
            <div className="oc" key={d.id}>
              <div className="r1"><b>{d.subject || (d.channel === "sms" ? "SMS draft" : "Email draft")}</b><Badge tone="neutral">{d.channel === "sms" ? "SMS" : d.channel}</Badge></div>
              <p className="muted" style={{ whiteSpace: "pre-wrap", marginTop: 6, fontSize: 13 }}>{d.body.slice(0, 280)}{d.body.length > 280 ? "..." : ""}</p>
              <div className="r2"><span className="muted" style={{ fontSize: 12 }}>From {d.source} · {new Date(d.createdAt).toLocaleString("en-AU", { timeZone: "Australia/Brisbane", dateStyle: "medium", timeStyle: "short" })} AEST</span></div>
            </div>
          ))}
        </Card>
      </div>
    </AdminShell>
  );
}
