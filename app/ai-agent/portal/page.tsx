import { Suspense } from "react";
import PortalClient from "./portal-client";

export const metadata = { title: "AI Agent Portal — Saabai" };

export default function Page() {
  return (
    <div className="min-h-screen bg-saabai-bg text-saabai-text font-[family-name:var(--font-geist-sans)]">
      <Suspense fallback={<div className="pt-40 text-center text-saabai-text-dim">Loading portal…</div>}>
        <PortalClient />
      </Suspense>
    </div>
  );
}
