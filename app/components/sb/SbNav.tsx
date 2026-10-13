"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import "./sb.css";

type Props = { active?: "websites" | "blueprint" | "score"; right?: React.ReactNode; minimal?: boolean };

const LINKS = [
  { href: "/websites", label: "Websites", key: "websites" },
  { href: "/blueprint", label: "Blueprint", key: "blueprint" },
  { href: "/case-studies", label: "Work", key: "work" },
  { href: "/about", label: "About", key: "about" },
  { href: "/faq", label: "FAQ", key: "faq" },
];

const CTA = { href: "/score", label: "Get your free AI score" };

export default function SbNav({ active, right, minimal }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    function onPointer(e: MouseEvent | TouchEvent) {
      const root = rootRef.current;
      if (!root) return;
      const target = e.target as Node | null;
      if (target && !root.contains(target)) setOpen(false);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [open]);

  return (
    <div className="wrap nav" ref={rootRef}>
      <Link href="/" className="logo" aria-label="Saabai home" onClick={() => setOpen(false)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/saabai-logo.png" alt="Saabai" width={132} height={44} />
      </Link>
      {minimal ? (
        right ?? null
      ) : (
        <>
          <nav className="links" aria-label="Main">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className={active === l.key ? "on" : ""}>
                {l.label}
              </a>
            ))}
          </nav>
          <a className="btn sm navcta" href={CTA.href}>
            {CTA.label}
          </a>
          <button
            type="button"
            className={`burger${open ? " is-open" : ""}`}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
          {open && (
            <div className="mmenu" id={menuId} role="navigation" aria-label="Mobile">
              {LINKS.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
                  {l.label}
                </a>
              ))}
              <a href={CTA.href} className="btn" style={{ marginTop: 8 }} onClick={() => setOpen(false)}>
                {CTA.label}
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
