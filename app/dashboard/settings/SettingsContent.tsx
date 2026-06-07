"use client";

import { useState } from "react";

// ── Admin-matched card style ──────────────────────────────────────────────────

const C = {
  card:   "#ffffff",
  border: "rgba(0,0,0,0.08)",
  text:   "#111827",
  muted:  "#9ca3af",
  gold:   "#C9A84C",
  goldBg: "rgba(201,168,76,0.10)",
  goldBdr: "rgba(201,168,76,0.22)",
  green:  "#16a34a",
  greenBg: "rgba(22,163,74,0.08)",
  red:    "#dc2626",
  redBg:  "rgba(220,38,38,0.08)",
};

const inputCss: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "10px 12px", fontSize: 13,
  color: "#111827",
  border: `1px solid ${C.border}`, borderRadius: 10,
  background: "rgba(0,0,0,0.02)",
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 0.12s",
};

const labelCss: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600,
  color: C.muted, marginBottom: 4, letterSpacing: 0.3,
};

const selectCss: React.CSSProperties = {
  ...inputCss,
  appearance: "none",
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239ca3af' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  paddingRight: 32,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px 20px", marginBottom: 16 }}>
      <h2 style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelCss}>{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      type={type || "text"}
      placeholder={placeholder}
      style={inputCss}
      onFocus={e => { e.currentTarget.style.borderColor = C.goldBdr; }}
      onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
    />
  );
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { label: string; value: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={selectCss}
      onFocus={e => { e.currentTarget.style.borderColor = C.goldBdr; }}
      onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Checkbox({ checked, onChange, label }: {
  checked: boolean; onChange: (v: boolean) => void; label: string;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: C.text }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: C.gold, cursor: "pointer" }}
      />
      {label}
    </label>
  );
}

function Toast({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <div style={{
      marginBottom: 16, padding: "10px 14px", borderRadius: 10,
      background: msg.ok ? C.greenBg : C.redBg,
      border: `1px solid ${msg.ok ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}`,
      fontSize: 13, color: msg.ok ? C.green : C.red,
    }}>
      {msg.text}
    </div>
  );
}

// ── Gender options ───────────────────────────────────────────────────────────

const GENDER_OPTIONS = [
  { label: "Select...", value: "" },
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
  { label: "Prefer not to say", value: "prefer-not-to-say" },
];

// ── Main component ───────────────────────────────────────────────────────────

interface FlatProfile {
  name: string;
  phone: string;
  mobile: string;
  street: string;
  suburb: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  gender: string;
  dateOfBirth: string;
  businessName: string;
  businessType: string;
  interests: string;
  favouriteBrands: string;
  favouriteProducts: string;
  referralSource: string;
  marketingConsent: boolean;
  notes: string;
}

function flattenProfile(profile: Record<string, unknown> | null | undefined): FlatProfile {
  const p = profile || {};
  const addr = (p as any).address || {};
  return {
    name: "",
    phone: (p as any).phone || "",
    mobile: (p as any).mobile || "",
    street: addr.street || "",
    suburb: addr.suburb || "",
    city: addr.city || "",
    state: addr.state || "",
    postcode: addr.postcode || "",
    country: addr.country || "Australia",
    gender: (p as any).gender || "",
    dateOfBirth: (p as any).dateOfBirth || "",
    businessName: (p as any).businessName || "",
    businessType: (p as any).businessType || "",
    interests: (p as any).interests || "",
    favouriteBrands: (p as any).favouriteBrands || "",
    favouriteProducts: (p as any).favouriteProducts || "",
    referralSource: (p as any).referralSource || "",
    marketingConsent: (p as any).marketingConsent ?? false,
    notes: (p as any).notes || "",
  };
}

interface Props {
  userName: string;
  userEmail: string;
  isAdmin: boolean;
  userProfile: Record<string, unknown> | null;
}

