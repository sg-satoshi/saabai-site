"use client";

import Link from "next/link";
import { useState } from "react";
import "./sb.css";

type Props = { active?: "websites" | "blueprint" | "score"; right?: React.ReactNode; minimal?: boolean };

const LINKS = [
  { href: "/websites", label: "Websites", key: "websites" },
  { href: "/blueprint", label: "Blueprint", key: "blueprint" },
  { href: "/case-studies", label: "Work", key: "work" },
  { href: "/about", label: "About", key: "about" },
  { href: "/faq", label: "FAQ", key: "faq" },
];

export default function SbNav({ active, right, minimal }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="wrap nav">
      <Link href="/" className="logo" aria-label="Saabai home">
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
          <a className="btn sm navcta" href="/score">Get your free AI score</a>
          <button className="burger" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            <span /><span /><span />
          </button>
          {open && (
            <div className="mmenu">
              {LINKS.map((l) => (
                <a key={l.href} href={l.href}>{l.label}</a>
              ))}
              <a href="/score" className="btn" style={{ marginTop: 8 }}>Get your free AI score</a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
