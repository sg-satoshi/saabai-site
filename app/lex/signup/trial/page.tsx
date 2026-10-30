import type { Metadata } from "next";
import TrialForm from "./TrialForm";
import "../signup.css";

export const metadata: Metadata = { title: "Start your Lex free trial", robots: { index: false, follow: false } };

export default async function LexTrialPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="lxs">
      <div className="lxs-card">
        <h1>60-day free trial</h1>
        <p className="lede">
          Don&apos;t pay a cent until you&apos;ve tried it. 60 days free on the Firm plan: 3 lawyer seats and 20 documents a month, no card needed.
          We&apos;ll email you a link to confirm your address, and the trial starts when you open it. At the end you can choose to subscribe;
          we never move you to a paid plan automatically. If you don&apos;t subscribe, Lex is switched off and your Lex data
          is deleted 30 days later.
        </p>
        <TrialForm code={typeof sp.code === "string" ? sp.code.slice(0, 40) : ""} />
      </div>
    </main>
  );
}
