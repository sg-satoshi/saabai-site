"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  source?: string;
  dashboardUrl?: string;
  createdAt?: string;
}

const C = {
  bg: "#0a0f14",
  surface: "#111820",
  surface2: "#162130",
  border: "#1e2a35",
  border2: "#243040",
  text: "#e8e4dc",
  textDim: "#7a8a9a",
  textMuted: "#3d5168",
  gold: "#c9a227",
  goldBg: "rgba(201,162,39,0.12)",
  red: "#ef4444",
  redBg: "rgba(239,68,68,0.08)",
};

function inp(extra?: React.CSSProperties): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 14px",
    borderRadius: 8,
    border: `1px solid ${C.border2}`,
    background: C.bg,
    color: C.text,
    fontSize: 14,
    outline: "none",
    ...extra,
  };
}

function lbl(text: string) {
  return <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>{text}</label>;
}

export default function UsersClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Add form state
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState("user");
  const [addDashboardUrl, setAddDashboardUrl] = useState("/rex-dashboard");

  // Edit state
  const [editUser, setEditUser] = useState<User | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState("user");
  const [editDashboardUrl, setEditDashboardUrl] = useState("");

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/user-directory");
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim() || !addEmail.trim() || !addPassword.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user-directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName, email: addEmail, password: addPassword, role: addRole, dashboardUrl: addDashboardUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAdd(false);
        resetAdd();
        fetchUsers();
        showToast("User created");
      } else {
        showToast(data.error || "Failed to create user", false);
      }
    } catch { showToast("Error creating user", false); }
    setSaving(false);
  }

  function openEdit(user: User) {
    setEditUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword("");
    setEditRole(user.role);
    setEditDashboardUrl(user.dashboardUrl || "/rex-dashboard");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser || updating) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/user-directory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalEmail: editUser.email,
          name: editName,
          email: editEmail,
          role: editRole,
          dashboardUrl: editDashboardUrl,
          ...(editPassword.trim() ? { password: editPassword } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditUser(null);
        fetchUsers();
        showToast("User updated");
      } else {
        showToast(data.error || "Failed to update", false);
      }
    } catch { showToast("Error updating user", false); }
    setUpdating(false);
  }

  async function deleteUser(email: string, name: string) {
    if (!confirm(`Delete ${name} (${email})? This cannot be undone.`)) return;
    try {
      const res = await fetch("/api/user-directory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.filter(u => u.email !== email));
        showToast("User deleted");
      } else {
        showToast(data.error || "Failed to delete", false);
      }
    } catch { showToast("Error deleting user", false); }
  }

  function resetAdd() {
    setAddName(""); setAddEmail(""); setAddPassword(""); setAddRole("user"); setAddDashboardUrl("/rex-dashboard");
  }

  const roleColors: Record<string, { bg: string; color: string }> = {
    admin: { bg: C.goldBg, color: C.gold },
    user: { bg: "rgba(34,197,94,0.12)", color: "#22c55e" },
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.ok ? "#1a3a2a" : "#3a1a1a", border: `1px solid ${toast.ok ? "#22c55e" : C.red}`, color: toast.ok ? "#22c55e" : C.red, padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,.4)" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "24px 32px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>User Directory</h1>
          <p style={{ margin: "4px 0 0", color: C.textDim, fontSize: 13 }}>Manage portal users and access</p>
        </div>
        <button onClick={() => { resetAdd(); setShowAdd(true); }} style={{ background: C.goldBg, border: `1px solid ${C.gold}`, color: C.gold, padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          + Add User
        </button>
      </div>

      {/* User List */}
      <div style={{ padding: "24px 32px" }}>
        {loading ? (
          <p style={{ color: C.textDim }}>Loading users...</p>
        ) : users.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: C.textDim }}>
            <p style={{ fontSize: 18, marginBottom: 8 }}>No users yet</p>
            <p style={{ fontSize: 14 }}>Click &quot;+ Add User&quot; to create the first account</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {users.map(user => {
              const rc = roleColors[user.role] || roleColors.user;
              return (
                <div key={user.email} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.goldBg, border: `1px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: C.gold, flexShrink: 0 }}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                        <span onClick={() => user.source !== "env" && openEdit(user)} style={{ fontSize: 15, fontWeight: 600, cursor: user.source !== "env" ? "pointer" : "default", textDecoration: user.source !== "env" ? "underline" : "none", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}>{user.name}</span>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: rc.bg, color: rc.color, textTransform: "uppercase", fontWeight: 600 }}>{user.role}</span>
                        {user.source === "env" && <span style={{ fontSize: 11, color: C.textMuted }}>env</span>}
                      </div>
                      <p style={{ margin: 0, color: C.textDim, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
                      {user.dashboardUrl && <p style={{ margin: "2px 0 0", color: C.textMuted, fontSize: 11, fontFamily: "monospace" }}>{user.dashboardUrl}</p>}
                    </div>
                  </div>
                  {user.source !== "env" && (
                    <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
                      <button onClick={() => openEdit(user)} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.border2}`, background: "none", color: C.textDim, fontSize: 12, cursor: "pointer", fontWeight: 500 }}>Edit</button>
                      <button onClick={() => deleteUser(user.email, user.name)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: "none", color: C.red, fontSize: 12, cursor: "pointer" }}>Delete</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={() => setEditUser(null)}>
          <form onSubmit={saveEdit} style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 16, width: "100%", maxWidth: 460, padding: "28px 32px" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Edit User</h2>
              <button type="button" onClick={() => setEditUser(null)} style={{ background: "none", border: "none", color: C.textDim, fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>{lbl("Full Name")}<input value={editName} onChange={e => setEditName(e.target.value)} required style={inp()} /></div>
              <div>{lbl("Email")}<input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} required style={inp()} /></div>
              <div>{lbl("Dashboard URL")}<input value={editDashboardUrl} onChange={e => setEditDashboardUrl(e.target.value)} placeholder="/rex-dashboard" style={inp()} /></div>
              <div>
                {lbl("Role")}
                <div style={{ display: "flex", gap: 8 }}>
                  {["user", "admin"].map(r => (
                    <button key={r} type="button" onClick={() => setEditRole(r)} style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: `1px solid ${editRole === r ? C.gold : C.border2}`, background: editRole === r ? C.goldBg : C.bg, color: editRole === r ? C.gold : C.textDim, fontSize: 13, fontWeight: 500, cursor: "pointer", textTransform: "capitalize" }}>{r}</button>
                  ))}
                </div>
              </div>
              <div>{lbl("New Password (leave blank to keep current)")}<input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="••••••••" style={inp()} /></div>
              <button type="submit" disabled={updating} style={{ marginTop: 4, width: "100%", padding: "12px", borderRadius: 8, border: "none", background: updating ? C.border : C.gold, color: updating ? C.textDim : "#000", fontSize: 14, fontWeight: 700, cursor: updating ? "not-allowed" : "pointer" }}>
                {updating ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add User Modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={() => setShowAdd(false)}>
          <form onSubmit={createUser} style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 16, width: "100%", maxWidth: 460, padding: "28px 32px" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Add New User</h2>
              <button type="button" onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", color: C.textDim, fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>{lbl("Full Name *")}<input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Jane Smith" required autoFocus style={inp()} /></div>
              <div>{lbl("Email *")}<input type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="jane@example.com" required style={inp()} /></div>
              <div>{lbl("Password *")}<input type="password" value={addPassword} onChange={e => setAddPassword(e.target.value)} placeholder="Choose a password" required style={inp()} /></div>
              <div>{lbl("Dashboard URL")}<input value={addDashboardUrl} onChange={e => setAddDashboardUrl(e.target.value)} placeholder="/rex-dashboard" style={inp()} /></div>
              <div>
                {lbl("Role")}
                <div style={{ display: "flex", gap: 8 }}>
                  {["user", "admin"].map(r => (
                    <button key={r} type="button" onClick={() => setAddRole(r)} style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: `1px solid ${addRole === r ? C.gold : C.border2}`, background: addRole === r ? C.goldBg : C.bg, color: addRole === r ? C.gold : C.textDim, fontSize: 13, fontWeight: 500, cursor: "pointer", textTransform: "capitalize" }}>{r}</button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={saving} style={{ marginTop: 4, width: "100%", padding: "12px", borderRadius: 8, border: "none", background: saving ? C.border : C.gold, color: saving ? C.textDim : "#000", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
