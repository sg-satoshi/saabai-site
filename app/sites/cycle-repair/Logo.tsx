"use client";

import { useState } from "react";

// Wordmark WebP (~18 KB). Header loads it once; the footer copy is lazy so
// the same file is not fetched again during the first paint.
// Falls back to a text wordmark if the image fails to load.
export function Logo({
  className,
  width,
  height,
  loading = "eager",
}: {
  className?: string;
  width: number;
  height: number;
  loading?: "eager" | "lazy";
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="font-display font-semibold text-brand tracking-tight text-lg sm:text-xl whitespace-nowrap">
        Stu&apos;s Cycle Repairs
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/sites/cycle-repair/stus-logo.webp"
      alt="Stu's Cycle Repairs"
      width={width}
      height={height}
      className={className}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
