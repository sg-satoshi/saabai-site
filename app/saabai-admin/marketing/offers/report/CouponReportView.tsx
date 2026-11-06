"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { filterCouponReport, type CouponReportRow } from "@/lib/coupons/report";

const aud = (cents: number) => (cents / 100).toLocaleString("en-AU", { style: "currency", currency: "AUD" });

export default function CouponReportView({ rows }: { rows: CouponReportRow[] }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => filterCouponReport(rows, q), [rows, q]);
  const uses = shown.reduce((n, r) => n + r.uses, 0);
  const discount = shown.reduce((n, r) => n + r.discountCents, 0);

  return (
    <>
      <div className="ph">
        <div>
          <div className="crumb">Marketing / <Link href="/saabai-admin/marketing/offers">Offers &amp; Coupons</Link> / <b>Coupon report</b></div>
          <h1>Coupon report</h1>
          <p className="sub">Uses and discount already saved from checkouts. Read only. Stripe is not contacted and nothing is changed.</p>
        </div>
      </div>

      <div className="kpis k3">
        <div className="card kpi"><div className="l">Codes</div><div className="v">{shown.length}</div></div>
        <div className="card kpi"><div className="l">Uses</div><div className="v">{uses}</div></div>
        <div className="card kpi"><div className="l">Discount</div><div className="v">{aud(discount)}</div></div>
      </div>

      <div className="card">
        <div className="fbar">
          <label className="inp" style={{ width: "min(100%, 280px)" }}>
            <input
              aria-label="Filter by code"
              value={q}
              placeholder="Filter by code"
              onChange={(e) => setQ(e.target.value)}
              style={{ border: 0, width: "100%", font: "inherit", background: "transparent", outline: "none" }}
            />
          </label>
          <span className="muted" style={{ fontSize: 13 }}>{shown.length} of {rows.length}</span>
        </div>
        {shown.length === 0 ? (
          <div className="bd"><p className="muted">{rows.length ? "No codes match that filter." : "No saved redemptions yet."}</p></div>
        ) : (
          <div className="tbl-scroll">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th className="r">Uses</th>
                  <th className="r">Discount</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.code}>
                    <td className="num">{r.code}</td>
                    <td className="r">{r.uses}</td>
                    <td className="r">{aud(r.discountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>
        A checkout saved in more than one place is counted once. Care plan sites keep only the latest code. Checkout events are the latest 5,000 saved purchases.
      </p>
    </>
  );
}
