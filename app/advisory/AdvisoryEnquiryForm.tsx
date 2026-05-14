"use client";

import { useEffect, useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

const HASH = "#advisory-enquiry";

export default function AdvisoryEnquiryForm() {
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    function maybeOpen() {
      if (window.location.hash === HASH) {
        setShowForm(true);
      }
    }
    maybeOpen();
    window.addEventListener("hashchange", maybeOpen);
    return () => window.removeEventListener("hashchange", maybeOpen);
  }, []);

  function closeForm() {
    setShowForm(false);
    if (typeof window !== "undefined" && window.location.hash === HASH) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      company: String(formData.get("company") || ""),
      role: String(formData.get("role") || ""),
      message: String(formData.get("message") || ""),
    };

    try {
      const res = await fetch("/api/advisory-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "Submission failed");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Submission failed.");
    }
  }

  if (status === "success") {
    return (
      <div className="relative max-w-2xl mx-auto text-left p-10 bg-saabai-surface border border-saabai-teal/40 rounded-2xl"
        style={{ boxShadow: "0 0 60px rgba(98,197,209,0.35), 0 0 24px rgba(98,197,209,0.18)" }}
      >
        <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-saabai-teal mb-3">
          Enquiry Received
        </p>
        <h3 className="text-2xl font-semibold tracking-tight mb-3">
          Thanks. Shane will be in touch.
        </h3>
        <p className="text-base text-saabai-text-muted leading-relaxed">
          We aim to respond within one business day. If your situation is time-sensitive, email{" "}
          <a href="mailto:hello@saabai.ai" className="text-saabai-text hover:text-saabai-teal underline">
            hello@saabai.ai
          </a>{" "}
          directly.
        </p>
      </div>
    );
  }

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="relative inline-block bg-saabai-teal text-saabai-bg px-12 py-4 rounded-xl font-bold text-base hover:opacity-90 transition-opacity tracking-wide shadow-[0_0_40px_var(--saabai-glow-mid)]"
      >
        Send an Enquiry
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative max-w-2xl mx-auto text-left p-8 md:p-10 bg-saabai-surface border border-saabai-border rounded-2xl"
      style={{ boxShadow: "0 0 60px rgba(98,197,209,0.25), 0 0 24px rgba(98,197,209,0.15)" }}
    >
      <div className="flex items-start justify-between gap-6 mb-8">
        <div>
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-saabai-teal mb-2">
            Advisory Enquiry
          </p>
          <h3 className="text-xl font-semibold tracking-tight">
            Tell us about your situation
          </h3>
        </div>
        <button
          type="button"
          onClick={closeForm}
          className="text-saabai-text-dim hover:text-saabai-text text-2xl leading-none p-1 -m-1 shrink-0"
          aria-label="Close form"
        >
          ×
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-5">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] font-medium tracking-[0.15em] text-saabai-text-dim uppercase">
            Name *
          </span>
          <input
            type="text"
            name="name"
            required
            autoComplete="name"
            className="bg-saabai-bg border border-saabai-border rounded-lg px-4 py-3 text-base text-saabai-text placeholder:text-saabai-text-dim focus:border-saabai-teal/60 focus:outline-none transition-colors"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[11px] font-medium tracking-[0.15em] text-saabai-text-dim uppercase">
            Email *
          </span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="bg-saabai-bg border border-saabai-border rounded-lg px-4 py-3 text-base text-saabai-text placeholder:text-saabai-text-dim focus:border-saabai-teal/60 focus:outline-none transition-colors"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[11px] font-medium tracking-[0.15em] text-saabai-text-dim uppercase">
            Company *
          </span>
          <input
            type="text"
            name="company"
            required
            autoComplete="organization"
            className="bg-saabai-bg border border-saabai-border rounded-lg px-4 py-3 text-base text-saabai-text placeholder:text-saabai-text-dim focus:border-saabai-teal/60 focus:outline-none transition-colors"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[11px] font-medium tracking-[0.15em] text-saabai-text-dim uppercase">
            Your Role
          </span>
          <select
            name="role"
            defaultValue=""
            className="bg-saabai-bg border border-saabai-border rounded-lg px-4 py-3 text-base text-saabai-text focus:border-saabai-teal/60 focus:outline-none transition-colors"
          >
            <option value="">Select...</option>
            <option value="CEO">CEO</option>
            <option value="Chair">Chair</option>
            <option value="Director">Director</option>
            <option value="Investor">Investor</option>
            <option value="Other">Other</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-2 mb-6">
        <span className="text-[11px] font-medium tracking-[0.15em] text-saabai-text-dim uppercase">
          What&apos;s the situation? *
        </span>
        <textarea
          name="message"
          required
          rows={5}
          placeholder="A few sentences on what's prompting the enquiry. For example: AI investment under consideration, capability gap at board level, or oversight on a specific project."
          className="bg-saabai-bg border border-saabai-border rounded-lg px-4 py-3 text-base text-saabai-text placeholder:text-saabai-text-dim focus:border-saabai-teal/60 focus:outline-none transition-colors resize-y leading-relaxed"
        />
      </label>

      {status === "error" && (
        <p className="text-sm text-red-400 mb-4 leading-relaxed">
          {errorMessage || "Submission failed."} Please email{" "}
          <a href="mailto:hello@saabai.ai" className="underline">
            hello@saabai.ai
          </a>{" "}
          directly.
        </p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="bg-saabai-teal text-saabai-bg px-9 py-[14px] rounded-xl font-semibold text-base hover:bg-saabai-teal-bright transition-colors tracking-wide shadow-[0_0_30px_var(--saabai-glow-mid)] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {status === "submitting" ? "Sending..." : "Send Enquiry"}
        </button>
        <p className="text-xs text-saabai-text-dim leading-relaxed">
          Or email{" "}
          <a href="mailto:hello@saabai.ai" className="text-saabai-text hover:text-saabai-teal underline">
            hello@saabai.ai
          </a>{" "}
          directly.
        </p>
      </div>
    </form>
  );
}
