"use client";

import { useState } from "react";
import { Check, Phone, Mail, Calendar } from "lucide-react";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";
import { ChatWidget } from "../_components/ChatWidget";
import { Section, SectionTitle } from "../_components/Section";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Section className="bg-[#f5f2eb]/40 !pb-12">
          <SectionTitle as="h1" eyebrow="Get in touch" title="Book your free 20-minute Discovery Call" intro="A no-pressure conversation about your budget, goals and the packages that fit. Speak directly with our principal advisor." />
        </Section>

        <Section className="!pt-12">
          <div className="grid gap-12 lg:grid-cols-5">
            <div className="lg:col-span-3">
              {sent ? (
                <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-10 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#0891b2]/10 text-[#0891b2]">
                    <Check className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold tracking-tight">Enquiry received.</h3>
                  <p className="mt-3 text-[#5C6670]">Our principal advisor will reach out within 24 hours.</p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => { e.preventDefault(); setSent(true); }}
                  className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 md:p-10"
                >
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Name" name="name" required />
                    <Field label="Email" name="email" type="email" required />
                    <Field label="Phone" name="phone" type="tel" />
                    <SelectField label="Budget" name="budget" options={["Under $600K", "$600K – $750K", "$750K – $900K", "$900K+"]} />
                    <Field label="Target location" name="location" />
                    <SelectField label="Investor type" name="investor" options={["First-home buyer", "Existing investor", "Upgrader"]} />
                  </div>
                  <SelectField label="Timeline" name="timeline" options={["ASAP", "Next 3 months", "3 to 6 months", "6+ months"]} full />
                  <label className="mt-5 flex flex-col gap-1.5 text-xs">
                    <span className="font-semibold uppercase tracking-wider text-[#5C6670]">Message</span>
                    <textarea name="message" rows={4} className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f5f7] px-3 py-2.5 text-sm outline-none focus:border-[#0891b2]" />
                  </label>
                  <button type="submit" className="mt-7 inline-flex w-full items-center justify-center rounded-full bg-[#0891b2] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#0369a1]">
                    Submit Enquiry
                  </button>
                  <p className="mt-3 text-center text-xs text-[#5C6670]">By submitting you agree to our privacy policy. We never share your details.</p>
                </form>
              )}
            </div>

            <aside className="space-y-5 lg:col-span-2">
              <div className="rounded-3xl bg-[#1A2B3C] p-8 text-white">
                <Calendar className="h-6 w-6 text-[#0891b2]" />
                <h3 className="mt-4 text-xl font-semibold tracking-tight">Prefer to schedule directly?</h3>
                <p className="mt-2 text-sm text-white/70">Pick a 20-minute slot that suits you, calendar links sync straight to your inbox.</p>
                <a href="#" className="mt-5 inline-flex items-center justify-center rounded-full bg-[#0891b2] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0369a1]">
                  Open booking calendar
                </a>
                <p className="mt-3 text-xs text-white/75">Calendly integration ready, connect post-launch.</p>
              </div>
              <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8">
                <a href="tel:1300000000" className="flex items-center gap-3 text-sm">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0891b2]/10 text-[#0891b2]"><Phone className="h-4 w-4" /></span>
                  <span><span className="block text-xs uppercase tracking-wider text-[#5C6670]">Phone</span>1300 000 000</span>
                </a>
                <a href="mailto:hello@wholesalehomes.com.au" className="mt-5 flex items-center gap-3 text-sm">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0891b2]/10 text-[#0891b2]"><Mail className="h-4 w-4" /></span>
                  <span><span className="block text-xs uppercase tracking-wider text-[#5C6670]">Email</span>hello@wholesalehomes.com.au</span>
                </a>
              </div>
            </aside>
          </div>
        </Section>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}

function Field({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs">
      <span className="font-semibold uppercase tracking-wider text-[#5C6670]">{label}{required && " *"}</span>
      <input type={type} name={name} required={required} className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f5f7] px-3 py-2.5 text-sm outline-none focus:border-[#0891b2]" />
    </label>
  );
}

function SelectField({ label, name, options, full = false }: { label: string; name: string; options: string[]; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1.5 text-xs ${full ? "mt-5" : ""}`}>
      <span className="font-semibold uppercase tracking-wider text-[#5C6670]">{label}</span>
      <select name={name} className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f5f7] px-3 py-2.5 text-sm outline-none focus:border-[#0891b2]">
        <option value="">Select...</option>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}
