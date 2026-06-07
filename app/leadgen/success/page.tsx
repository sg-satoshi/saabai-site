"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="min-h-screen bg-saabai-bg text-saabai-text flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold mb-2">Welcome to Saabai LeadGen!</h1>
        <p className="text-saabai-gold text-sm font-semibold mb-6">Your subscription is active</p>
        <p className="text-saabai-text-dim mb-8 leading-relaxed">
          Your account is being set up right now. You will receive an email with your unique widget embed code
          and login details for your dashboard within the next minute.
        </p>
        <div className="flex flex-col gap-3 mb-8">
          <a
            href="/leadgen"
            className="px-8 py-3 rounded-xl bg-saabai-gold text-black font-bold text-sm tracking-wide hover:brightness-125 transition-all"
          >
            Back to LeadGen
          </a>
          {sessionId && (
            <p className="text-xs text-saabai-text-dim">
              Session: {sessionId.slice(0, 12)}...
            </p>
          )}
        </div>
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
