import LexDemoPanel from "./LexDemoPanel";
import VoiceDemo, { LachieLockup } from "../sb/VoiceDemo";

/** Website chat demo. Same Harbour Street Legal panel as /legal. */
export function LexWebsiteDemo() {
  return (
    <>
      <div className="lx-demo-grid">
        <div className="lx-head">
          <div className="lx-eyebrow">Live demo</div>
          <h2>Talk to Lex the way your clients would.</h2>
          <p className="lx-lead">Lex takes a new enquiry, answers a fee question and books a consult inside this demo.</p>
          <p className="lx-demo-line">This is what a chatbot on your firm&apos;s own website would look like.</p>
          <p className="lx-demo-fine">It is an AI demo, not legal advice. Harbour Street Legal is an example firm, and nothing you type is sent to a lawyer.</p>
        </div>
        <LexDemoPanel />
      </div>
      <div className="lx-demo-cta">
        <p>Want this on your firm&apos;s website? We will shape it around your practice areas and how you book.</p>
        <a className="lx-btn lx-pri" href="/contact">Talk to Saabai</a>
      </div>
    </>
  );
}

/** Phone demo. Lex handles website chat. Lachie answers the phones. */
export function LachieLegalDemo({ ready }: { ready: boolean }) {
  return (
    <div className="lx-demo-grid">
      <div className="lx-head">
        <div className="lx-eyebrow">Phone demo</div>
        <LachieLockup as="h2" second="Legal" descriptor="Your AI phone answering service. He picks up when you can't." />
        <p className="lx-demo-line">Lex is the website chat. Lachie Legal answers the phone.</p>
        <p className="lx-demo-fine">Harbour Street Legal is an example firm. Nothing you say is sent to a real firm.</p>
      </div>
      <div className="lx-lachie-demo">
        <VoiceDemo ready={ready} variant="legal" />
        <div className="lx-demo-cta">
          <p>Want Lachie answering your firm&apos;s phones? Book a call and we will show you how it fits.</p>
          <a className="lx-btn lx-pri" href="/contact">Talk to Saabai</a>
        </div>
      </div>
    </div>
  );
}
