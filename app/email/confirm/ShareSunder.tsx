"use client";
/* Plain share link: Web Share when available, else copy to clipboard. No referral params. */
import { useState } from "react";

const URL_ = "https://sunder.com.au";
const TEXT = "SUNDER pickleball paddles. Split the game open.";

export default function ShareSunder() {
  const [copied, setCopied] = useState(false);
  async function share(e: React.MouseEvent) {
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (nav?.share) {
      e.preventDefault();
      try { await nav.share({ title: "SUNDER", text: TEXT, url: URL_ }); } catch { /* cancelled */ }
      return;
    }
    if (nav?.clipboard) {
      e.preventDefault();
      try { await nav.clipboard.writeText(URL_); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.location.href = URL_; }
    }
  }
  return (
    <>
      <a className="btn" href={URL_} onClick={share}>Share SUNDER</a>
      <span className="toast" role="status" aria-live="polite">{copied ? "Copied" : ""}</span>
    </>
  );
}
