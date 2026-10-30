import type { Metadata } from "next";
import FirmPlan from "../_components/FirmPlan";
import "../signup/signup.css";

export const metadata: Metadata = { title: "Lex: Firm plan billing", robots: { index: false, follow: false } };

/** Signed-in page (behind the /lex session gate) that works even when Lex has lapsed, so an owner can always pay. */
export default function LexBilling() {
  return (
    <main className="lxs">
      <div className="lxs-card">
        <h1>Firm plan</h1>
        <FirmPlan fallback={<p className="lede">There&apos;s no Lex Firm plan on this login. If you think that&apos;s wrong, write to hello@saabai.ai.</p>} />
        <p className="note"><a href="/lex">Back to Lex</a></p>
      </div>
    </main>
  );
}
