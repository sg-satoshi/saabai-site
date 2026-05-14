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
  border: "#1e2a35",
  text: "#e8e4dc",
  textDim: "#7a8a9a",
  gold: "#c9a227",
  goldBg: "rgba(201,162,39,0.12)",
};

export default function UsersClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/user-directory");
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (e) {
      console.error("Failed to fetch users", e);
    }
    setLoading(false);
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user-directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        resetForm();
        fetchUsers();
      } else {
        alert(data.error || "Failed to create user");
      }
    } catch (e) {
      alert("Error creating user");
    }
    setSaving(false);
  }

  async function deleteUser(email: string) {
    if (!confirm(`Delete user ${email}?`)) return;
    try {
      await fetch("/api/user-directory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      fetchUsers();
    } catch (e) {
      alert("Error deleting user");
    }
  }

  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setRole("user");
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "24px 32px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>User Directory</h1>
          <p style={{ margin: "4px 0 0", color: C.textDim, fontSize: 13 }}>Manage portal users and access</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            background: C.goldBg,
            border: `1px solid ${C.gold}`,
            color: C.gold,
            padding: "10px 20px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
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
            <p style={{ fontSize: 14 }}>Click "+ Add User" to create the first account</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {users.map((user) => (
              <div
                key={user.email}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "18px 24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: C.goldBg,
                    border: `1px solid ${C.gold}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 700,
                    color: C.gold,
                  }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{user.name}</span>
                      <span style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: user.role === "admin" ? C.goldBg : "rgba(34,197,94,0.15)",
                        color: user.role === "admin" ? C.gold : "#22c55e",
                        textTransform: "uppercase",
                        fontWeight: 600,
                      }}>
                        {user.role}
                      </span>
                      {user.source === "env" && (
                        <span style={{ fontSize: 11, color: C.textDim }}>env</span>
                      )}
                    </div>
                    <p style={{ margin: 0, color: C.textDim, fontSize: 13 }}>{user.email}</p>
                  </div>
                </div>
                {user.source !== "env" && (
                  <button
                    onClick={() => deleteUser(user.email)}
                    style={{
                      background: "none",
                      border: `1px solid ${C.border}`,
                      color: "#ef4444",
                      padding: "6px 12px",
                      borderRadius: 6,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showForm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setShowForm(false)}
        >
          <form
            onSubmit={createUser}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              width: "100%",
              maxWidth: 440,
              padding: "28px 32px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Add New User</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{ background: "none", border: "none", color: C.textDim, fontSize: 20, cursor: "pointer" }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: C.textDim }}>
                  Full Name *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Shane Goldberg"
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: `1px solid ${C.border}`,
                    background: C.bg,
                    color: C.text,
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: C.textDim }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hello@saabai.ai"
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: `1px solid ${C.border}`,
                    background: C.bg,
                    color: C.text,
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: C.textDim }}>
                  Password *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a password"
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: `1px solid ${C.border}`,
                    background: C.bg,
                    color: C.text,
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: C.textDim }}>
                  Role
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["user", "admin"].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: `1px solid ${role === r ? C.gold : C.border}`,
                        background: role === r ? C.goldBg : C.bg,
                        color: role === r ? C.gold : C.textDim,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                        textTransform: "capitalize",
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  marginTop: 8,
                  width: "100%",
                  padding: "12px",
                  borderRadius: 8,
                  border: "none",
                  background: saving ? C.border : C.gold,
                  color: saving ? C.textDim : "#000",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
