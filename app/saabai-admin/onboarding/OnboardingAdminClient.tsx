"use client";

import { useEffect, useState } from "react";

interface Row {
  clientId: string;
  name: string;
  email: string;
  stepLabel: string;
  status: "not_started" | "in_progress" | "complete";
  statusLabel: string;
  tier: string | null;
  isLex: boolean;
  updatedAt: string | null;
}

function badge(status: Row["status"]) {
  if (status === "complete") return "badge b-ok";
  if (status === "in_progress") return "badge b-info";
  return "badge b-n";
}

function tierLabel(row: Row) {
  if (row.isLex) return "Lex";
  const tier = row.tier || "retainer";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function when(value: string | null) {
  if (!value) return "Not started";
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return "Not started";
  return date.toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function OnboardingAdminClient() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/onboarding", { credentials: "include" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not load onboarding progress.");
        return data.clients as Row[];
      })
      .then((clients) => {
        if (!cancelled) setRows(clients);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || "Could not load onboarding progress.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="onb-admin">
      <div className="mc-head">
        <div>
          <p className="mc-eyebrow">Clients</p>
          <h1 className="mc-h1">Onboarding</h1>
          <p className="mc-sub">Each client&apos;s step and status, without opening their account.</p>
        </div>
      </div>

      <div className="card">
        <div className="hd">
          <h2>Progress</h2>
          <span className="muted" style={{ fontSize: 12.5 }}>{rows ? `${rows.length} clients` : "Loading"}</span>
        </div>
        {error ? (
          <div className="bd">
            <p className="onb-error" role="alert">{error}</p>
          </div>
        ) : null}
        {!error && rows && rows.length === 0 ? (
          <div className="bd">
            <p className="muted" style={{ margin: 0 }}>No client accounts yet.</p>
          </div>
        ) : null}
        {rows && rows.length > 0 ? (
          <div className="tbl-scroll onb-scroll">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Step</th>
                  <th>Status</th>
                  <th className="dt">Tier</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.email}>
                    <td>
                      <b style={{ fontWeight: 500 }}>{row.name}</b>
                      <div className="muted" style={{ fontSize: 12.5 }}>{row.email}</div>
                    </td>
                    <td>{row.status === "not_started" ? "Not started" : row.stepLabel}</td>
                    <td>
                      <span className={badge(row.status)}>{row.statusLabel}</span>
                    </td>
                    <td className="dt">{tierLabel(row)}</td>
                    <td className="muted num">{when(row.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
