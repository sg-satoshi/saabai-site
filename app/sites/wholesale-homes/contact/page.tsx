"use client";

import { useState } from "react";
import { Check, Phone, Mail, Calendar } from "lucide-react";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";
import { ChatWidget } from "../_components/ChatWidget";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setSubmitted(true);
    // Fire and forget — don't block UI on the API call
    fetch("/api/site-factory/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteSlug: "wholesale-homes", ...data }),
    }).catch(() => {});
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center px-6">
          <div className="text-center">
            <Check className="mx-auto h-10 w-10 text-[#0891b2] md:h-12 md:w-12" />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">Thanks for reaching out</h1>
            <p className="mt-3 text-sm text-[#5C6670] md:text-base">We&rsquo;ll be in touch within 24 hours.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-16 md:py-28">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
            <div className="grid gap-10 md:gap-14 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">Get Started</p>
                <h1 className="mt-3 text-[clamp(1.6rem,5vw,3rem)] font-semibold leading-tight tracking-tight md:text-4xl lg:text-5xl">
                  Book your discovery call.
                </h1>
                <p className="mt-4 text-sm leading-relaxed text-[#5C6670] md:mt-5 md:text-base">
                  A 20-minute conversation. No obligation. We&rsquo;ll cover your goals, budget, timeline, and match you to the right package.
                </p>

                <div className="mt-8 space-y-4 md:mt-10">
                  {[
                    { icon: Phone, text: "1300 000 000", href: "tel:1300000000" },
                    { icon: Mail, text: "hello@wholesalehomes.com.au", href: "mailto:hello@wholesalehomes.com.au" },
                  ].map(({ icon: Icon, text, href }) => (
                    <a key={href} href={href} className="flex items-center gap-3 text-sm text-[#5C6670] hover:text-[#1A2B3C] md:text-base">
                      <Icon className="h-4 w-4 text-[#0891b2]" /> {text}
                    </a>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-3">
                <form onSubmit={handleSubmit} className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-sm md:p-8">
                  <div className="grid gap-4 md:grid-cols-2 md:gap-5">
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-[#5C6670] md:text-sm">Name</label>
                      <input name="name" required className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] px-4 py-2.5 text-sm outline-none focus:border-[#0891b2] md:text-base" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#5C6670] md:text-sm">Email</label>
                      <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] px-4 py-2.5 text-sm outline-none focus:border-[#0891b2] md:text-base" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#5C6670] md:text-sm">Phone</label>
                      <input name="phone" type="tel" required className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] px-4 py-2.5 text-sm outline-none focus:border-[#0891b2] md:text-base" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-[#5C6670] md:text-sm">State of Interest</label>
                      <select name="state" className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-4 py-2.5 text-sm text-[#5C6670] outline-none focus:border-[#0891b2] md:text-base">
                        <option value="">Select state...</option>
                        <option value="NSW">NSW</option>
                        <option value="QLD">QLD</option>
                        <option value="SA">SA</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-[#5C6670] md:text-sm">I am a...</label>
                      <select name="buyer_type" className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-4 py-2.5 text-sm text-[#5C6670] outline-none focus:border-[#0891b2] md:text-base">
                        <option value="">Select...</option>
                        <option value="First home buyer">First home buyer</option>
                        <option value="Investor">Investor</option>
                        <option value="Downsizer">Downsizer</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-[#5C6670] md:text-sm">Budget Range</label>
                      <select name="budget" className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0891b2] md:text-base">
                        <option value="">Select budget...</option>
                        <option value="$400K – $600K">$400K – $600K</option>
                        <option value="$600K – $800K">$600K – $800K</option>
                        <option value="$800K – $1M">$800K – $1M</option>
                        <option value="$1M+">$1M+</option>
                        <option value="Not sure">Not sure</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-[#5C6670] md:text-sm">When are you looking to buy?</label>
                      <select name="timeline" className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-4 py-2.5 text-sm text-[#5C6670] outline-none focus:border-[#0891b2] md:text-base">
                        <option value="">Select timeline...</option>
                        <option value="0–3 months">0–3 months</option>
                        <option value="3–6 months">3–6 months</option>
                        <option value="6–12 months">6–12 months</option>
                        <option value="Just researching">Just researching</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-[#5C6670] md:text-sm">Anything else we should know? <span className="font-normal text-[#9CA3AF]">(optional)</span></label>
                      <textarea name="message" rows={3} className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] px-4 py-2.5 text-sm outline-none focus:border-[#0891b2] resize-none md:text-base" />
                    </div>
                  </div>
                  <button type="submit" className="mt-5 w-full rounded-full bg-[#0891b2] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0369a1] md:mt-6 md:px-7 md:py-4 md:text-base">
                    Send Enquiry
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
