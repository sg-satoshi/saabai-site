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

  // Duration scales with number of items so reading speed stays consistent
  const duration = Math.max(60, items.length * 8);

  return (
    <div
      className="hidden md:flex fixed bottom-0 left-0 right-0 h-9 z-40 items-center overflow-hidden select-none"
      style={{ background: "#06041e", borderTop: "1px solid rgba(98,197,209,0.12)" }}
    >
      {/* AI LIVE label */}
      <div
        className="flex items-center gap-2 px-4 shrink-0 h-full"
        style={{ background: "#0b092e", borderRight: "1px solid rgba(98,197,209,0.15)", minWidth: 90 }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-[9px] font-bold tracking-[0.2em] text-saabai-teal uppercase whitespace-nowrap">
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
                  background:
                    item.type === "reddit"
                      ? "rgba(255,99,0,0.15)"
                      : "rgba(98,197,209,0.1)",
                  color: item.type === "reddit" ? "#ff6535" : "#62c5d1",
                }}
              >
                {item.source}
              </span>
              <span className="text-[12px] text-saabai-text-dim group-hover:text-saabai-text transition-colors duration-150">
                {item.title}
              </span>
              <span className="text-saabai-text-dim/30 text-xs shrink-0">·</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
