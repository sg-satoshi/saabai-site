"use client";

import { useEffect, useState } from "react";

export default function MobileCtaBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      const scrolled = window.scrollY > 300;
      const nearBottom =
        window.scrollY + window.innerHeight >= document.body.scrollHeight - 80;
      setVisible(scrolled && !nearBottom);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ background: "var(--saabai-bg)" }}
    >
      <div className="h-px bg-gradient-to-r from-transparent via-saabai-teal/40 to-transparent" />
      <div className="px-4 py-3">
        <a
          href="https://calendly.com/shanegoldberg/30min"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-saabai-teal text-saabai-bg px-6 py-3.5 rounded-xl font-semibold text-sm tracking-wide hover:bg-saabai-teal-bright transition-colors"
          style={{ boxShadow: "0 0 24px rgba(98,197,209,0.35)" }}
        >
          Book a free 30-min strategy call →
        </a>
      </div>
    </div>
  );
}
