import type { Metadata } from "next";
import TrialForm from "./TrialForm";
import "../signup.css";

export const metadata: Metadata = { title: "Start your Lex free trial", robots: { index: false, follow: false } };

export default async function LexTrialPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="lxs">
      <div className="lxs-card">
        <h1>Start your free Lex trial</h1>
        <p className="lede">
          By invitation. 60 days free on the Firm plan: 3 lawyer seats and 20 documents a month. No card needed. At the end of the trial
          you can subscribe at $299 a month (AUD); if you don&apos;t, Lex is switched off and your Lex data is deleted 30 days later.
        </p>
        <TrialForm code={typeof sp.code === "string" ? sp.code.slice(0, 40) : ""} />
      </div>
    </main>
  );
}
