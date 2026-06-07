"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const TIER_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const tier = searchParams.get("tier") || "Starter";
  const label = TIER_LABELS[tier] || tier;

  return (
    <div className="min-h-screen bg-saabai-bg text-saabai-text flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold mb-2">Thanks for your interest!</h1>
        <p className="text-saabai-gold text-sm font-semibold mb-6">{label} plan selected</p>
        <p className="text-saabai-text-dim mb-8">
          We&apos;ll reach out within 24 hours to get you set up. In the meantime, check out the live demo above.
        </p>
        <a
          href="/leadgen"
          className="inline-block px-8 py-3 rounded-xl bg-saabai-gold text-black font-bold text-sm tracking-wide hover:brightness-125 transition-all"
        >
          Back to LeadGen
        </a>
      </div>
    </div>
  );
}

export default function LeadGenSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-saabai-bg flex items-center justify-center">
        <div className="text-saabai-text-dim">Loading...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
