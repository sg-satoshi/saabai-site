/* SUNDER "Check my referrals" (sunder.com.au/referrals). Email in, status link out by email. */
import { SUNDER_SITE } from "../email/confirm/SunderPages";
import CheckForm from "./CheckForm";
import "../email/confirm/sunder-confirm.css";

export const metadata = { title: "Check my referrals | SUNDER", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default function Page() {
  return (
    <main><div className="se"><div className="in2">
      <a href={`${SUNDER_SITE}/`} aria-label="SUNDER home"><img className="lk" src="/clients/sunder/img/confirm/sunder-lockup-colour-dark.svg" alt="SUNDER" /></a>
      <div className="eyebrow" style={{ color: "#d4ff3a", marginTop: 36 }}>Your referrals</div>
      <h1 className="cap" style={{ marginTop: 12 }}>Check my referrals.</h1>
      <p>Enter the email you joined with. We&apos;ll email you your private link to see how many friends have joined and your bonus entries.</p>
      <CheckForm />
    </div></div></main>
  );
}
