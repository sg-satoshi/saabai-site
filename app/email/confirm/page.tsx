import { readEmailToken } from "../../../lib/email/tokens";
import ConfirmNow from "./ConfirmNow";
import "../../components/growth/public.css";

export const metadata = { title: "Confirm your email | SUNDER", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t = "" } = await searchParams;
  const parsed = readEmailToken(t, process.env.SAABAI_SESSION_SECRET || "", "confirm");
  return (
    <main className="gp">
      <div className="gp-card">
        <div className="gp-eyebrow">SUNDER</div>
        <h1>Confirm your email</h1>
        {parsed ? (
          <>
            <p>Confirm <b>{parsed.e}</b> and we'll send SUNDER launch news to it. Until you do, you won't get marketing.</p>
            <ConfirmNow token={t} />
          </>
        ) : (
          <p>This confirmation link is missing or has expired. Join the waitlist again and we'll send a fresh one.</p>
        )}
      </div>
    </main>
  );
}
