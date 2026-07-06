"use client";

import { useState, useEffect } from "react";
import AdminShell from "../AdminShell";

interface User {
  name: string; email: string; role: string; createdAt: string; lastActive?: string;
  source?: string; dashboardUrl?: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user-directory")
      .then((r) => r.json())
      .then((d) => { if (d.success) setUsers(d.users); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const whUsers = users.filter((u) => {
    if (u.source === "env") return true;
    if (u.dashboardUrl?.includes("wholesale")) return true;
    return false;
  });

  return (
    <AdminShell>
      <div style={{ maxWidth: 900 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "#111827" }}>Users</h1>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: "#6b7280" }}>{whUsers.length} registered user{whUsers.length !== 1 ? "s" : ""}</p>

        {loading && <p style={{ fontSize: 13, color: "#6b7280" }}>Loading...</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {whUsers.map((u) => (
            <div key={u.email} style={{ padding: "12px 16px", borderRadius: 10, background: "#fff", border: "1px solid rgba(0,0,0,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" }}>{u.name}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6b7280" }}>{u.email}</p>
                </div>
                <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 999, background: "rgba(8,145,178,0.08)", color: "#0891b2", fontWeight: 600, height: "fit-content" }}>
                  {u.role || "user"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