export default function SettingsContent({ userName: initialName, userEmail, isAdmin, userProfile: initialProfile }: Props) {
  const [userName, setUserName] = useState(initialName);

  // Flatten profile for form editing
  const flat = flattenProfile(initialProfile);
  const [f, setF] = useState<FlatProfile>(flat);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function update<K extends keyof FlatProfile>(k: K, v: FlatProfile[K]) {
    setF(prev => ({ ...prev, [k]: v }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);

    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.name || userName,
          phone: f.phone,
          mobile: f.mobile,
          street: f.street,
          suburb: f.suburb,
          city: f.city,
          state: f.state,
          postcode: f.postcode,
          country: f.country,
          gender: f.gender,
          dateOfBirth: f.dateOfBirth,
          businessName: f.businessName,
          businessType: f.businessType,
          interests: f.interests,
          favouriteBrands: f.favouriteBrands,
          favouriteProducts: f.favouriteProducts,
          referralSource: f.referralSource,
          marketingConsent: f.marketingConsent,
          notes: f.notes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.name) setUserName(data.name);
        setMsg({ ok: true, text: "Profile saved successfully. Your data helps us serve you better." });
      } else {
        const data = await res.json();
        setMsg({ ok: false, text: data.error || "Failed to save profile." });
      }
    } catch {
      setMsg({ ok: false, text: "Something went wrong. Try again." });
    }

    setSubmitting(false);
  }

  // ── Change password ───────────────────────────────────────────────────────

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
    <div style={{ padding: "32px 36px", maxWidth: 800 }}>
      <h1 style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: -0.3 }}>
        Account Settings
      </h1>
      <p style={{ margin: "0 0 32px", fontSize: 13, color: C.muted }}>
        Manage your account details, preferences, and personal information. The more you share, the better we can serve you.
      </p>

      <Toast msg={msg} />

      <form onSubmit={handleSave}>
        {/* ── Basic Info ─────────────────────────────────── */}
        <Section title="Basic Information">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="Full Name">
              <Input value={f.name || userName} onChange={v => update("name", v)} placeholder="Your full name" />
            </Field>
            <Field label="Email">
              <div style={{ padding: "10px 12px", fontSize: 13, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, background: "rgba(0,0,0,0.02)" }}>
                {userEmail}
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 10, color: C.muted }}>Email cannot be changed.</p>
            </Field>
            <Field label="Phone">
              <Input value={f.phone} onChange={v => update("phone", v)} placeholder="0412 345 678" />
            </Field>
            <Field label="Mobile">
              <Input value={f.mobile} onChange={v => update("mobile", v)} placeholder="0412 345 678" />
            </Field>
            <Field label="Date of Birth">
              <Input value={f.dateOfBirth} onChange={v => update("dateOfBirth", v)} type="date" />
            </Field>
            <Field label="Gender">
              <Select value={f.gender} onChange={v => update("gender", v)} options={GENDER_OPTIONS} />
            </Field>
          </div>
        </Section>

        {/* ── Address ────────────────────────────────────── */}
        <Section title="Address">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="Street Address">
              <Input value={f.street} onChange={v => update("street", v)} placeholder="123 Main Street" />
            </Field>
            <Field label="Suburb">
              <Input value={f.suburb} onChange={v => update("suburb", v)} placeholder="Fortitude Valley" />
            </Field>
            <Field label="City">
              <Input value={f.city} onChange={v => update("city", v)} placeholder="Brisbane" />
            </Field>
            <Field label="State">
              <Input value={f.state} onChange={v => update("state", v)} placeholder="QLD" />
            </Field>
            <Field label="Postcode">
              <Input value={f.postcode} onChange={v => update("postcode", v)} placeholder="4000" />
            </Field>
            <Field label="Country">
              <Input value={f.country} onChange={v => update("country", v)} placeholder="Australia" />
            </Field>
          </div>
        </Section>

        {/* ── Business & Interests ───────────────────────── */}
        <Section title="Business & Interests">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="Business Name">
              <Input value={f.businessName} onChange={v => update("businessName", v)} placeholder="Your business" />
            </Field>
            <Field label="Business Type">
              <Input value={f.businessType} onChange={v => update("businessType", v)} placeholder="e.g. Plumbing, Electrical" />
            </Field>
            <Field label="Interests / Hobbies">
              <Input value={f.interests} onChange={v => update("interests", v)} placeholder="Comma-separated" />
            </Field>
            <Field label="Favourite Brands">
              <Input value={f.favouriteBrands} onChange={v => update("favouriteBrands", v)} placeholder="Brands you love" />
            </Field>
            <Field label="Favourite Products / Services">
              <Input value={f.favouriteProducts} onChange={v => update("favouriteProducts", v)} placeholder="Products you use" />
            </Field>
            <Field label="How did you find us?">
              <Input value={f.referralSource} onChange={v => update("referralSource", v)} placeholder="Google, friend, social media..." />
            </Field>
          </div>
        </Section>

        {/* ── Marketing & Notes ──────────────────────────── */}
        <Section title="Preferences">
          <Field label="">
            <Checkbox
              checked={f.marketingConsent}
              onChange={v => update("marketingConsent", v)}
              label="I agree to receive marketing communications, special offers, and product updates."
            />
          </Field>
          <Field label="Notes (for our team)">
            <textarea
              value={f.notes}
              onChange={e => update("notes", e.target.value)}
              placeholder="Anything else you would like us to know..."
              style={{ ...inputCss, minHeight: 80, resize: "vertical", fontFamily: "inherit" }}
              onFocus={e => { e.currentTarget.style.borderColor = C.goldBdr; }}
              onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
            />
          </Field>
        </Section>

        {isAdmin && (
          <Section title="Account Role">
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: C.gold, background: C.goldBg, border: `1px solid ${C.goldBdr}`, padding: "2px 8px", borderRadius: 20 }}>Admin</span>
          </Section>
        )}

        {/* ── Save button ────────────────────────────────── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "9px 22px", borderRadius: 10,
              background: C.goldBg, border: `1px solid ${C.goldBdr}`,
              color: C.gold, fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>

      {/* ── Password section ─────────────────────────────── */}
      <Section title="Password">
        {passMsg && (
          <div style={{
            marginBottom: 16, padding: "10px 14px", borderRadius: 10,
            background: passMsg.ok ? C.greenBg : C.redBg,
            border: `1px solid ${passMsg.ok ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}`,
            fontSize: 13, color: passMsg.ok ? C.green : C.red,
          }}>
            {passMsg.text}
          </div>
        )}

        {changePasswordView ? (
          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 400 }}>
            <Field label="Current password">
              <input name="currentPassword" type="password" required style={inputCss} />
            </Field>
            <Field label="New password">
              <input name="newPassword" type="password" required minLength={8} style={inputCss} />
            </Field>
            <Field label="Confirm new password">
              <input name="confirmPassword" type="password" required minLength={8} style={inputCss} />
            </Field>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="submit"
                disabled={submittingPass}
                style={{
                  padding: "9px 18px", borderRadius: 10,
                  background: C.goldBg, border: `1px solid ${C.goldBdr}`,
                  color: C.gold, fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
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
            }}
          >
            Change password
          </button>
        )}
      </Section>

      {/* ── Support ──────────────────────────────────────── */}
      <Section title="Support">
        <p style={{ margin: "0 0 12px", fontSize: 13, color: C.muted }}>
          Need help or have a question? Contact us and we will get back to you.
        </p>
        <a
          href="mailto:hello@saabai.ai"
          style={{
            display: "inline-block", padding: "9px 18px", borderRadius: 10,
            border: `1px solid ${C.border}`, color: C.text, fontSize: 12,
            fontWeight: 500, textDecoration: "none",
          }}
        >
          hello@saabai.ai
        </a>
      </Section>
    </div>
  );
}
