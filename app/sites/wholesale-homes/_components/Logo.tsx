"use client";

import Link from "next/link";
import Image from "next/image";

export function Logo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const text = variant === "dark" ? "text-[#1A2B3C]" : "text-white";
  const mark = variant === "dark" ? "text-[#0891b2]" : "text-white";
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 28 28" className={mark} aria-hidden="true">
        <path d="M3 14 L14 4 L25 14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
        <rect x="7" y="14" width="14" height="10" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle cx="14" cy="20" r="1.5" fill="currentColor" />
      </svg>
      <div className={`flex flex-col leading-none ${text}`}>
        <span className="text-[15px] font-semibold tracking-tight">Wholesale Homes</span>
        <span className="text-[10px] uppercase tracking-[0.2em] opacity-60">Australia</span>
      </div>
    </Link>
  );
}
