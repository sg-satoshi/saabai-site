"use client";

import { useEffect, useState } from "react";
import AdminShell from "./AdminShell";

interface Lead {
  name: string; email: string; phone: string; buyer_type?: string;
  state?: string; timeline?: string; createdAt: number;
}

interface User {
  name: string; email: string; role: string; createdAt: string;
}

export default function AdminDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState({ pending: 0, users: 0, packages: 0 });

  useEffect(() => {
    async function load() {
      try {
        const [leadRes, userRes] = await Promise.all([
          fetch("/api/site-factory/lead?siteSlug=wholesale-homes"),
          fetch("/api/user-directory"),
        ]);
        const leadData = await leadRes.json();
        const userData = await userRes.json();

        const pending = leadData.success ? leadData.leads.length : 0;
        const totalUsers = userData.success ? userData.users.length : 0;
        setStats({ pending, users: totalUsers, packages: 26 });
        setLeads(leadData.success ? leadData.leads : []);
        setUsers(userData.success ? userData.users : []);
      } catch {}
    }
    load();
  }, []);

  const recentLeads = leads.slice(-5).reverse();

  return (
    <AdminShell>
      <div style={{ maxWidth: 960 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "#111827", letterSpacing: "-0.3px" }}>
          Admin Dashboard
        </h1>
        <p style={{ margin: "0 0 28px", fontSize: 13, color: "#6b7280" }}>
          Wholesale Homes Australia management overview.
        </p>

        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", marginBottom: 32 }}>
          <StatCard label="Pending Leads" value={stats.pending.toString()} color="#0891b2" />
          <StatCard label="Total Users" value={stats.users.toString()} color="#16a34a" />
          <StatCard label="Active Packages" value={stats.packages.toString()} color="#d4a84b" />
        </div>

        <div style={{ display: "grid", gap: 20, gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)", padding: 20 }}>
            <p style={{ margin: "0 0 12px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#9ca3af" }}>Recent Leads</p>
            {recentLeads.length === 0 && <p style={{ fontSize: 12, color: "#9ca3af" }}>No pending leads</p>}
            {recentLeads.map((l, i) => (
              <div key={l.email + l.createdAt} style={{ padding: "8px 0", borderBottom: i < recentLeads.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none" }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#111827" }}>{l.name}</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6b7280" }}>{l.email}</p>
              </div>
            ))}
          </div>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)", padding: 20 }}>
            <p style={{ margin: "0 0 12px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#9ca3af" }}>Quick Actions</p>
            <a href="/admin/leads" style={{ display: "block", padding: "10px 14px", marginBottom: 8, borderRadius: 8, background: "rgba(8,145,178,0.08)", color: "#0891b2", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              Approve pending leads &rarr;
            </a>
            <a href="/admin/users" style={{ display: "block", padding: "10px 14px", borderRadius: 8, background: "rgba(22,163,74,0.08)", color: "#16a34a", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              Manage users &rarr;
            </a>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)", padding: "18px 20px" }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#9ca3af" }}>{label}</p>
      <p style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 800, color, letterSpacing: "-0.5px" }}>{value}</p>
    </div>
  );
}
