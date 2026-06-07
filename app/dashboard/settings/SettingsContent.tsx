"use client";

import { useState } from "react";

interface SettingsContentProps {
  userName: string;
  userEmail: string;
  isAdmin: boolean;
}

export default function SettingsContent({
  userName,
  userEmail,
  isAdmin,
}: SettingsContentProps) {
  const [changePasswordView, setChangePasswordView] = useState(false);
  const [passMsg, setPassMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [submittingPass, setSubmittingPass] = useState(false);

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
    <div className="p-6 md:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-white/90 mb-1">Account Settings</h1>
      <p className="text-white/40 text-sm mb-8">Manage your account details and preferences.</p>

      {/* Profile section */}
      <section className="bg-[#0e1117] border border-white/[0.06] rounded-2xl p-6 mb-6">
        <h2 className="text-white/70 font-semibold text-sm mb-4">Profile</h2>
        <div className="space-y-3">
          <div>
            <div className="text-xs text-white/30 uppercase tracking-wider mb-1">Name</div>
            <div className="text-white/80">{userName}</div>
          </div>
          <div>
            <div className="text-xs text-white/30 uppercase tracking-wider mb-1">Email</div>
            <div className="text-white/80">{userEmail}</div>
          </div>
          {isAdmin && (
            <div>
              <div className="text-xs text-white/30 uppercase tracking-wider mb-1">Role</div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#62C5D1]/10 text-[#62C5D1] border border-[#62C5D1]/30">
                Admin
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Password section */}
      <section className="bg-[#0e1117] border border-white/[0.06] rounded-2xl p-6 mb-6">
        <h2 className="text-white/70 font-semibold text-sm mb-4">Password</h2>

        {passMsg && (
          <div
            className={`mb-4 px-4 py-3 rounded-xl text-sm ${
              passMsg.ok
                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}
          >
            {passMsg.text}
          </div>
        )}

        {changePasswordView ? (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs text-white/40 mb-1">Current password</label>
              <input
                name="currentPassword"
                type="password"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm
                  focus:outline-none focus:border-[#62C5D1]/40 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">New password</label>
              <input
                name="newPassword"
                type="password"
                required
                minLength={8}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm
                  focus:outline-none focus:border-[#62C5D1]/40 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Confirm new password</label>
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm
                  focus:outline-none focus:border-[#62C5D1]/40 transition-colors"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submittingPass}
                className="px-5 py-2.5 rounded-xl bg-[#62C5D1]/15 text-[#62C5D1] text-sm font-medium
                  border border-[#62C5D1]/30 hover:bg-[#62C5D1]/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {submittingPass ? "Saving..." : "Change password"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setChangePasswordView(false);
                  setPassMsg(null);
                }}
                className="px-5 py-2.5 rounded-xl text-white/40 text-sm hover:text-white/60 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setChangePasswordView(true)}
            className="px-5 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-all cursor-pointer"
          >
            Change password
          </button>
        )}
      </section>

      {/* Support section */}
      <section className="bg-[#0e1117] border border-white/[0.06] rounded-2xl p-6">
        <h2 className="text-white/70 font-semibold text-sm mb-2">Support</h2>
        <p className="text-white/40 text-sm mb-3">
          Need help or have a question? Contact us and we will get back to you.
        </p>
        <a
          href="mailto:hello@saabai.ai"
          className="inline-block px-5 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-all no-underline"
        >
          hello@saabai.ai
        </a>
      </section>
    </div>
  );
}
