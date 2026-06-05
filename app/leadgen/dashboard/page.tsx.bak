/**
 * Saabai LeadGen — Dashboard (Wrapper with Suspense)
 *
 * Need a separate wrapper because useSearchParams() requires Suspense boundary.
 */

import { Suspense } from "react";
import DashboardContent from "./dashboard-content";

export default function LeadGenDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-saabai-gold border-t-transparent rounded-full" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
