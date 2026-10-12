"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reviews, googleRating, googleReviewCount, googleMapsUrl } from "./reviews";

function Stars({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span className={`flex gap-0.5 text-brand ${className}`} aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" className={`size-4 ${i < Math.round(n) ? "fill-current" : "fill-white/15"}`}>
          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z" />
        </svg>
      ))}
    </span>
  );
}

export function ReviewsCarousel() {
  const track = useRef<HTMLUListElement>(null);
  const [paused, setPaused] = useState(false);
  const scroll = useCallback((dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector("li");
    const step = card ? card.getBoundingClientRect().width + 24 : el.clientWidth;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    if (dir === 1 && atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
    else if (dir === -1 && el.scrollLeft <= 4) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    else el.scrollBy({ left: dir * step, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (paused) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const id = window.setInterval(() => {
      if (!mq.matches) scroll(1);
    }, 6000);
    return () => window.clearInterval(id);
  }, [paused, scroll]);

  return (
    <section aria-labelledby="reviews-heading" className="py-16 border-b border-muted-line">
      <style>{`.stu-review-card{flex:0 0 100%}@media(min-width:768px){.stu-review-card{flex-basis:calc(50% - 12px)}}@media(min-width:1024px){.stu-review-card{flex-basis:calc((100% - 48px)/3)}}`}</style>
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <h2 id="reviews-heading" className="text-xs font-bold tracking-[0.22em] text-brand uppercase mb-3">
              Google Reviews
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <Stars n={googleRating} className="[&_svg]:size-6" />
              <span className="text-3xl font-display font-semibold tracking-tight">
                {googleRating} on Google
              </span>
              <span className="text-sm text-muted-foreground">from {googleReviewCount} reviews</span>
              <span className="sr-only">Rated {googleRating} out of 5</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold hover:text-brand transition-colors underline underline-offset-4 decoration-white/20"
            >
              Read all reviews on Google
            </a>
            <button type="button" onClick={() => scroll(-1)} aria-label="Previous review"
              className="size-10 rounded-full ring-1 ring-white/15 hover:ring-brand/60 hover:text-brand transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
              ←
            </button>
            <button type="button" onClick={() => scroll(1)} aria-label="Next review"
              className="size-10 rounded-full ring-1 ring-white/15 hover:ring-brand/60 hover:text-brand transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
              →
            </button>
          </div>
        </div>
        <ul
          ref={track}
          role="region"
          aria-roledescription="carousel"
          aria-label="Customer reviews from Google"
          tabIndex={0}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") { e.preventDefault(); scroll(1); }
            if (e.key === "ArrowLeft") { e.preventDefault(); scroll(-1); }
          }}
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand rounded-xl"
        >
          {reviews.map((r, i) => (
            <li
              key={i}
              aria-roledescription="slide"
              aria-label={`Review ${i + 1} of ${reviews.length}, by ${r.name}`}
              className="stu-review-card snap-start shrink-0 bg-surface/40 ring-1 ring-white/10 rounded-2xl p-6 flex flex-col"
            >
              <Stars n={r.stars} />
              <span className="sr-only">{r.stars} out of 5 stars</span>
              <p className="mt-4 text-sm leading-relaxed text-fg/90 line-clamp-6 whitespace-pre-line flex-1" title={r.text}>
                {r.text}
              </p>
              <div className="mt-6 pt-4 border-t border-muted-line flex items-center justify-between text-xs">
                <span className="font-semibold">{r.name}</span>
                <span className="text-muted-foreground">{r.date}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
