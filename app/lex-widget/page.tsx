"use client";

import LexWidget from "../components/LexWidget";

// Embeddable iframe page for Tributum Law website
// Embed: <iframe src="https://saabai.ai/lex-widget" style="position:fixed;bottom:0;right:0;width:420px;height:680px;border:none;z-index:9999;" />

export default function LexWidgetPage() {
  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
      `}</style>
      <LexWidget />
    </>
  );
}
