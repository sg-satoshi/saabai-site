import Link from "next/link";
import { requireAdmin } from "../../../lib/require-admin";
import { listClients, type LeadGenClient } from "../../../lib/leadgen-config";
import AdminShell from "../AdminSidebar";
import { PageHeader } from "../ui/PageHeader";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "LeadGen clients", robots: { index: false, follow: false } };

function when(ms: number) {
  const t = Number(ms);
  if (!Number.isFinite(t) || t <= 0) return "";
  return new Date(t).toLocaleString("en-AU");
}

export default async function LeadGenClientsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const raw = typeof id === "string" ? id.trim() : "";
  const path = raw ? `/saabai-admin/leadgen-clients?id=${encodeURIComponent(raw)}` : "/saabai-admin/leadgen-clients";
  await requireAdmin(path);

  let clients: LeadGenClient[] = [];
  let failed = false;
  try { clients = await listClients(); } catch { failed = true; }
  const one = raw ? clients.find((c) => c.id === raw) ?? null : null;

  return (
    <AdminShell activePath="/saabai-admin/customers" title="LeadGen clients">
      <div data-testid="leadgen-clients" className="ch-page">
        <PageHeader
          title={one ? one.businessName : "LeadGen clients"}
          meta={one ? one.slug : "Read only. Open a client from Customers, or pick one here."}
          back={{ href: "/saabai-admin/customers", label: "Customers" }}
        />
        {failed && <p role="alert">Could not load LeadGen clients.</p>}
        {!failed && raw && !one && <p role="alert" data-testid="leadgen-missing">No LeadGen client matches that address.</p>}
        {one && (
          <section className="ch-card" data-testid="leadgen-client">
            <div className="ch-card-bd">
              <dl className="lg-fields">
                <dt>Business</dt><dd>{one.businessName}</dd>
                <dt>Slug</dt><dd>{one.slug}</dd>
                <dt>Email</dt><dd>{one.email || "No email on file"}</dd>
                <dt>Phone</dt><dd>{one.phone || "No phone on file"}</dd>
                <dt>Niche</dt><dd>{one.niche || "No niche on file"}</dd>
                <dt>Status</dt><dd>{one.status}</dd>
                <dt>Plan</dt><dd>{one.subscription?.tier || "No plan on file"}</dd>
                <dt>Created</dt><dd>{when(one.createdAt) || "No date on file"}</dd>
              </dl>
            </div>
          </section>
        )}
        {!one && !failed && (
          <div className="lg-grid">
            {clients.length === 0 && <p data-testid="leadgen-empty">No LeadGen clients yet.</p>}
            {clients.map((c) => (
              <Link key={c.id} className="ch-card lg-item" href={`/saabai-admin/leadgen-clients?id=${encodeURIComponent(c.id)}`} data-testid={`leadgen-${c.id}`}>
                <strong>{c.businessName}</strong>
                <span>{c.slug}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
