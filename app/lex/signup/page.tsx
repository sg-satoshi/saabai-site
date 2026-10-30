import { GST } from "@/lib/entity";
import type { Metadata } from "next";
import SignupForm from "./SignupForm";
import "./signup.css";

export const metadata: Metadata = { title: "Start Lex: Firm plan", robots: { index: false, follow: false } };

export default async function LexSignupPage({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="lxs">
      <div className="lxs-card">
        <h1>Start Lex</h1>
        <p className="lede">
          Firm plan: $299 a month for 3 lawyer seats. Billed monthly. Cancel anytime. When you cancel, Lex stays on until the end of the
          month you&apos;ve paid for, and we don&apos;t refund part months. {GST.pricesLine}
        </p>
        {sp.cancelled ? <p className="err">Checkout was cancelled. Nothing was charged. You can try again below.</p> : null}
        <SignupForm />
      </div>
    </main>
  );
}
