"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reviews, googleRating, googleReviewCount, googleMapsUrl } from "./reviews";

function Stars({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span className={`flex gap-0.5 text-[#FBBC04] ${className}`} aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" className={`size-4 ${i < Math.round(n) ? "fill-current" : "fill-[#dadce0]"}`}>
          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z" />
        </svg>
      ))}
    </span>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="size-7" role="img" aria-label="Google">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
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
    <section aria-labelledby="reviews-heading" className="py-16 bg-white text-[#202124]">
      <style>{`.stu-review-card{flex:0 0 100%}@media(min-width:768px){.stu-review-card{flex-basis:calc(50% - 12px)}}@media(min-width:1024px){.stu-review-card{flex-basis:calc((100% - 48px)/3)}}`}</style>
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <h2 id="reviews-heading" className="text-xs font-bold tracking-[0.22em] text-[#3c4043] uppercase mb-3">
              Google Reviews
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <GoogleG />
              <Stars n={googleRating} className="[&_svg]:size-6" />
              <span className="text-3xl font-display font-semibold tracking-tight text-[#202124]">
                {googleRating} on Google
              </span>
              <span className="text-sm text-[#70757a]">from {googleReviewCount} reviews</span>
              <span className="sr-only">Rated {googleRating} out of 5</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-[#1a73e8] hover:text-[#174ea6] transition-colors underline underline-offset-4"
            >
              Read all reviews on Google
            </a>
            <button type="button" onClick={() => scroll(-1)} aria-label="Previous review"
              className="size-10 rounded-full bg-white text-[#3c4043] ring-1 ring-[#dadce0] shadow-sm hover:bg-[#f1f3f4] hover:text-[#202124] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1a73e8]">
              ←
            </button>
            <button type="button" onClick={() => scroll(1)} aria-label="Next review"
              className="size-10 rounded-full bg-white text-[#3c4043] ring-1 ring-[#dadce0] shadow-sm hover:bg-[#f1f3f4] hover:text-[#202124] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1a73e8]">
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
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1a73e8] rounded-xl"
        >
          {reviews.map((r, i) => (
            <li
              key={i}
              aria-roledescription="slide"
              aria-label={`Review ${i + 1} of ${reviews.length}, by ${r.name}`}
              className="stu-review-card snap-start shrink-0 bg-[#f8f9fa] ring-1 ring-[#dadce0] shadow-sm rounded-2xl p-6 flex flex-col"
            >
              <Stars n={r.stars} />
              <span className="sr-only">{r.stars} out of 5 stars</span>
              <p className="mt-4 text-sm leading-relaxed text-[#3c4043] line-clamp-6 whitespace-pre-line flex-1" title={r.text}>
                {r.text}
              </p>
              <div className="mt-6 pt-4 border-t border-[#e8eaed] flex items-center justify-between text-xs">
                <span className="font-semibold text-[#202124]">{r.name}</span>
                <span className="text-[#70757a]">{r.date}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
