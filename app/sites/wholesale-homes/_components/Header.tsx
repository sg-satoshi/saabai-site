"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";

const nav = [
  { to: "/packages", label: "Packages" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/tax-advantages", label: "Tax Advantages" },
  { to: "/about", label: "About" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
  { to: "/blog", label: "Blog" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(0,0,0,0.08)] bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6 lg:px-10">
        <Logo />
        <nav className="hidden items-center gap-8 lg:flex">
          {nav.map((n) => (
            <Link key={n.to} href={n.to} className="text-sm text-[#5C6670]/70 transition-colors hover:text-[#5C6670]">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex lg:pl-16">
          <Link
            href="/client-login"
            className="text-sm font-medium text-[#0891b2] whitespace-nowrap transition-colors hover:text-[#0369a1]"
          >
            Client Login
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-full bg-[#0891b2] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0369a1]"
          >
            Book Discovery Call
          </Link>
        </div>
        <button onClick={() => setOpen(!open)} className="lg:hidden" aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-[rgba(0,0,0,0.08)] bg-white lg:hidden">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-6 py-4 lg:px-10">
            {nav.map((n) => (
              <Link key={n.to} href={n.to} onClick={() => setOpen(false)} className="py-2 text-sm">
                {n.label}
              </Link>
            ))}
            <Link href="/client-login" onClick={() => setOpen(false)} className="py-2 text-sm font-medium text-[#0891b2]">
              Client Login
            </Link>
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center rounded-full bg-[#0891b2] px-5 py-2.5 text-sm font-medium text-white"
            >
              Book Discovery Call
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
