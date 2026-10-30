import type { Metadata } from "next";
import VerifyTrial from "./VerifyTrial";
import "../../signup.css";

export const metadata: Metadata = { title: "Start your Lex free trial", robots: { index: false, follow: false } };

export default async function VerifyTrialPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="lxs">
      <div className="lxs-card">
        <h1>Start your 60-day free trial</h1>
        <VerifyTrial token={typeof sp.token === "string" ? sp.token.slice(0, 64) : ""} />
      </div>
    </main>
  );
}
