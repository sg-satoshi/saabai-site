"use client";

import { useState } from "react";

// ── Admin-matched card style ──────────────────────────────────────────────────

const C = {
  card:   "#ffffff",
  border: "rgba(0,0,0,0.08)",
  text:   "#111827",
  muted:  "#9ca3af",
  teal:   "#0891b2",
  gold:   "#C9A84C",
  goldBg: "rgba(201,168,76,0.10)",
  goldBdr: "rgba(201,168,76,0.22)",
};

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "10px 12px", fontSize: 13,
  border: `1px solid ${C.border}`, borderRadius: 10,
  background: "rgba(0,0,0,0.02)",
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 0.12s",
};

interface SettingsContentProps {
  userName: string;
  userEmail: string;
  isAdmin: boolean;
}

export default function SettingsContent({
  userName: initialName,
  userEmail,
  isAdmin,
}: SettingsContentProps) {
  const [userName, setUserName] = useState(initialName);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState(initialName);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [submittingProfile, setSubmittingProfile] = useState(false);

  const [changePasswordView, setChangePasswordView] = useState(false);
  const [passMsg, setPassMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [submittingPass, setSubmittingPass] = useState(false);

  // ── Profile edit ──────────────────────────────────────────────────────────

  function startEditing() {
    setEditName(userName);
    setEditingProfile(true);
    setProfileMsg(null);
  }

  function cancelEditing() {
    setEditingProfile(false);
    setEditName(userName);
    setProfileMsg(null);
  }

  async function handleSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmittingProfile(true);
    setProfileMsg(null);

    if (!editName.trim()) {
      setProfileMsg({ ok: false, text: "Name cannot be empty." });
      setSubmittingProfile(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setUserName(data.name);
        setProfileMsg({ ok: true, text: "Profile updated successfully." });
        setEditingProfile(false);
      } else {
        const data = await res.json();
        setProfileMsg({ ok: false, text: data.error || "Failed to update profile." });
      }
    } catch {
      setProfileMsg({ ok: false, text: "Something went wrong. Try again." });
    }

    setSubmittingProfile(false);
  }

  // ── Password change ───────────────────────────────────────────────────────

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmittingPass(true);
    setPassMsg(null);

    const form = e.currentTarget;
    const currentPassword = (form.elements.namedItem("currentPassword") as HTMLInputElement).value;
    const newPassword = (form.elements.namedItem("newPassword") as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;

    if (newPassword !== confirmPassword) {
      setPassMsg({ ok: false, text: "New passwords do not match." });
      setSubmittingPass(false);
      return;
    }

    if (newPassword.length < 8) {
      setPassMsg({ ok: false, text: "New password must be at least 8 characters." });
      setSubmittingPass(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        setPassMsg({ ok: true, text: "Password changed successfully." });
        setChangePasswordView(false);
      } else {
        const data = await res.json();
        setPassMsg({ ok: false, text: data.error || "Failed to change password." });
      }
    } catch {
      setPassMsg({ ok: false, text: "Something went wrong. Try again." });
    }

    setSubmittingPass(false);
  }

  return (
    <div style={{ padding: "32px 36px", maxWidth: 700 }}>
      <h1 style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: -0.3 }}>
        Account Settings
      </h1>
      <p style={{ margin: "0 0 32px", fontSize: 13, color: C.muted }}>
        Manage your account details and preferences.
      </p>

      {/* Profile section */}
      <div style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: "22px 24px 20px",
        marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>
            Profile
          </h2>
          {!editingProfile && (
            <button
              onClick={startEditing}
              style={{
                padding: "5px 12px", borderRadius: 8,
                border: `1px solid ${C.border}`, background: "transparent",
                color: C.muted, fontSize: 11, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.12s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.goldBdr; (e.currentTarget as HTMLElement).style.color = C.gold; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.color = C.muted; }}
            >
              Edit
            </button>
          )}
        </div>

        {profileMsg && (
          <div style={{
            marginBottom: 16, padding: "10px 14px", borderRadius: 10,
            background: profileMsg.ok ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
            border: profileMsg.ok ? "1px solid rgba(22,163,74,0.2)" : "1px solid rgba(220,38,38,0.2)",
            fontSize: 13,
            color: profileMsg.ok ? "#16a34a" : "#dc2626",
          }}>
            {profileMsg.text}
          </div>
        )}

        {editingProfile ? (
          <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 4 }}>
                Name
              </label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                type="text"
                required
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = C.goldBdr; }}
                onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 4 }}>
                Email
              </label>
              <div style={{ padding: "10px 12px", fontSize: 13, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, background: "rgba(0,0,0,0.02)" }}>
                {userEmail}
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 10, color: C.muted }}>
                Email cannot be changed. Contact support if needed.
              </p>
            </div>
            {isAdmin && (
              <div>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                  color: C.gold, background: C.goldBg,
                  border: `1px solid ${C.goldBdr}`,
                  padding: "2px 8px", borderRadius: 20,
                }}>
                  Admin
                </span>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                type="submit"
                disabled={submittingProfile}
                style={{
                  padding: "9px 18px", borderRadius: 10,
                  background: C.goldBg, border: `1px solid ${C.goldBdr}`,
                  color: C.gold, fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.12s",
                  opacity: submittingProfile ? 0.6 : 1,
                }}
              >
                {submittingProfile ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                style={{
                  padding: "9px 18px", borderRadius: 10,
                  border: `1px solid ${C.border}`, background: "transparent",
                  color: C.muted, fontSize: 12, fontWeight: 500,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 }}>Name</div>
              <div style={{ fontSize: 14, color: C.text }}>{userName}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 }}>Email</div>
              <div style={{ fontSize: 14, color: C.text }}>{userEmail}</div>
            </div>
            {isAdmin && (
              <div>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                  color: C.gold, background: C.goldBg,
                  border: `1px solid ${C.goldBdr}`,
                  padding: "2px 8px", borderRadius: 20,
                }}>
                  Admin
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Password section */}
      <div style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: "22px 24px 20px",
        marginBottom: 16,
      }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>
          Password
        </h2>

        {passMsg && (
          <div style={{
            marginBottom: 16, padding: "10px 14px", borderRadius: 10,
            background: passMsg.ok ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
            border: passMsg.ok ? "1px solid rgba(22,163,74,0.2)" : "1px solid rgba(220,38,38,0.2)",
            fontSize: 13,
            color: passMsg.ok ? "#16a34a" : "#dc2626",
          }}>
            {passMsg.text}
          </div>
        )}

        {changePasswordView ? (
          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 4 }}>
                Current password
              </label>
              <input
                name="currentPassword"
                type="password"
                required
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = C.goldBdr; }}
                onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 4 }}>
                New password
              </label>
              <input
                name="newPassword"
                type="password"
                required
                minLength={8}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = C.goldBdr; }}
                onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 4 }}>
                Confirm new password
              </label>
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = C.goldBdr; }}
                onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="submit"
                disabled={submittingPass}
                style={{
                  padding: "9px 18px", borderRadius: 10,
                  background: C.goldBg, border: `1px solid ${C.goldBdr}`,
                  color: C.gold, fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.12s",
                  opacity: submittingPass ? 0.6 : 1,
                }}
              >
                {submittingPass ? "Saving..." : "Change password"}
              </button>
              <button
                type="button"
                onClick={() => { setChangePasswordView(false); setPassMsg(null); }}
                style={{
                  padding: "9px 18px", borderRadius: 10,
                  border: `1px solid ${C.border}`, background: "transparent",
                  color: C.muted, fontSize: 12, fontWeight: 500,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setChangePasswordView(true)}
            style={{
              padding: "9px 18px", borderRadius: 10,
              border: `1px solid ${C.border}`, background: "transparent",
              color: C.text, fontSize: 12, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.12s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.goldBdr; (e.currentTarget as HTMLElement).style.background = C.goldBg; (e.currentTarget as HTMLElement).style.color = C.gold; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = C.text; }}
          >
            Change password
          </button>
        )}
      </div>

      {/* Support section */}
      <div style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: "22px 24px 20px",
      }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>
          Support
        </h2>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: C.muted }}>
          Need help or have a question? Contact us and we will get back to you.
        </p>
        <a
          href="mailto:hello@saabai.ai"
          style={{
            display: "inline-block",
            padding: "9px 18px", borderRadius: 10,
            border: `1px solid ${C.border}`,
            color: C.text, fontSize: 12, fontWeight: 500,
            textDecoration: "none",
            transition: "all 0.12s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.goldBdr; (e.currentTarget as HTMLElement).style.background = C.goldBg; (e.currentTarget as HTMLElement).style.color = C.gold; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = C.text; }}
        >
          hello@saabai.ai
        </a>
      </div>
    </div>
  );
}
