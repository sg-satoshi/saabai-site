"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";

type NavLink = { label: string; href: string; isNew?: boolean };
type NavSection = { section: string | null; links: NavLink[] };

const navSections: NavSection[] = [
  {
    section: "Work With Us",
    links: [
      { label: "AI Audit", href: "/ai-audit", isNew: true },
      { label: "Services", href: "/services" },
      { label: "Advisory", href: "/advisory" },
      { label: "Process", href: "/process" },
    ],
  },
  {
    section: "Industries",
    links: [
      { label: "For Law Firms", href: "/for-law-firms" },
      { label: "For Accounting Firms", href: "/for-accounting-firms" },
      { label: "For Real Estate", href: "/for-real-estate" },
    ],
  },
  {
    section: "Proof",
    links: [
      { label: "Case Studies", href: "/case-studies" },
      { label: "Use Cases", href: "/use-cases" },
    ],
  },
  {
    section: "Resources",
    links: [
      { label: "Calculator", href: "/calculator" },
      { label: "AI News", href: "/ai-news" },
      { label: "Insights", href: "/insights" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    section: null,
    links: [{ label: "About", href: "/about" }],
  },
];

export default function Nav({ activePage }: { activePage?: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 border-b border-saabai-border"
      style={{ background: "var(--saabai-nav)", backdropFilter: "blur(16px)" }}
    >
      {/* Logo */}
      <a href="/">
        <Image
          src="/brand/saabai-logo-full.png"
          alt="Saabai.ai"
          width={160}
          height={54}
          style={{ height: 40, width: "auto" }}
          priority
        />
      </a>

      {/* Right side: hamburger + links + CTA */}
      <div className="flex items-center gap-4">

        {/* Client Login link (desktop only) */}
        <a
          href="/login"
          className="hidden md:inline-block text-sm font-semibold text-saabai-text-muted hover:text-saabai-text transition-colors tracking-wide"
        >
          Client Login
        </a>

        {/* Click-toggle menu (tap on mobile, hover on desktop) */}
        <div
          className="relative"
          ref={menuRef}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >

          {/* Hamburger button */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Open menu"
            aria-expanded={open}
            className={`flex flex-col justify-center gap-[5px] p-2.5 rounded-lg transition-colors ${open ? "bg-saabai-surface" : "hover:bg-saabai-surface"}`}
          >
            <span className="block w-[22px] h-[2px] bg-saabai-text-muted rounded-full" />
            <span className="block w-[22px] h-[2px] bg-saabai-text-muted rounded-full" />
            <span className="block w-[22px] h-[2px] bg-saabai-text-muted rounded-full" />
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 top-full pt-2">
              <div
                className="w-72 bg-saabai-surface border border-saabai-border rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] max-h-[calc(100vh-120px)] overflow-y-auto"
              >
                {navSections.map(({ section, links }, sectionIdx) => (
                  <div
                    key={section ?? `__section-${sectionIdx}`}
                    className={sectionIdx > 0 ? "border-t border-saabai-border" : ""}
                  >
                    {section && (
                      <div className="px-5 pt-4 pb-2 text-[10px] font-semibold tracking-[0.2em] uppercase text-saabai-text-dim">
                        {section}
                      </div>
                    )}
                    {links.map(({ label, href, isNew }) => (
                      <a
                        key={href}
                        href={href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center justify-between gap-3 px-5 py-3 text-sm font-medium tracking-wide transition-colors ${
                          activePage === href
                            ? "text-saabai-teal bg-saabai-surface-raised"
                            : "text-saabai-text-muted hover:text-saabai-text hover:bg-saabai-surface-raised"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          {activePage === href && (
                            <span className="w-1 h-1 rounded-full bg-saabai-teal shrink-0" />
                          )}
                          {label}
                        </span>
                        {isNew && (
                          <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-saabai-bg bg-saabai-teal px-2 py-0.5 rounded-full">
                            New
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                ))}
                {/* Client Login in menu (visible on all devices) */}
                <div className="border-t border-saabai-border">
                  <a
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-5 py-3 text-sm font-medium tracking-wide text-saabai-text-muted hover:text-saabai-text hover:bg-saabai-surface-raised transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                      <polyline points="10 17 15 12 10 7" />
                      <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                    Client Login
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CTA button */}
        <a
          href="https://calendly.com/shanegoldberg/30min"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold bg-saabai-teal text-saabai-bg px-5 py-2.5 rounded-lg hover:bg-saabai-teal-bright transition-colors tracking-wide whitespace-nowrap"
        >
          Book a Free 30-Min Call
        </a>
      </div>
    </nav>
  );
}
