"use client";

import { useCallback, useEffect, useState } from "react";

type Summary = {
  subs: { mrrCents: number; activeCount: number; pastDueCount: number; pastDueCents: number } | null;
  sites: { paused: number; failing: number; pendingLinks: number } | null;
  invoices: { overdueCount: number; overdueCents: number; unpaidCount: number; unpaidCents: number } | null;
  leads: { last7d: number } | null;
  requests: { open: number; awaitingClient: number; isNew: number } | null;
  errors: string[];
};

const aud = (cents: number) => `$${(cents / 100).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;

function Kpi({ label, value, detail, tone, href }: { label: string; value: string; detail: string; tone?: "up" | "dn" | "muted"; href: string }) {
  return (
    <a className="card kpi" href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <div className="l">{label}</div>
      <div className="v num">{value}</div>
      <div className={`d ${tone ?? "muted"}`}>{detail}</div>
    </a>
  );
}

/** Business health panel on the admin dashboard. Each card degrades on its own. */
export default function BusinessHealth() {
  const [data, setData] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/business-summary", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setData(await r.json());
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (failed) {
    return (
      <div className="card" role="alert" style={{ padding: "14px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span className="muted" style={{ fontSize: 13.5 }}>Business health could not load.</span>
        <button type="button" className="btn sm" onClick={() => { setFailed(false); setData(null); load(); }}>Retry</button>
      </div>
    );
  }

  const loading = !data;
  const na = "Unavailable";
  const s = data?.subs, st = data?.sites, inv = data?.invoices, l = data?.leads, rq = data?.requests;

  return (
    <div className="kpis k3" aria-busy={loading}>
      <Kpi
        label="MRR (Stripe live)"
        href="/saabai-admin/customers"
        value={loading ? "-" : s ? aud(s.mrrCents) : "-"}
        detail={loading ? "Loading..." : s ? (s.activeCount ? `${s.activeCount} paying subscription${s.activeCount === 1 ? "" : "s"}` : "No paying subscriptions yet") : na}
      />
      <Kpi
        label="Past due"
        href="/saabai-admin/payments"
        value={loading ? "-" : s && st ? String(s.pastDueCount + st.failing) : "-"}
        tone={s && st && s.pastDueCount + st.failing > 0 ? "dn" : "up"}
        detail={loading ? "Loading..." : s && st ? (s.pastDueCount + st.failing > 0 ? `${aud(s.pastDueCents)}/mo at risk` : "All payments up to date") : na}
      />
      <Kpi
        label="Paused sites"
        href="/saabai-admin/site-factory"
        value={loading ? "-" : st ? String(st.paused) : "-"}
        tone={st && st.paused > 0 ? "dn" : st ? "up" : "muted"}
        detail={loading ? "Loading..." : st ? (st.pendingLinks ? `${st.pendingLinks} payment link${st.pendingLinks === 1 ? "" : "s"} unpaid` : st.paused ? "Unpaid 30+ days" : "None paused") : na}
      />
      <Kpi
        label="Overdue invoices"
        href="/saabai-admin/payments"
        value={loading ? "-" : inv ? String(inv.overdueCount) : "-"}
        tone={inv && inv.overdueCount > 0 ? "dn" : inv ? "up" : "muted"}
        detail={loading ? "Loading..." : inv ? (inv.overdueCount ? `${aud(inv.overdueCents)} overdue · ${inv.unpaidCount} unpaid` : inv.unpaidCount ? `${inv.unpaidCount} unpaid (${aud(inv.unpaidCents)})` : "Nothing outstanding") : na}
      />
      <Kpi
        label="New leads (7 days)"
        href="/saabai-admin/site-factory"
        value={loading ? "-" : l ? String(l.last7d) : "-"}
        detail={loading ? "Loading..." : l ? (l.last7d ? "From client site forms" : "No new leads this week") : na}
      />
      <Kpi
        label="Open requests"
        href="/saabai-admin/requests"
        value={loading ? "-" : rq ? String(rq.open) : "-"}
        tone={rq && rq.isNew > 0 ? "dn" : "muted"}
        detail={loading ? "Loading..." : rq ? (rq.open ? `${rq.isNew} new · ${rq.awaitingClient} waiting on client` : "All caught up") : na}
      />
    </div>
  );
}
