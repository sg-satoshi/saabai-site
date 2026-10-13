"use client";

import { useEffect, useState } from "react";
import AdminShell from "../AdminSidebar";
import { Num } from "../ui/Num";

type OrderLite = { kind: string; amountTotal: number | null; monthlyAmount: number | null; createdAt: number; statusLabel: string };
type BpStats = { todayCount: number; todayRevenue: number; weekCount: number; weekRevenue: number; allCount: number; allRevenue: number };

export default function AnalyticsClient() {
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [bp, setBp] = useState<BpStats | null>(null);

  useEffect(() => {
    fetch("/api/admin/orders").then(r => r.json()).then(d => setOrders(d.orders || [])).catch(() => {});
    fetch("/api/admin/blueprint-stats").then(r => r.json()).then(d => { if (typeof d.todayCount === "number") setBp(d); }).catch(() => {});
  }, []);

  const lex = orders.filter(o => o.kind === "lex_subscription");
  const care = orders.filter(o => o.kind === "website_care");
  const blueprints = orders.filter(o => o.kind === "blueprint");
  const revenue = orders.reduce((s, o) => s + (o.amountTotal || 0), 0);
  const mrr = lex.reduce((s, o) => s + (o.monthlyAmount || 0), 0);

  return (
    <AdminShell activePath="/saabai-admin/analytics" title="Analytics">
      <div className="ph">
        <div>
          <h1>Analytics</h1>
          <div className="sub">Sales and delivery snapshot. Lex subscriptions count in order totals.</div>
        </div>
      </div>

      <div className="kpis">
        <div className="card kpi">
          <div className="l">Total orders</div>
          <div className="v num">{orders.length || "-"}</div>
          <div className="d muted">{blueprints.length} Blueprint · {lex.length} Lex · {care.length} Web/Care</div>
        </div>
        <div className="card kpi">
          <div className="l">Collected revenue</div>
          <div className="v num"><Num>${(revenue / 100).toLocaleString("en-AU")}</Num></div>
          <div className="d muted">All paid orders</div>
        </div>
        <div className="card kpi">
          <div className="l">Lex MRR</div>
          <div className="v num"><Num>${(mrr / 100).toLocaleString("en-AU")}</Num></div>
          <div className="d muted">{lex.length} subscriptions</div>
        </div>
        <div className="card kpi">
          <div className="l">Blueprints lifetime</div>
          <div className="v num">{bp ? bp.allCount : "-"}</div>
          <div className="d muted">{bp ? `$${(bp.allRevenue / 100).toLocaleString("en-AU")}` : "Loading..."}</div>
        </div>
      </div>

      <div className="g2">
        <div className="card">
          <div className="hd">
            <div>
              <h2>Blueprint velocity</h2>
              <div className="sub">Paid engagements</div>
            </div>
          </div>
          <div className="bd" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[
              { l: "Today", v: bp?.todayCount, s: bp ? `$${(bp.todayRevenue / 100).toLocaleString("en-AU")}` : "" },
              { l: "This week", v: bp?.weekCount, s: bp ? `$${(bp.weekRevenue / 100).toLocaleString("en-AU")}` : "" },
              { l: "All time", v: bp?.allCount, s: bp ? `$${(bp.allRevenue / 100).toLocaleString("en-AU")}` : "" },
            ].map(x => (
              <div key={x.l}>
                <div className="muted" style={{ fontSize: 12 }}>{x.l}</div>
                <div className="num" style={{ fontSize: 22, fontWeight: 500 }}>{x.v ?? "-"}</div>
                <div className="muted" style={{ fontSize: 12 }}>{x.s}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="hd"><h2>Mix</h2></div>
          <div className="bd">
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--n-100)" }}>
              <span>Blueprints</span>
              <span className="num">{blueprints.length}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--n-100)" }}>
              <span>Lex subscriptions</span>
              <span className="num">{lex.length}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
              <span>Share Lex</span>
              <span className="num">{orders.length ? `${Math.round((lex.length / orders.length) * 100)}%` : "-"}</span>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
