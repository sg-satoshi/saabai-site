"use client";

import { useEffect, useRef, useState } from "react";

interface NewsItem {
  title: string;
  url: string;
  source: string;
  type: "reddit" | "news";
}

export default function NewsTicker() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  // Duration scales with number of items — slowed by 33%
  const duration = Math.max(100, Math.round(items.length * 8 * 1.33 * 1.29));

  return (
    <div
      className="hidden md:flex fixed bottom-0 left-0 right-0 h-9 z-40 items-center overflow-hidden select-none"
      style={{
        background: "linear-gradient(90deg, #03021a 0%, #050318 100%)",
        borderTop: "1px solid rgba(98,197,209,0.35)",
        boxShadow: "0 -4px 24px rgba(98,197,209,0.12), 0 -1px 0 rgba(98,197,209,0.08)",
      }}
    >
      {/* AI LIVE label */}
      <div
        className="flex items-center gap-2 px-4 shrink-0 h-full"
        style={{
          background: "linear-gradient(90deg, #0d1a3a 0%, #091428 100%)",
          borderRight: "1px solid rgba(98,197,209,0.3)",
          minWidth: 90,
          boxShadow: "inset -8px 0 16px rgba(98,197,209,0.05)",
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"
          style={{ boxShadow: "0 0 6px rgba(74,222,128,0.8)" }} />
        <span className="text-[9px] font-bold tracking-[0.2em] uppercase whitespace-nowrap"
          style={{ color: "#7dd8e8" }}>
          AI Live
        </span>
      </div>

      {/* Scrolling track */}
      <div className="flex-1 overflow-hidden h-full flex items-center">
        <div
          ref={trackRef}
          className="flex items-center whitespace-nowrap"
          style={{ animation: `news-ticker ${duration}s linear infinite` }}
          onMouseEnter={() => {
            if (trackRef.current) trackRef.current.style.animationPlayState = "paused";
          }}
          onMouseLeave={() => {
            if (trackRef.current) trackRef.current.style.animationPlayState = "running";
          }}
        >
          {/* Items duplicated for seamless infinite loop */}
          {[...items, ...items].map((item, i) => (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-5 group cursor-pointer"
            >
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase shrink-0"
                style={{
                  background: item.type === "reddit" ? "rgba(255,99,0,0.2)" : "rgba(98,197,209,0.15)",
                  color: item.type === "reddit" ? "#ff7a45" : "#7dd8e8",
                  boxShadow: item.type === "reddit"
                    ? "0 0 8px rgba(255,99,0,0.2)"
                    : "0 0 8px rgba(98,197,209,0.2)",
                }}
              >
                {item.source}
              </span>
              <span
                className="text-[12px] font-medium group-hover:text-white transition-colors duration-150"
                style={{ color: "#8899bb" }}
              >
                {item.title}
              </span>
              <span className="text-xs shrink-0" style={{ color: "rgba(98,197,209,0.25)" }}>·</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
