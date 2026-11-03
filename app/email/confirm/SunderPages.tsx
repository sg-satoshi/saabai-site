/* SUNDER confirm page states (Designer r3b, copy from r2 COPY.md). Decorative images use alt="". */
import ShareSunder from "./ShareSunder";

const IMG = "/clients/sunder/img/confirm";
export const SUNDER_SITE = "https://sunder.com.au";
export const SUNDER_NEW_LINK = `${SUNDER_SITE}/#f`;

function Hero({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="hero">
      <div className="top"><img src={`${IMG}/sunder-lockup-colour-light.svg`} alt="SUNDER" /></div>
      <div className="grid">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          {children}
        </div>
        <div className="pass">
          <div className="row"><img className="m" src={`${IMG}/sunder-s-mark-colour-dark.svg`} alt="" /><span className="eyebrow" style={{ color: "#f2f2ee99" }}>Insider pass</span></div>
          <div className="t">Front row.<br />No queue.</div>
          <div style={{ fontSize: 15, color: "#f2f2eecc" }}>Split the game open.</div>
          <img className="peek" src={`${IMG}/sunder-mid-vector.svg`} alt="" />
          <div className="stub">Status: {eyebrow === "Confirmed" ? "confirmed" : "pending"}</div>
        </div>
      </div>
    </section>
  );
}

export function SunderPending({ action }: { action: React.ReactNode }) {
  return (
    <div className="sc pre">
      <Hero eyebrow="One more step">
        <h1 className="cap" style={{ marginTop: 14 }}>One tap and you&apos;re <span className="hl">in</span>.</h1>
        {action}
      </Hero>
    </div>
  );
}

export function SunderConfirmed() {
  return (
    <div className="sc">
      <Hero eyebrow="Confirmed">
        <h1 className="cap" style={{ marginTop: 14 }}>You&apos;re an <span className="hl">insider</span> now.</h1>
        <p className="sub">Welcome to the side of the net that hears it first. No spam, no filler. We only email when there&apos;s something worth opening.</p>
      </Hero>
      <section className="dark"><div className="in">
        <div className="eyebrow">What insiders get</div>
        <h2 className="cap">Your pass covers this.</h2>
        <div className="perks">
          <div className="perk"><div className="n">01</div><h3>Hear it first</h3><p>When SUNDER opens, insiders get the news before it goes anywhere else.</p></div>
          <div className="perk"><div className="n">02</div><h3>Behind the build</h3><p>Prototype shots, testing notes and the calls we&apos;re making on the paddle, as they happen.</p></div>
          <div className="perk"><div className="n">03</div><h3>Built to take hits</h3><p>Play hard.</p></div>
        </div>
        <div className="tease">
          <div><div className="eyebrow">Coming into focus</div><h3 style={{ marginTop: 12 }}>Something&apos;s taking shape.</h3><p>We&apos;re not showing it yet. The first proper look lands in your inbox, before anyone else sees it.</p></div>
          <div className="court"><img src={`${IMG}/sunder-pro-front-540h.png`} alt="" /><div className="tag">Split the game open.</div></div>
        </div>
        <div className="share">
          <div><h2 className="cap">Got a doubles partner?</h2><p>Send them the link. Better rallies start with better gear.</p></div>
          <div className="link"><code>sunder.com.au</code><ShareSunder /></div>
        </div>
        <div className="foot">
          <span>Change of heart? Every email has an unsubscribe link. Any giveaway runs under our <a href={`${SUNDER_SITE}/giveaway-terms`}>giveaway terms</a>.</span>
          <span>SUNDER is a trading name of Saabai Pty Ltd</span>
        </div>
      </div></section>
    </div>
  );
}

export function SunderError() {
  return (
    <div className="se"><div className="in2">
      <img className="lk" src={`${IMG}/sunder-lockup-colour-dark.svg`} alt="SUNDER" />
      <h1 className="cap">Let&apos;s go again.</h1>
      <p>That link is out of play. It may have expired or already been used. Pop your email in again and we&apos;ll send a fresh one.</p>
      <a className="btn" href={SUNDER_NEW_LINK}>Get a new link</a>
      <small>Already confirmed? You&apos;re still on the list. Nothing else to do.</small>
    </div></div>
  );
}

export function SunderUnsubscribed() {
  return (
    <div className="se"><div className="in2">
      <img className="lk" src={`${IMG}/sunder-lockup-colour-dark.svg`} alt="SUNDER" />
      <h1 className="cap off">You&apos;re off the list.</h1>
      <p>This address is unsubscribed, so we won&apos;t send marketing to it.</p>
      <a className="btn" href={SUNDER_NEW_LINK}>Join again</a>
    </div></div>
  );
}
