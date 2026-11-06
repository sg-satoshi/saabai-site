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
            <svg viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="47" fill="#0b092e" stroke="#fff" strokeWidth="3"/><path d="M40 30 L72 50 L40 70 Z" fill="#fff"/></svg>
          </span>
        </button>
      )}
    </div>
  );
}
