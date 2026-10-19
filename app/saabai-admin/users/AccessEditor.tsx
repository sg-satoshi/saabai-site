"use client";

import type { CSSProperties } from "react";
import { AREAS, MAX_LEVEL, type Area, type Level } from "../../../lib/access";

export type AccessValue = {
  role: "viewer" | "custom";
  areas: Partial<Record<Area, Level>>;
  expiresAt?: string;
  disabled?: boolean;
};

export const defaultAccess = (): AccessValue => ({ role: "viewer", areas: {} });

const LABEL: Record<Area, string> = {
  coupons: "Coupons / offers", products: "Products", chatbots: "Chatbots", experiments: "Experiments", orders: "Orders",
  customers: "Customers", announcements: "Announcements", billing: "Billing (read only)", users: "Users",
};
// users is admin-only by design: never offered here.
const GRANTABLE = AREAS.filter((a) => MAX_LEVEL[a] !== "none");

const sel: CSSProperties = { padding: "6px 8px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.15)", background: "#fff", fontSize: 13 };

/** Role + per-area permission editor for restricted staff. The server re-validates and caps everything. */
export default function AccessEditor({ value, onChange }: { value: AccessValue; onChange: (v: AccessValue) => void }) {
  const viewer = value.role === "viewer";
  const set = (a: Area, l: Level) => {
    const areas = { ...value.areas };
    if (l === "none") delete areas[a];
    else areas[a] = l;
    onChange({ ...value, areas });
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8 }}>
      <label style={{ fontSize: 13 }}>
        Access level{" "}
        <select
          style={sel}
          value={value.role}
          onChange={(e) => {
            const role = e.target.value as "viewer" | "custom";
            const areas = { ...value.areas };
            if (role === "viewer") for (const k of Object.keys(areas) as Area[]) if (areas[k] === "write") areas[k] = "read";
            onChange({ ...value, role, areas });
          }}
        >
          <option value="viewer">Viewer (read-only)</option>
          <option value="custom">Custom (read or write per area)</option>
        </select>
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, alignItems: "center" }}>
        {GRANTABLE.map((a) => {
          const max = MAX_LEVEL[a];
          return (
            <div key={a} style={{ display: "contents" }}>
              <span style={{ fontSize: 13 }}>{LABEL[a]}</span>
              <select style={sel} value={value.areas[a] ?? "none"} onChange={(e) => set(a, e.target.value as Level)} aria-label={LABEL[a]}>
                <option value="none">None</option>
                <option value="read">Read</option>
                {!viewer && max === "write" && <option value="write">Read and write</option>}
              </select>
            </div>
          );
        })}
      </div>
      <label style={{ fontSize: 13 }}>
        Access expires (optional){" "}
        <input
          type="date"
          style={sel}
          value={value.expiresAt ? value.expiresAt.slice(0, 10) : ""}
          onChange={(e) => onChange({ ...value, expiresAt: e.target.value ? new Date(`${e.target.value}T23:59:59`).toISOString() : undefined })}
        />
      </label>
      <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>
        Restricted accounts must set up two-factor sign-in before they can use anything. Users, permissions, impersonation and anything not listed stay full-admin only.
      </p>
    </div>
  );
}
