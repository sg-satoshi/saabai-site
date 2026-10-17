"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { isSafeHref, sanitizeRich, visibleText } from "../../../lib/announce/rich";

type Active = { b: boolean; i: boolean; u: boolean; s: boolean };
const btn = { height: 30, minWidth: 30, padding: "0 8px", border: "1px solid var(--n-300)", borderRadius: 6, background: "#fff", color: "var(--n-900)", cursor: "pointer", fontSize: 13 } as const;

/**
 * Small WYSIWYG editor for announcement text: bold, italic, underline, strikethrough, text colour (hex) and links.
 * It edits a single line. Every change is passed through the same whitelist sanitiser the server uses, so what is stored
 * is always the safe subset. Paste is plain text. The character count is visible text only.
 */
export default function RichEditor({ id, value, onChange, max, label, invalid, describedBy, testId }: { id: string; value: string; onChange: (html: string) => void; max: number; label: string; invalid?: boolean; describedBy?: string; testId?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef<string>("");
  const saved = useRef<Range | null>(null);
  const [active, setActive] = useState<Active>({ b: false, i: false, u: false, s: false });
  const [colour, setColour] = useState("#fde047");
  const [colourErr, setColourErr] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [urlErr, setUrlErr] = useState("");

  // Load external changes (editing another announcement) without disturbing the caret while typing.
  useEffect(() => {
    if (ref.current && value !== last.current) { ref.current.innerHTML = sanitizeRich(value); last.current = sanitizeRich(value); }
  }, [value]);

  const emit = useCallback(() => {
    if (!ref.current) return;
    const clean = sanitizeRich(ref.current.innerHTML);
    last.current = clean; onChange(clean);
  }, [onChange]);
  const refresh = useCallback(() => {
    try { setActive({ b: document.queryCommandState("bold"), i: document.queryCommandState("italic"), u: document.queryCommandState("underline"), s: document.queryCommandState("strikeThrough") }); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    const on = () => { const sel = window.getSelection(); if (sel && sel.rangeCount && ref.current?.contains(sel.anchorNode)) { saved.current = sel.getRangeAt(0).cloneRange(); refresh(); } };
    document.addEventListener("selectionchange", on);
    return () => document.removeEventListener("selectionchange", on);
  }, [refresh]);

  const restore = () => {
    ref.current?.focus();
    const sel = window.getSelection();
    if (sel && saved.current) { sel.removeAllRanges(); sel.addRange(saved.current); }
  };
  const run = (cmd: string, arg?: string) => {
    restore();
    try { document.execCommand("styleWithCSS", false, "false"); document.execCommand(cmd, false, arg); } catch { /* ignore */ }
    emit(); refresh();
  };
  const keep = (e: React.MouseEvent) => e.preventDefault(); // keep the text selection when pressing toolbar buttons
  const applyColour = () => {
    const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(colour.trim());
    if (!m) { setColourErr("Use a hex colour like #fde047."); return; }
    setColourErr(""); run("foreColor", colour.trim());
  };
  const applyLink = () => {
    const u = url.trim();
    if (!isSafeHref(u)) { setUrlErr("Use a site path (/book), an https URL, tel: or mailto:."); return; }
    setUrlErr(""); run("createLink", u); setLinkOpen(false); setUrl("");
  };
  const count = visibleText(value).length;
  const over = count > max;
  const tb = (on: boolean, cmd: string, text: React.ReactNode, aria: string, style?: React.CSSProperties) => (
    <button type="button" className="rt-btn" style={{ ...btn, ...(on ? { background: "var(--navy-900)", color: "#fff", borderColor: "var(--navy-900)" } : {}), ...style }} aria-label={aria} aria-pressed={on} title={aria} onMouseDown={keep} onClick={() => run(cmd)}>{text}</button>
  );
  return (
    <div>
      <div role="toolbar" aria-label={`${label} formatting`} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", margin: "4px 0 6px" }}>
        {tb(active.b, "bold", <b>B</b>, "Bold")}
        {tb(active.i, "italic", <i>I</i>, "Italic")}
        {tb(active.u, "underline", <u>U</u>, "Underline")}
        {tb(active.s, "strikeThrough", <s>S</s>, "Strikethrough")}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 6 }}>
          <input type="color" aria-label="Text colour picker" value={/^#[0-9a-fA-F]{6}$/.test(colour) ? colour : "#000000"} onMouseDown={keep} onChange={(e) => setColour(e.target.value)} style={{ width: 30, height: 30, padding: 0, border: "1px solid var(--n-300)", borderRadius: 6, background: "none" }} />
          <input aria-label="Text colour hex" data-testid="rt-colour" value={colour} maxLength={7} onChange={(e) => setColour(e.target.value)} placeholder="#fde047" style={{ width: 84, height: 30, padding: "0 8px", border: `1px solid ${colourErr ? "var(--bad)" : "var(--n-300)"}`, borderRadius: 6, fontSize: 13, background: "#fff", color: "var(--n-900)" }} />
          <button type="button" className="rt-btn" style={btn} onMouseDown={keep} onClick={applyColour} data-testid="rt-colour-apply" aria-label="Apply text colour to selection">Colour</button>
        </span>
        <button type="button" className="rt-btn" style={btn} onMouseDown={keep} onClick={() => { setLinkOpen((v) => !v); setUrlErr(""); }} aria-expanded={linkOpen} data-testid="rt-link">Link</button>
        <button type="button" className="rt-btn" style={btn} onMouseDown={keep} onClick={() => run("unlink")} aria-label="Remove link from selection">Unlink</button>
        <button type="button" className="rt-btn" style={btn} onMouseDown={keep} onClick={() => { run("removeFormat"); }} aria-label="Clear formatting on selection">Clear</button>
        <span style={{ marginLeft: "auto", fontSize: 12, color: over ? "var(--bad)" : "var(--n-500)" }} aria-live="polite">{count}/{max} visible characters</span>
      </div>
      {colourErr && <span role="alert" style={{ color: "var(--bad)", fontSize: 12.5, display: "block", marginBottom: 4 }}>{colourErr}</span>}
      {linkOpen && (
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
          <input aria-label="Link URL for selected text" data-testid="rt-link-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/book or https://..." style={{ flex: 1, minWidth: 180, height: 30, padding: "0 8px", border: `1px solid ${urlErr ? "var(--bad)" : "var(--n-300)"}`, borderRadius: 6, fontSize: 13, background: "#fff", color: "var(--n-900)" }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyLink(); } }} />
          <button type="button" className="rt-btn" style={btn} onMouseDown={keep} onClick={applyLink} data-testid="rt-link-apply">Add link</button>
          {urlErr && <span role="alert" style={{ color: "var(--bad)", fontSize: 12.5, flexBasis: "100%" }}>{urlErr}</span>}
        </div>
      )}
      <div
        ref={ref} id={id} data-testid={testId} role="textbox" aria-multiline="false" aria-label={label} contentEditable suppressContentEditableWarning
        aria-invalid={invalid ? true : undefined} aria-describedby={describedBy} spellCheck
        onInput={emit} onBlur={emit} onKeyUp={refresh} onMouseUp={refresh}
        onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
        onPaste={(e) => { e.preventDefault(); const t = e.clipboardData.getData("text/plain").replace(/\s+/g, " "); document.execCommand("insertText", false, t); }}
        style={{ minHeight: 38, padding: "8px 10px", borderRadius: "var(--r-md)", border: `1px solid ${invalid ? "var(--bad)" : "var(--n-300)"}`, boxShadow: invalid ? "0 0 0 1px var(--bad)" : "none", background: invalid ? "var(--bad-bg)" : "#fff", color: "var(--n-900)", fontSize: 14, lineHeight: "22px", outline: "none" }}
      />
    </div>
  );
}
