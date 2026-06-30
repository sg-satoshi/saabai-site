"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "../../_components/Header";
import { Footer } from "../../_components/Footer";
import { Home, FileText, Calendar, Phone, ArrowRight, Building2, CheckCircle, Clock } from "lucide-react";

const AUTH_KEY = "wholesale_client_auth";

const dummyPackage = {
  name: "The Northbridge 42",
  location: "Tarneit, VIC",
  stage: "Construction",
  estimatedCompletion: "Q1 2027",
  price: "$621,000",
  depositPaid: "$62,100",
  beds: 4,
  baths: 2,
  land: "312m²",
  home: "201m²",
};

const milestones = [
  { label: "Contract Signed", date: "15 Mar 2026", done: true },
  { label: "Deposit Paid", date: "22 Mar 2026", done: true },
  { label: "Building Permit", date: "12 May 2026", done: true },
  { label: "Slab Down", date: "Est. Aug 2026", done: false },
  { label: "Framing Complete", date: "Est. Oct 2026", done: false },
  { label: "Handover", date: "Est. Q1 2027", done: false },
];

export default function ClientDashboard() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) {
      router.replace("/client-login");
    } else {
      setAuthed(true);
    }
  }, [router]);

  if (!authed) return null;

  function handleLogout() {
    localStorage.removeItem(AUTH_KEY);
    router.push("/client-login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-[#f8f6f2]">
        {/* Dashboard header */}
        <section className="border-b border-[rgba(0,0,0,0.08)] bg-white">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
            <div>
              <h1 className="text-lg font-semibold tracking-tight md:text-xl">Client Dashboard</h1>
              <p className="mt-0.5 text-sm text-[#5C6670]">Welcome back. Here&apos;s your purchase overview.</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-full border border-[rgba(0,0,0,0.12)] px-5 py-2 text-xs font-medium text-[#5C6670] transition-colors hover:bg-[#f5f5f7] md:text-sm"
            >
              Sign Out
            </button>
          </div>
        </section>

        <section className="py-8 md:py-12">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Package snapshot */}
              <div className="md:col-span-2">
                <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 md:p-8">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-[#0891b2]" />
                    <h2 className="text-base font-semibold md:text-lg">Your Package</h2>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-[#5C6670]">Property</p>
                      <p className="mt-0.5 text-sm font-semibold md:text-base">{dummyPackage.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#5C6670]">Location</p>
                      <p className="mt-0.5 text-sm font-semibold md:text-base">{dummyPackage.location}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#5C6670]">Total Price</p>
                      <p className="mt-0.5 text-lg font-bold text-[#0891b2]">{dummyPackage.price}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#5C6670]">Deposit Paid</p>
                      <p className="mt-0.5 text-sm font-semibold text-green-600 md:text-base">{dummyPackage.depositPaid}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#5C6670]">Stage</p>
                      <p className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-[#0891b2]/10 px-3 py-1 text-xs font-medium text-[#0891b2]">
                        <Clock className="h-3 w-3" /> {dummyPackage.stage}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#5C6670]">Est. Completion</p>
                      <p className="mt-0.5 text-sm font-semibold md:text-base">{dummyPackage.estimatedCompletion}</p>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-3 border-t border-[rgba(0,0,0,0.06)] pt-5">
                    {[
                      { label: "Bedrooms", value: dummyPackage.beds },
                      { label: "Bathrooms", value: dummyPackage.baths },
                      { label: "Land", value: dummyPackage.land },
                    ].map((s) => (
                      <div key={s.label}>
                        <p className="text-xs text-[#5C6670]">{s.label}</p>
                        <p className="mt-0.5 text-sm font-semibold md:text-base">{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="space-y-6">
                <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 md:p-8">
                  <h2 className="text-base font-semibold md:text-lg">Quick Actions</h2>
                  <div className="mt-4 space-y-3">
                    {[
                      { icon: Phone, label: "Call Your Advisor", href: "tel:1300000000" },
                      { icon: FileText, label: "View Documents", href: "#" },
                      { icon: Calendar, label: "Schedule Update", href: "/contact" },
                    ].map((a) => (
                      <a
                        key={a.label}
                        href={a.href}
                        className="flex items-center justify-between rounded-xl border border-[rgba(0,0,0,0.08)] px-4 py-3 text-sm font-medium text-[#5C6670] transition-colors hover:bg-[#f5f5f7]"
                      >
                        <span className="flex items-center gap-3">
                          <a.icon className="h-4 w-4 text-[#0891b2]" />
                          {a.label}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 md:p-8">
                  <h2 className="text-base font-semibold md:text-lg">Need Help?</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#5C6670]">
                    Contact Nick Foale directly for any questions about your build.
                  </p>
                  <a
                    href="tel:1300000000"
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0891b2] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0369a1]"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    1300 000 000
                  </a>
                </div>
              </div>
            </div>

            {/* Milestones */}
            <div className="mt-6">
              <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 md:p-8">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-[#0891b2]" />
                  <h2 className="text-base font-semibold md:text-lg">Build Milestones</h2>
                </div>

                <div className="mt-6 space-y-0">
                  {milestones.map((m, i) => (
                    <div key={m.label} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                            m.done
                              ? "border-green-500 bg-green-50"
                              : "border-[rgba(0,0,0,0.15)] bg-white"
                          }`}
                        >
                          {m.done ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <div className="h-2 w-2 rounded-full bg-[rgba(0,0,0,0.15)]" />
                          )}
                        </div>
                        {i < milestones.length - 1 && (
                          <div
                            className={`mt-1 w-px flex-1 ${
                              m.done ? "bg-green-300" : "bg-[rgba(0,0,0,0.08)]"
                            }`}
                          />
                        )}
                      </div>
                      <div className={`pb-8 ${i === milestones.length - 1 ? "pb-0" : ""}`}>
                        <p
                          className={`text-sm font-medium ${
                            m.done ? "text-[#1A2B3C]" : "text-[#5C6670]"
                          }`}
                        >
                          {m.label}
                        </p>
                        <p className="mt-0.5 text-xs text-[#9CA3AF]">{m.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
