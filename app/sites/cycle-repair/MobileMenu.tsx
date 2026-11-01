"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type MobileNavLink = { href: string; label: string };

export function MobileMenu({ links }: { links: MobileNavLink[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    body.setAttribute("data-cr-menu-open", "");
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      body.style.overflow = prevOverflow;
      body.removeAttribute("data-cr-menu-open");
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="cr-mobile-menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center w-11 h-11 rounded-md border border-muted-line text-fg hover:text-brand hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-colors"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {open ? (
            <>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </>
          ) : (
            <>
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </>
          )}
        </svg>
      </button>
      <style>{`body[data-cr-menu-open] .cr-sticky-cta{display:none}`}</style>
      {mounted &&
        createPortal(
          <div
            aria-hidden="true"
            onClick={close}
            data-testid="cr-menu-scrim"
            style={{ backgroundColor: "rgba(13,11,10,.7)" }}
            className={`md:hidden fixed inset-x-0 bottom-0 top-20 z-30 transition-opacity duration-200 motion-reduce:transition-none ${
              open ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          />,
          document.body,
        )}
      <div
        id="cr-mobile-menu"
        inert={!open}
        aria-hidden={!open}
        className={`absolute left-0 right-0 top-20 bg-bg border-b border-muted-line shadow-lg transition-[opacity,transform,visibility] duration-200 motion-reduce:transition-none ${
          open ? "opacity-100 translate-y-0 visible" : "opacity-0 -translate-y-2 invisible pointer-events-none"
        }`}
      >
        <ul className="max-w-7xl mx-auto px-6 py-4 flex flex-col text-base font-medium text-muted-foreground">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} onClick={close} className="block py-3 border-b border-muted-line/60 hover:text-brand transition-colors">
                {l.label}
              </Link>
            </li>
          ))}
          <li className="pt-4">
            <a
              href="tel:0405225721"
              onClick={close}
              className="block text-center bg-brand text-brand-foreground px-4 py-3 rounded-md font-semibold text-sm tracking-wide hover:bg-brand/90 transition-colors"
            >
              Call 0405 225 721
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
