"use client";

import { useState } from "react";

// TODO: real logo — using /sites/cycle-repair/stus-logo-v2.png (transparent PNG, ~2.36:1).
// Falls back to a text wordmark if the image fails to load.
export function Logo({
  className,
  width,
  height,
}: {
  className?: string;
  width: number;
  height: number;
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
      src="/sites/cycle-repair/stus-logo-v2.png"
      alt="Stu's Cycle Repairs"
      width={width}
      height={height}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
