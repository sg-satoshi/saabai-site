/* SUNDER private referral status (sunder.com.au/r/<code>). Counts only: no names, no emails, no login. */
import { referralStatsByCode } from "../../../lib/sunder-waitlist";
import { SUNDER_SITE, SUNDER_NEW_LINK } from "../../email/confirm/SunderPages";
import RefShare from "./RefShare";
import "../../email/confirm/sunder-confirm.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your referrals | SUNDER", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

const IMG = "/clients/sunder/img/confirm";

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toLowerCase();
  let stats = null;
  try {
    const { serviceClient } = await import("../../../lib/agent-supabase");
    stats = await referralStatsByCode(serviceClient(), code);
  } catch { stats = null; }
  if (!stats) {
    return (
      <main><div className="se"><div className="in2">
        <a href={`${SUNDER_SITE}/`} aria-label="SUNDER home"><img className="lk" src={`${IMG}/sunder-lockup-colour-dark.svg`} alt="SUNDER" /></a>
        <h1 className="cap">Out of bounds.</h1>
        <p>We can&apos;t find that referral link. Check it matches the one in your SUNDER emails.</p>
        <a className="btn" href={SUNDER_NEW_LINK}>Join the VIP list</a>
      </div></div></main>
    );
  }
  const link = `${SUNDER_SITE}/?r=${stats.code}`;
  const entries = stats.entries;
  return (
    <main><div className="sc">
      <section className="hero">
        <div className="top"><a href={`${SUNDER_SITE}/`} aria-label="SUNDER home"><img src={`${IMG}/sunder-lockup-colour-light.svg`} alt="SUNDER" /></a></div>
        <div className="grid">
          <div>
            <div className="eyebrow">Your referrals</div>
            <h1 className="cap" style={{ marginTop: 14 }}><span className="hl">{stats.friends}</span> {stats.friends === 1 ? "friend" : "friends"} joined</h1>
            <p className="sub">Every friend who joins with your link and confirms their email gets you a bonus giveaway entry. No limit.</p>
          </div>
          <div className="pass">
            <div className="row"><img className="m" src={`${IMG}/sunder-s-mark-colour-dark.svg`} alt="" /><span className="eyebrow" style={{ color: "#f2f2ee99" }}>Bonus entries</span></div>
            <div className="t">{entries} {entries === 1 ? "entry" : "entries"}</div>
            <div style={{ fontSize: 15, color: "#f2f2eecc" }}>Split the game open.</div>
            <img className="peek" src={`${IMG}/sunder-mid-vector.svg`} alt="" />
            <div className="stub">{entries ? "Keep them coming" : "Share your link to start"}</div>
          </div>
        </div>
        <div className="share">
          <div><h2 className="cap">Your link</h2><p>Send it to your doubles partner, your club, your group chat.</p></div>
          <div className="link"><code>{link.replace("https://", "")}</code><RefShare url={link} /></div>
        </div>
      </section>
    </div></main>
  );
}
