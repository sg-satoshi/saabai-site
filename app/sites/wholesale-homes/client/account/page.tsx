"use client";

import { useState, useEffect } from "react";
import { ClientPortalShell } from "../../_components/ClientPortalShell";
import { User, Mail, Phone, Key, Shield, ArrowRight } from "lucide-react";
import { AUTH_KEY, loadJSON, type ClientAuth } from "../../_lib/portal";

export default function AccountPage() {
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    setUserEmail(loadJSON<ClientAuth>(AUTH_KEY, {}).email || "");
  }, []);

  return (
    <ClientPortalShell>
      <div style={{ maxWidth: 700 }}>
        <div style={{ marginBottom: 32 }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">
            Account
          </p>
          <h1 className="mt-2 text-[clamp(1.4rem,3vw,2rem)] font-semibold leading-tight tracking-tight text-[#1A2B3C]">
            Your Profile
          </h1>
          <p className="mt-1.5 text-sm text-[#5C6670]">
            Manage your account details and preferences.
          </p>
        </div>

        <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-6 md:p-8">
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-8">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white"
              style={{ background: "#0891b2" }}
            >
              {(userEmail?.[0] || "C").toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1A2B3C]">Client Account</p>
              <p className="text-xs text-[#5C6670]">{userEmail || "No email on file"}</p>
            </div>
          </div>

          {/* Account details */}
          <div className="space-y-5">
            <Section title="Account Details">
              <Field icon={Mail} label="Email" value={userEmail || "Loading..."} />
              <Field icon={Phone} label="Phone" value="Contact Nick to update" />
              <Field icon={Key} label="Password" value="••••••••" />
            </Section>

            <Section title="Account Status">
              <div className="flex items-center gap-3 rounded-xl bg-[#f0fdf4] p-3 border border-green-100">
                <Shield className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-700">Active</p>
                  <p className="text-xs text-green-600/70">
                    Your portal access is active. Contact Nick if you need to update your details.
                </p>
                </div>
              </div>
            </Section>

            <Section title="Need Help?">
              <a
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-[#0891b2] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0369a1]"
              >
                Contact Nick <ArrowRight className="h-4 w-4" />
              </a>
            </Section>
          </div>
        </div>
      </div>
    </ClientPortalShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[#5C6670]">{title}</p>
      {children}
    </div>
  );
}

function Field({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#f8f6f2] px-4 py-3">
      <Icon className="h-4 w-4 text-[#0891b2]" />
      <div className="flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670]">{label}</p>
        <p className="text-sm font-medium text-[#1A2B3C]">{value}</p>
      </div>
    </div>
  );
}
