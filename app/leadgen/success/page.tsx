import { Suspense } from "react";

export default function LeadGenSuccessPage() {
  return (
    <div className="min-h-screen bg-saabai-bg text-saabai-text flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold mb-4">Welcome aboard!</h1>
        <p className="text-saabai-text-dim mb-8">
          Your subscription is being set up. You’ll receive a confirmation email shortly with your widget embed code.
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
