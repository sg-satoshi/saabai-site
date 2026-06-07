"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Script from "next/script";

function WidgetInner() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "bne-emergency-plumbing";

  return (
    <Script
      src={`https://www.saabai.ai/api/leadgen/widget?slug=${slug}`}
      strategy="afterInteractive"
    />
  );
}

export default function LeadGenWidgetPage() {
  return (
    <Suspense fallback={null}>
      <WidgetInner />
    </Suspense>
  );
}
