"use client";

import Link from "next/link";
import { useState } from "react";
import { OWNER_EMAIL } from "../services";
import { Logo } from "../Logo";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    suburb: "",
    message: "",
  });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const inputClass =
    "w-full bg-bg ring-1 ring-white/10 focus:ring-brand rounded-lg px-3.5 py-2.5 text-sm outline-none transition-shadow placeholder:text-muted-foreground/60";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || (!form.phone.trim() && !form.email.trim())) {
      setError("Please add your name and either a phone number or an email.");
      return;
    }
    if (!form.message.trim()) {
      setError("Let Stu know what you need help with.");
      return;
    }
    setError("");
    setSending(true);

    try {
      const res = await fetch("/api/cycle-repair/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formType: "contact", ...form }),
      });
      if (!res.ok) {
        throw new Error("send failed");
      }
      setSent(true);
    } catch {
      setError(
        `Something went wrong sending your enquiry. Please call 0405 225 721 or email ${OWNER_EMAIL}.`,
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-fg font-sans">
      <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur-md border-b border-muted-line">
        <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/sites/cycle-repair" className="flex items-center">
            <Logo width={160} height={68} className="h-[58px] sm:h-[68px] w-auto" />
          </Link>
          <a
            href="tel:0405225721"
            className="bg-brand text-brand-foreground px-4 py-2 rounded-md font-semibold text-xs tracking-wide hover:bg-brand/90 transition-colors"
          >
            0405 225 721
          </a>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-14 pb-24">
        <Link
          href="/sites/cycle-repair"
          className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-brand transition-colors"
        >
          Back to services
        </Link>
        <h1 className="mt-5 text-4xl md:text-5xl font-display font-semibold tracking-tighter max-w-[20ch]">
          Get in touch with Stu
        </h1>
        <p className="mt-4 text-muted-foreground max-w-[60ch] text-pretty">
          Got a question about a repair, an upgrade or whether Stu covers your suburb?
          Send an enquiry and he will get back to you. If you already know what you
          need, the service builder gives you an approximate price on the spot.
        </p>

        <div className="mt-12 grid lg:grid-cols-[1fr_340px] gap-10 items-start">
          {sent ? (
            <div className="rounded-2xl bg-surface ring-1 ring-white/10 p-6 sm:p-8">
              <h2 className="text-xs font-bold tracking-[0.22em] text-brand uppercase mb-4">
                Enquiry sent
              </h2>
              <p className="font-display text-2xl font-semibold mb-3">
                Thanks, your enquiry is on its way to Stu.
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Stu will get back to you as soon as he can. If it is urgent, give him a
                call on{" "}
                <a href="tel:0405225721" className="text-brand hover:underline">
                  0405 225 721
                </a>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="rounded-2xl bg-surface ring-1 ring-white/10 p-6 sm:p-8">
              <h2 className="text-xs font-bold tracking-[0.22em] text-brand uppercase mb-6">
                Send an enquiry
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="text-sm">
                  <span className="block mb-1.5 text-muted-foreground text-xs uppercase tracking-wider">
                    Name
                  </span>
                  <input
                    className={inputClass}
                    maxLength={100}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your name"
                  />
                </label>
                <label className="text-sm">
                  <span className="block mb-1.5 text-muted-foreground text-xs uppercase tracking-wider">
                    Phone
                  </span>
                  <input
                    className={inputClass}
                    maxLength={30}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="0400 000 000"
                  />
                </label>
                <label className="text-sm">
                  <span className="block mb-1.5 text-muted-foreground text-xs uppercase tracking-wider">
                    Email
                  </span>
                  <input
                    type="email"
                    className={inputClass}
                    maxLength={255}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@email.com"
                  />
                </label>
                <label className="text-sm">
                  <span className="block mb-1.5 text-muted-foreground text-xs uppercase tracking-wider">
                    Suburb
                  </span>
                  <input
                    className={inputClass}
                    maxLength={100}
                    value={form.suburb}
                    onChange={(e) => setForm({ ...form, suburb: e.target.value })}
                    placeholder="Where you are"
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="block mb-1.5 text-muted-foreground text-xs uppercase tracking-wider">
                    How can Stu help?
                  </span>
                  <textarea
                    rows={6}
                    className={inputClass}
                    maxLength={1500}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell Stu about your bike, the issue, and when suits you."
                  />
                </label>
              </div>
              {error && <p className="mt-4 text-xs text-brand font-semibold">{error}</p>}
              <button
                type="submit"
                disabled={sending}
                className="mt-6 w-full sm:w-auto sm:px-10 bg-brand text-brand-foreground py-3 rounded-lg font-semibold text-sm hover:bg-brand/90 transition-colors disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send enquiry"}
              </button>
            </form>
          )}

          <aside className="rounded-2xl bg-surface ring-1 ring-white/10 p-6 space-y-6">
            <div>
              <h2 className="text-xs font-bold tracking-[0.22em] text-brand uppercase mb-3">
                Direct contact
              </h2>
              <a
                href="tel:0405225721"
                className="block font-display text-2xl font-semibold hover:text-brand transition-colors"
              >
                0405 225 721
              </a>
              <a
                href={`mailto:${OWNER_EMAIL}`}
                className="mt-2 block text-sm text-muted-foreground break-all hover:text-brand transition-colors"
              >
                {OWNER_EMAIL}
              </a>
            </div>
            <div className="border-t border-muted-line pt-5">
              <h3 className="text-xs font-bold tracking-[0.22em] text-brand uppercase mb-2">
                Service area
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Mobile servicing across the Gold Coast and surrounding areas. Stu comes
                to you, at home or at work.
              </p>
            </div>
            <Link
              href="/sites/cycle-repair/quote"
              className="block text-center py-3 rounded-lg font-semibold text-sm bg-brand/15 text-brand ring-1 ring-brand/60 hover:bg-brand hover:text-brand-foreground transition-colors"
            >
              Build a service request
            </Link>
          </aside>
        </div>
      </main>
    </div>
  );
}
