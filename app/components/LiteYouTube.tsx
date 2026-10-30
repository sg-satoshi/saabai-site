"use client";

import { useState } from "react";

type Props = { id: string; title: string; poster: string };

/** Click-to-play YouTube facade. Loads youtube-nocookie.com only after the visitor presses play. */
export default function LiteYouTube({ id, title, poster }: Props) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="lx-video-frame">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button type="button" className="lx-video-play" onClick={() => setPlaying(true)} aria-label={`Play video: ${title}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster} alt="" width={1280} height={720} loading="lazy" decoding="async" />
          <span className="lx-video-icon" aria-hidden="true">
            <svg viewBox="0 0 68 48" width="68" height="48"><path d="M66.5 7.7a8.5 8.5 0 0 0-6-6C55.2.3 34 .3 34 .3s-21.2 0-26.5 1.4a8.5 8.5 0 0 0-6 6C.1 13 .1 24 .1 24s0 11 1.4 16.3a8.5 8.5 0 0 0 6 6C12.8 47.7 34 47.7 34 47.7s21.2 0 26.5-1.4a8.5 8.5 0 0 0 6-6C67.9 35 67.9 24 67.9 24s0-11-1.4-16.3z" fill="#0b1f3a" fillOpacity=".85"/><path d="M27 34l18-10-18-10z" fill="#fff"/></svg>
          </span>
        </button>
      )}
    </div>
  );
}
