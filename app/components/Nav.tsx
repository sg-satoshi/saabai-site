"use client";

import Image from "next/image";

const navLinks = [
  { label: "Services", href: "/services" },
];

export default function Nav({ activePage }: { activePage?: string }) {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 border-b border-saabai-border"
      style={{ background: "var(--saabai-nav)", backdropFilter: "blur(16px)" }}
    >
      {/* Logo */}
      <a href="/">
        <Image
          src="/brand/saabai-logo.png"
          alt="Saabai.ai"
          width={212}
          height={56}
          priority
        />
      </a>

      {/* Right side: hamburger + CTA */}
      <div className="flex items-center gap-4">

        {/* Hover menu */}
        <div className="relative group">

          {/* Hamburger icon */}
          <div
            aria-label="Open menu"
            className="flex flex-col justify-center gap-[5px] p-2.5 rounded-lg group-hover:bg-saabai-surface transition-colors cursor-pointer"
          >
            <span className="block w-[22px] h-[2px] bg-saabai-text-muted rounded-full" />
            <span className="block w-[22px] h-[2px] bg-saabai-text-muted rounded-full" />
            <span className="block w-[22px] h-[2px] bg-saabai-text-muted rounded-full" />
          </div>

          {/* Dropdown — visible on group hover */}
          <div className="absolute right-0 top-full pt-2 hidden group-hover:block">
            <div className="w-52 bg-saabai-surface border border-saabai-border rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              {navLinks.map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-5 py-4 text-sm font-medium tracking-wide transition-colors ${
                    activePage === href
                      ? "text-saabai-teal bg-saabai-surface-raised"
                      : "text-saabai-text-muted hover:text-saabai-text hover:bg-saabai-surface-raised"
                  }`}
                >
                  {activePage === href && (
                    <span className="w-1 h-1 rounded-full bg-saabai-teal shrink-0" />
                  )}
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* CTA button */}
        <a
          href="https://calendly.com/shanegoldberg/30min"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold bg-saabai-teal text-saabai-bg px-5 py-2.5 rounded-lg hover:bg-saabai-teal-bright transition-colors tracking-wide whitespace-nowrap"
        >
          Book a Strategy Call
        </a>
      </div>
    </nav>
  );
}
