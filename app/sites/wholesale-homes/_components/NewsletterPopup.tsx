"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

const POPUP_SEEN_KEY = "wh_newsletter_seen";

export function NewsletterPopup() {
  const [show, setShow] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const seen = localStorage.getItem(POPUP_SEEN_KEY);
    if (seen) return;

    const timer = setTimeout(() => setShow(true), 12000);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    localStorage.setItem(POPUP_SEEN_KEY, "1");
    setShow(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await fetch("/api/site-factory/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteSlug: "wholesale-homes",
          name,
          email,
          message: "Newsletter signup: Victoria's dual-income packages",
        }),
      });
    } catch {}
    setSubmitted(true);
    setSending(false);
  }

  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={dismiss} />

      {/* Popup */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl md:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={dismiss}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-[#5C6670] transition-colors hover:bg-[#f5f5f7]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {submitted ? (
            <div className="py-8 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-green-100 text-green-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-bold">You're on the list</h3>
              <p className="mt-2 text-sm text-[#5C6670]">
                We'll email you when new high-yield packages hit the portal.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-[#1A2B3C] p-5 text-center md:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d4a84b] md:text-xs">
                  Private Access
                </p>
                <h3 className="mt-2 text-lg font-bold leading-tight text-white md:text-xl">
                  Get First Access to Victoria's Best Dual-Income Packages
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-white/70 md:text-sm">
                  New listings hit our portal before they hit the market. Drop your details and we'll notify you the moment a high-yield dual-occupancy package becomes available.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="First name"
                  required
                  className="w-full rounded-xl border border-[rgba(0,0,0,0.1)] px-4 py-3 text-sm outline-none transition-colors focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2]/20"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="Email address"
                  required
                  className="w-full rounded-xl border border-[rgba(0,0,0,0.1)] px-4 py-3 text-sm outline-none transition-colors focus:border-[#0891b2] focus:ring-1 focus:ring-[#0891b2]/20"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full rounded-full bg-[#0891b2] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0369a1] disabled:opacity-60"
                >
                  {sending ? "Sending..." : "Get Early Access"}
                </button>
              </form>

              <p className="mt-3 text-center text-[10px] text-[#5C6670] md:text-xs">
                No spam. Unsubscribe anytime.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
