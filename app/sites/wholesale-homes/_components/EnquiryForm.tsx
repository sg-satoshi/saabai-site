"use client";

import { useState } from "react";

type Props = {
  propertyName: string;
  propertyId: string;
  propertyPrice: string;
};

export function EnquiryForm({ propertyName, propertyId, propertyPrice }: Props) {
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
          message: `Enquiry about: ${propertyName} (${propertyPrice})\n\n${data.message || ""}`,
        }),
      });
    } catch {}

    setSubmitted(true);
    setSending(false);
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center md:p-8">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-green-100 text-green-600">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold">Thanks for your interest</h3>
        <p className="mt-2 text-sm text-[#5C6670]">
          Nick will reach out within 24 hours to discuss {propertyName}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="enq-name" className="text-xs font-semibold text-[#5C6670]">Name</label>
          <input
            id="enq-name"
            name="name"
            required
            className="mt-1 w-full rounded-xl border border-[rgba(0,0,0,0.1)] bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2]/20"
          />
        </div>
        <div>
          <label htmlFor="enq-email" className="text-xs font-semibold text-[#5C6670]">Email</label>
          <input
            id="enq-email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-xl border border-[rgba(0,0,0,0.1)] bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2]/20"
          />
        </div>
      </div>
      <div>
        <label htmlFor="enq-phone" className="text-xs font-semibold text-[#5C6670]">Phone</label>
        <input
          id="enq-phone"
          name="phone"
          type="tel"
          className="mt-1 w-full rounded-xl border border-[rgba(0,0,0,0.1)] bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2]/20"
        />
      </div>
      <div>
        <label htmlFor="enq-message" className="text-xs font-semibold text-[#5C6670]">Message (optional)</label>
        <textarea
          id="enq-message"
          name="message"
          rows={3}
          className="mt-1 w-full rounded-xl border border-[rgba(0,0,0,0.1)] bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2]/20 resize-none"
          placeholder={`I'm interested in ${propertyName}...`}
        />
      </div>
      <button
        type="submit"
        disabled={sending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0891b2] px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#0369a1] disabled:opacity-60 sm:w-auto"
      >
        {sending ? "Sending..." : "Send Enquiry"}
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </button>
    </form>
  );
}
