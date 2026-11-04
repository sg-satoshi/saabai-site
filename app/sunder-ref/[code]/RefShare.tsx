"use client";
import { useState } from "react";

export default function RefShare({ url }: { url: string }) {
  const [msg, setMsg] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText(url); setMsg("Copied"); } catch { setMsg("Copy failed"); }
    setTimeout(() => setMsg(""), 2000);
  }
  async function share() {
    if (navigator.share) { try { await navigator.share({ title: "SUNDER", text: "SUNDER pickleball paddles. Split the game open.", url }); } catch { /* cancelled */ } return; }
    await copy();
  }
  return (
    <>
      <button type="button" className="btn" onClick={copy}>Copy</button>
      <button type="button" className="btn" onClick={share}>Share</button>
      <span className="toast" role="status" aria-live="polite">{msg}</span>
    </>
  );
}
