import { Num } from "../ui/Num";

export type OrderLite = { kind: string; amountTotal: number | null; monthlyAmount: number | null; createdAt: number; statusLabel: string };
export type BpStats = { todayCount: number; todayRevenue: number; weekCount: number; weekRevenue: number; allCount: number; allRevenue: number };

export type Load<T> = { state: "loading" } | { state: "ready"; data: T } | { state: "error"; message: string };

function messageOf(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string") {
    const message = (body as { error: string }).error.trim();
    if (message) return message;
  }
  return fallback;
}

export function interpretOrdersResponse(ok: boolean, body: unknown): Load<OrderLite[]> {
  if (!ok || !body || typeof body !== "object" || !Array.isArray((body as { orders?: unknown }).orders)) {
    return { state: "error", message: messageOf(body, "Couldn't load orders for analytics.") };
  }
  return { state: "ready", data: (body as { orders: OrderLite[] }).orders };
}

export function interpretBlueprintResponse(ok: boolean, body: unknown): Load<BpStats> {
  if (!ok || !body || typeof body !== "object" || typeof (body as { todayCount?: unknown }).todayCount !== "number") {
    return { state: "error", message: messageOf(body, "Couldn't load Blueprint stats.") };
  }
  const stats = body as BpStats;
  if (typeof stats.allCount !== "number" || typeof stats.weekCount !== "number") {
    return { state: "error", message: "Couldn't load Blueprint stats." };
  }
  return { state: "ready", data: stats };
}

export function SalesStats({ orders, blueprint }: { orders: Load<OrderLite[]>; blueprint: Load<BpStats> }) {
  const ready = orders.state === "ready" ? orders.data : null;
  const lex = ready?.filter((order) => order.kind === "lex_subscription") ?? [];
  const care = ready?.filter((order) => order.kind === "website_care") ?? [];
  const blueprints = ready?.filter((order) => order.kind === "blueprint") ?? [];
  const revenue = ready?.reduce((sum, order) => sum + (order.amountTotal || 0), 0) ?? 0;
  const mrr = lex.reduce((sum, order) => sum + (order.monthlyAmount || 0), 0);
  const bp = blueprint.state === "ready" ? blueprint.data : null;

  return (
    <>
      {orders.state === "error" ? (
        <div className="card" role="alert" data-state="orders-error" style={{ marginBottom: 16 }}>
          <div className="hd"><h2>Sales stats are unavailable</h2></div>
          <div className="bd">{orders.message}</div>
        </div>
      ) : orders.state === "loading" ? (
        <div className="card" role="status" data-state="orders-loading" style={{ marginBottom: 16 }}>
          <div className="bd">Loading sales stats…</div>
        </div>
      ) : (
        <div className="kpis">
          <div className="card kpi">
            <div className="l">Total orders</div>
            <div className="v num">{ready?.length || "-"}</div>
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
            <div className="d muted">{bp ? `$${(bp.allRevenue / 100).toLocaleString("en-AU")}` : blueprint.state === "error" ? "Unavailable" : "Loading..."}</div>
          </div>
        </div>
      )}

      <div className="g2">
        {blueprint.state === "error" ? (
          <div className="card" role="alert" data-state="blueprint-error">
            <div className="hd"><h2>Blueprint stats are unavailable</h2></div>
            <div className="bd">{blueprint.message}</div>
          </div>
        ) : (
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
              ].map((item) => (
                <div key={item.l}>
                  <div className="muted" style={{ fontSize: 12 }}>{item.l}</div>
                  <div className="num" style={{ fontSize: 22, fontWeight: 500 }}>{item.v ?? "-"}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{item.s}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {ready ? (
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
                <span className="num">{ready.length ? `${Math.round((lex.length / ready.length) * 100)}%` : "-"}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
