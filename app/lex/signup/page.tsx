import type { Metadata } from "next";
import { cookies } from "next/headers";
import SignupForm from "./SignupForm";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { LEX_FIRM_PRICE_LABEL } from "@/lib/lex-terms";
import "./signup.css";

export const metadata: Metadata = { title: "Start Lex: Firm plan", robots: { index: false, follow: false } };

export default async function LexSignupPage({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const sp = await searchParams;
  // The Lex price is not published yet (Shane, 30 Oct 2026). Signed-in firms still see the full price before any payment.
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const signedIn = !!(token && (await verifySessionToken(token)));
  return (
    <main className="lxs">
      <div className="lxs-card">
        <h1>Start Lex</h1>
        {signedIn ? (
          <p className="lede">
            Firm plan: {LEX_FIRM_PRICE_LABEL || "$299 a month (AUD, GST not applicable)"} for 3 lawyer seats. Billed monthly. Cancel anytime. When you cancel, Lex stays on until the end of the
            month you&apos;ve paid for, and we don&apos;t refund part months.
          </p>
        ) : (
          <p className="lede">
            Lex starts with a 60-day free trial, no card needed. Pricing is set after the trial; you choose whether to subscribe.{" "}
            <a href="/legal">Learn more about Lex</a>.
          </p>
        )}
        {sp.cancelled ? <p className="err">Checkout was cancelled. Nothing was charged. You can try again below.</p> : null}
        <SignupForm />
      </div>
    </main>
  );
}
