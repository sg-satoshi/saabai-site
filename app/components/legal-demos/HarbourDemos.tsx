import LexDemoPanel from "./LexDemoPanel";
import VoiceDemo, { LachieLockup } from "../sb/VoiceDemo";

/** Website chat demo. Same Harbour Street Legal panel as /legal. */
export function LexWebsiteDemo() {
  return (
    <>
      <div className="lx-demo-grid">
        <div className="lx-head">
          <div className="lx-eyebrow">Website chatbot demo</div>
          <h2>A website chatbot demo, separate from Lex.</h2>
          <p className="lx-lead">This demo takes a new enquiry and answers a fee question. It does not book a consultation.</p>
          <p className="lx-demo-line">This is what a chatbot on your firm&apos;s own website would look like.</p>
          <p className="lx-demo-fine">Lex is the AI legal assistant for research and drafting. This demo is not that workspace. It does not search legislation or draft documents. It is an AI demo, not legal advice. Harbour Street Legal is an example firm, and nothing you type is sent to a lawyer.</p>
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

/** Phone demo. Lex is the legal assistant. Lachie is a browser voice demo only. */
export function LachieLegalDemo({ ready }: { ready: boolean }) {
  return (
    <div className="lx-demo-grid">
      <div className="lx-head">
        <div className="lx-eyebrow">Browser voice demo</div>
        <LachieLockup as="h2" second="Legend" descriptor="A browser demo of Saabai's AI voice receptionist." />
        <p className="lx-demo-line">Lex is the legal assistant on this page. Lachie is this browser demo, not a phone line. He is not the website chatbot above, and he is not the Lex research workspace.</p>
        <p className="lx-demo-fine">Harbour Street Legal is an example firm. Nothing you say is sent to a real firm.</p>
      </div>
      <div className="lx-lachie-demo">
        <VoiceDemo ready={ready} variant="legal" />
        <div className="lx-demo-cta">
          <p>Book a call if you want to hear how this demo could fit your firm.</p>
          <a className="lx-btn lx-pri" href="/contact">Talk to Saabai</a>
        </div>
      </div>
    </div>
  );
}
