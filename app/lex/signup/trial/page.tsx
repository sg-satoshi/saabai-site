import type { Metadata } from "next";
import Nav from "../../../components/Nav";
import Footer from "../../../components/Footer";
import { LEX_TRIAL_CONTACT_COPY, LEX_TRIAL_MARKER_COPY } from "@/lib/lex-trial-copy";
import TrialForm from "./TrialForm";
import TrialDetails from "./TrialDetails";
import "./trial.css";

export const metadata: Metadata = { title: "Start your Lex free trial", robots: { index: false, follow: false } };

export default async function LexTrialPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="lxt">
      <Nav activePage="/legal" />
      <main className="lxt-main">
        <div className="lxt-wrap">
          <span className="lxt-badge">Lex by Saabai</span>
          <h1>Try Lex FREE for <span className="lxt-grad">60 days.</span></h1>
          <p className="lxt-lead">Don&apos;t pay a cent until you&apos;ve tried it. No card needed.</p>
          <div className="lxt-card">
            <TrialForm code={typeof sp.code === "string" ? sp.code.slice(0, 40) : ""} />
          </div>
          <p className="lxt-more">
            <TrialDetails contactCopy={LEX_TRIAL_CONTACT_COPY} markerCopy={LEX_TRIAL_MARKER_COPY} label="How the trial works, your data and terms" />
          </p>
        </div>
      </main>
      <Footer lex />
    </div>
  );
}
