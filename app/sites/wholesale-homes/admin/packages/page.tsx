"use client";

import { useState, useEffect } from "react";
import AdminShell from "../AdminShell";

export default function AdminPackages() {
  const [packages, setPackages] = useState<{ id: string; name: string; suburb: string; state: string; builder: string; wholesalePrice: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import("../../_data/packages").then((mod) => {
      setPackages(mod.packages);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <AdminShell>
      <div style={{ maxWidth: 900 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "#111827" }}>Packages</h1>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: "#6b7280" }}>{packages.length} active package{packages.length !== 1 ? "s" : ""}</p>

        {loading && <p style={{ fontSize: 13, color: "#6b7280" }}>Loading...</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {packages.map((p) => (
            <div key={p.id} style={{ padding: "12px 16px", borderRadius: 10, background: "#fff", border: "1px solid rgba(0,0,0,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" }}>{p.name}</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6b7280" }}>{p.suburb}, {p.state} &middot; {p.builder}</p>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0891b2" }}>${(p.wholesalePrice / 1000).toFixed(0)}K</span>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
