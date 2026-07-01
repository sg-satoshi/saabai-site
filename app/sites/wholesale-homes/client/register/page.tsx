"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "../../_components/Header";
import { Footer } from "../../_components/Footer";
import { User, Mail, Phone, MapPin, Briefcase, ArrowRight, CheckCircle } from "lucide-react";

export default function ClientRegister() {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    try {
      await fetch("/api/site-factory/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteSlug: "wholesale-homes",
          ...data,
          buyer_type: data.investorType || "",
          message: `Registration request from ${data.name} (${data.email}). Investor type: ${data.investorType}. Postcode: ${data.postcode}. Phone: ${data.phone}.`,
        }),
      });
    } catch {}

    setSubmitted(true);
    setSending(false);
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center bg-[#f8f6f2] px-6">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-100 text-green-600">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h1 className="mt-6 text-xl font-bold md:text-2xl">Your free trial is on its way</h1>
            <p className="mt-3 text-sm leading-relaxed text-[#5C6670]">
              Thanks for your interest. We will review your application and send your login details within 24 hours. Once approved, you will get <strong>7 days free access</strong> to browse our full inventory and see every package's exclusive Members Price.
            </p>
            <Link
              href="/client-login"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0891b2] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0369a1]"
            >
              Back to Login
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center bg-[#f8f6f2] px-6 py-16">
        <div className="w-full max-w-lg">
          <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold md:text-2xl">Start Your Free Trial</h1>
              <p className="mt-2 text-sm text-[#5C6670]">
                Get <strong className="text-[#0891b2]">7 days free access</strong> to browse our full inventory of pre-market house and land packages. See the Reg. Retail Price vs your exclusive Members Price on every package.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="rounded-full bg-green-100 px-3 py-1 text-[10px] font-bold text-green-700">7 Days Free</span>
                <span className="rounded-full bg-[#0891b2]/10 px-3 py-1 text-[10px] font-medium text-[#0891b2]">No obligation</span>
                <span className="rounded-full bg-[#d4a84b]/10 px-3 py-1 text-[10px] font-medium text-[#d4a84b]">Cancel anytime</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="text-xs font-semibold text-[#5C6670]">Full Name</label>
                <div className="relative mt-1">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C6670]" />
                  <input id="name" name="name" required
                    className="w-full rounded-xl border border-[rgba(0,0,0,0.1)] bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2]/20"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="text-xs font-semibold text-[#5C6670]">Email</label>
                <div className="relative mt-1">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C6670]" />
                  <input id="email" name="email" type="email" required
                    className="w-full rounded-xl border border-[rgba(0,0,0,0.1)] bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2]/20"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="text-xs font-semibold text-[#5C6670]">Phone</label>
                <div className="relative mt-1">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C6670]" />
                  <input id="phone" name="phone" type="tel" required
                    className="w-full rounded-xl border border-[rgba(0,0,0,0.1)] bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2]/20"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="postcode" className="text-xs font-semibold text-[#5C6670]">Postcode</label>
                <div className="relative mt-1">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C6670]" />
                  <input id="postcode" name="postcode" required
                    className="w-full rounded-xl border border-[rgba(0,0,0,0.1)] bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2]/20"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="investorType" className="text-xs font-semibold text-[#5C6670]">Investor Type</label>
                <div className="relative mt-1">
                  <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C6670]" />
                  <select id="investorType" name="investorType" required
                    className="w-full appearance-none rounded-xl border border-[rgba(0,0,0,0.1)] bg-white py-3 pl-10 pr-8 text-sm outline-none transition-colors focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2]/20"
                  >
                    <option value="">Select one</option>
                    <option value="First home buyer">First home buyer</option>
                    <option value="Investor">Investor</option>
                    <option value="Downsizer">Downsizer</option>
                    <option value="Home buyer">Home buyer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={sending}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0891b2] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0369a1] disabled:opacity-60"
              >
                {sending ? "Submitting..." : "Submit Application"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-[#5C6670]">
              Already have access?{" "}
              <Link href="/client-login" className="font-semibold text-[#0891b2] hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
