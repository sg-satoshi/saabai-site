import type { Metadata } from "next";
import "../signup.css";

export const metadata: Metadata = { title: "Lex: payment received", robots: { index: false, follow: false } };

export default function LexSignupDone() {
  return (
    <main className="lxs">
      <div className="lxs-card">
        <h1>Thanks, you&apos;re in</h1>
        <p className="lede">
          We&apos;re setting up your Lex login now. Check your inbox in the next few minutes for an email to choose your password.
          If you already have a Saabai login, just sign in and open Lex.
        </p>
        <a className="btn" href="/login?redirect=/lex">Sign in to Lex</a>
        <p className="note">No email after 10 minutes? Write to hello@saabai.ai and we&apos;ll sort it out.</p>
      </div>
    </main>
  );
}
