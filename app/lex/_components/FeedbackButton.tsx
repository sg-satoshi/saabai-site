"use client";
/** "Report an issue / Suggest a feature" on every signed-in Lex screen. Light mode, navy button. */
import { useState } from "react";
import { usePathname } from "next/navigation";

const navy: React.CSSProperties = { background: "#1b2559", color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const TYPES = [{ k: "bug", l: "Report a bug" }, { k: "idea", l: "Suggest an idea" }, { k: "question", l: "Ask a question" }] as const;
const MAX_SIDE = 1600;

/** Downsizes an image to a JPEG data URL so it fits the upload limit (1.5 MB). */
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    for (const q of [0.8, 0.6, 0.4]) { const d = c.toDataURL("image/jpeg", q); if (d.length <= 1_500_000) return d; }
    throw new Error("too big");
  } finally { URL.revokeObjectURL(url); }
}

export default function FeedbackButton() {
  const path = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"bug" | "idea" | "question">("bug");
  const [message, setMessage] = useState("");
  const [shot, setShot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (path.startsWith("/lex/signup")) return null; // public signup pages: no login yet

  async function pick(f: File | undefined) {
    setMsg(null);
    if (!f) { setShot(null); return; }
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { setMsg("Screenshots must be PNG, JPEG or WebP."); return; }
    try { setShot(await shrink(f)); } catch { setMsg("That image is too large. Try a smaller screenshot."); }
  }

  async function send() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/lex-feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, message, screenshot: shot, page: path + (typeof window !== "undefined" ? window.location.hash : "") }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(d.error || "Could not send"); setBusy(false); return; }
      setMessage(""); setShot(null); setMsg("Thanks, we've got it. The Saabai team reads every report.");
    } catch { setMsg("Could not send"); }
    setBusy(false);
  }

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setMsg(null); }} aria-haspopup="dialog"
        style={{ position: "fixed", right: 16, bottom: 96, zIndex: 60, ...navy, padding: "6px 12px", fontSize: 12, borderRadius: 999, boxShadow: "0 4px 14px rgba(27,37,89,.25)" }}>
        Report an issue / Suggest a feature
      </button>
      {open ? (
        <div role="dialog" aria-modal="true" aria-label="Report an issue or suggest a feature" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(20,23,43,.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", color: "#14172b", borderRadius: 14, padding: 22, width: "100%", maxWidth: 480, fontSize: 14 }}>
            <h2 style={{ fontSize: 17, margin: "0 0 10px" }}>Report an issue or suggest a feature</h2>
            <div role="radiogroup" style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              {TYPES.map((t) => (
                <button key={t.k} type="button" role="radio" aria-checked={type === t.k} onClick={() => setType(t.k)}
                  style={{ borderRadius: 999, padding: "5px 12px", fontSize: 13, cursor: "pointer", border: "1px solid #1b2559", background: type === t.k ? "#1b2559" : "#fff", color: type === t.k ? "#fff" : "#1b2559" }}>{t.l}</button>
              ))}
            </div>
            <label htmlFor="lex-fb-msg" style={{ fontSize: 13, fontWeight: 600 }}>What happened, or what would help?</label>
            <textarea id="lex-fb-msg" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} rows={5}
              style={{ width: "100%", boxSizing: "border-box", marginTop: 6, border: "1px solid #cfd4dd", borderRadius: 8, padding: 10, fontSize: 14, fontFamily: "inherit" }} />
            <p style={{ fontSize: 12, color: "#b42318", margin: "6px 0 10px" }}>Please don&apos;t include client names or other details that identify a client, in the text or the screenshot.</p>
            <label style={{ fontSize: 13 }}>Screenshot <span style={{ color: "#7a8191" }}>(optional)</span>{" "}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => pick(e.target.files?.[0])} />
            </label>
            {shot ? <p style={{ fontSize: 12, color: "#555d6e", margin: "6px 0 0" }}>Screenshot attached. <button type="button" onClick={() => setShot(null)} style={{ background: "none", border: 0, color: "#1b2559", cursor: "pointer", textDecoration: "underline" }}>Remove</button></p> : null}
            <p style={{ fontSize: 12, color: "#7a8191", margin: "10px 0 0" }}>We also record this page, your firm, your login, your browser and the Lex version, to help us fix things.</p>
            {msg ? <p role="status" style={{ fontSize: 13, color: "#1b2559" }}>{msg}</p> : null}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button type="button" onClick={() => setOpen(false)} style={{ background: "#fff", color: "#1b2559", border: "1px solid #cfd4dd", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>Close</button>
              <button type="button" style={navy} disabled={busy || message.trim().length < 3} onClick={send}>{busy ? "Sending…" : "Send"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
