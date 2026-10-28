"use client";

import { useEffect, useState } from "react";
import AdminShell from "../AdminSidebar";
import AiVisitorsReport from "./AiVisitorsReport";
import { interpretBlueprintResponse, interpretOrdersResponse, SalesStats, type BpStats, type Load, type OrderLite } from "./SalesStats";

export default function AnalyticsClient() {
  const [orders, setOrders] = useState<Load<OrderLite[]>>({ state: "loading" });
  const [blueprint, setBlueprint] = useState<Load<BpStats>>({ state: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/orders", { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        setOrders(interpretOrdersResponse(response.ok, body));
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setOrders({ state: "error", message: "Couldn't load orders for analytics." });
      });
    fetch("/api/admin/blueprint-stats", { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        setBlueprint(interpretBlueprintResponse(response.ok, body));
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setBlueprint({ state: "error", message: "Couldn't load Blueprint stats." });
      });
    return () => controller.abort();
  }, []);

  return (
    <AdminShell activePath="/saabai-admin/analytics" title="Analytics">
      <div className="ph">
        <div>
          <h1>Analytics</h1>
          <div className="sub">Sales and delivery snapshot. Lex subscriptions count in order totals.</div>
        </div>
      </div>
      <SalesStats orders={orders} blueprint={blueprint} />
      <AiVisitorsReport />
    </AdminShell>
  );
}
