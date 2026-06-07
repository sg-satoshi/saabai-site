"use client";

import { useSearchParams } from "next/navigation";
import Script from "next/script";

export default function LeadGenWidgetPage() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "bne-emergency-plumbing";

  return (
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "transparent" }}>
        <Script
          src={`https://www.saabai.ai/api/leadgen/widget?slug=${slug}`}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
