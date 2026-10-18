"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { LIMITS, POSITIONS, TONES, TONE_LABEL, canRemovePoweredBy, poweredByVisible, isHex, type Faq, type PublicWidgetConfig, type Tone } from "../../../lib/chatbot/core";
import { installSnippet } from "../../../lib/chatbot/seed-shared";
import { contrast } from "../../../lib/announce/core";

export type EditorRow = {
  slug: string; name: string; plan: string;
  skin: { showPoweredBy?: boolean };
  resolved: PublicWidgetConfig;
  tone: Tone; knowledge: { facts: string; faqs: Faq[] };
};

const css = `
.ce{display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:20px;margin-top:14px;padding-top:14px;border-top:1px solid #e6e6ef}
.ce h3{margin:0 0 8px;font:600 13px Inter,system-ui,sans-serif;color:var(--n-900)}
.ce fieldset{border:0;padding:0;margin:0 0 16px}
.ce label{display:block;font-size:12px;color:var(--n-600);margin:0 0 10px}
.ce input[type=text],.ce textarea,.ce select{display:block;width:100%;margin-top:4px;padding:6px 8px;border:1px solid var(--n-200);border-radius:8px;font:400 13px Inter,system-ui,sans-serif;background:#fff;color:var(--n-900);box-sizing:border-box}
.ce textarea{min-height:110px;resize:vertical}
.ce .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ce .col{display:flex;align-items:center;gap:8px;margin-top:4px}
.ce .col input[type=color]{width:36px;height:32px;padding:2px;border:1px solid var(--n-200);border-radius:8px;background:#fff;cursor:pointer;flex:none}
.ce .col input[type=text]{margin-top:0;font-family:var(--mono,monospace)}
.ce .err{color:#b42318;font-size:12px;margin-top:3px}
.ce .hint{color:var(--n-500);font-size:12px;margin:2px 0 8px}
.ce .warn{color:#8a5a00;font-size:12px;margin-top:3px}
.ce .faq{border:1px solid #e6e6ef;border-radius:8px;padding:8px;margin:0 0 8px;background:#fafafe}
.ce .bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px}
.ce .pv{position:sticky;top:12px;align-self:start}
.ce .pvbox{border:1px solid #e6e6ef;border-radius:12px;overflow:hidden;background:#fff}
.ce .pvtools{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px}
.ce .seg{height:28px;padding:0 10px;border:1px solid var(--n-200);border-radius:999px;background:#fff;font:600 12px Inter,system-ui,sans-serif;color:var(--n-700);cursor:pointer}
.ce .seg[aria-pressed=true]{background:var(--navy-900);border-color:var(--navy-900);color:#fff}
.ce iframe{display:block;border:0;height:600px;margin:0 auto;background:transparent;max-width:100%}
.ce code{display:block;padding:8px;background:#0b092e;color:#d6f3f6;border-radius:8px;font:12px/1.5 var(--mono,monospace);white-space:pre-wrap;word-break:break-all}
@media (max-width:980px){.ce{grid-template-columns:1fr}.ce .pv{position:static}.ce .two{grid-template-columns:1fr}}
`;

type Draft = { botName: string; greeting: string; avatarUrl: string; primary: string; accent: string; bg: string; text: string; position: "left" | "right"; showPoweredBy: boolean; tone: Tone; facts: string; faqs: Faq[] };

const toDraft = (r: EditorRow): Draft => ({
  botName: r.resolved.botName, greeting: r.resolved.greeting, avatarUrl: r.resolved.avatarUrl, primary: r.resolved.primary, accent: r.resolved.accent, bg: r.resolved.bg, text: r.resolved.text,
  position: r.resolved.position, showPoweredBy: r.skin.showPoweredBy !== false, tone: r.tone, facts: r.knowledge.facts, faqs: r.knowledge.faqs.length ? r.knowledge.faqs : [],
});

export default function ChatbotEditor({ row, onSaved }: { row: EditorRow; onSaved: () => Promise<void> | void }) {
  const [d, setD] = useState<Draft>(() => toDraft(row));
  const [saved, setSaved] = useState<Draft>(() => toDraft(row));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [width, setWidth] = useState<"desktop" | "mobile">("desktop");
  const [back, setBack] = useState<"light" | "dark" | "photo">("light");
  const [showOff, setShowOff] = useState(false);
  const [copied, setCopied] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const dirty = JSON.stringify(d) !== JSON.stringify(saved);
  const canHide = canRemovePoweredBy(row.plan as never);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const pub: PublicWidgetConfig = useMemo(() => ({
    ...row.resolved, botName: d.botName.trim() || row.name, greeting: d.greeting.trim() || `Hi! I'm ${d.botName.trim() || row.name}. How can I help you today?`, avatarUrl: d.avatarUrl.trim(),
    primary: isHex(d.primary) ? d.primary : row.resolved.primary, accent: isHex(d.accent) ? d.accent : row.resolved.accent, bg: isHex(d.bg) ? d.bg : row.resolved.bg, text: isHex(d.text) ? d.text : row.resolved.text,
    position: d.position, poweredBy: poweredByVisible(row.plan as never, d.showPoweredBy),
  }), [d, row]);

  function push() { frame.current?.contentWindow?.postMessage({ type: "saabai-chat-config", config: pub, open: true, showOff }, "*"); }
  useEffect(() => {
    const on = (e: MessageEvent) => { if (e.source === frame.current?.contentWindow && e.data?.type === "saabai-chat-ready") { ready.current = true; push(); } };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pub, showOff]);
  useEffect(() => { if (ready.current) push(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pub, showOff]);

  async function post(body: Record<string, unknown>) {
    const r = await fetch("/api/admin/chatbots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: row.slug, ...body }) });
    return { ok: r.ok, j: await r.json().catch(() => ({})) as { error?: string; fields?: Record<string, string> } };
  }
  async function save() {
    setBusy(true); setMsg(""); setErrs({});
    const skin: Record<string, unknown> = { botName: d.botName, greeting: d.greeting, avatarUrl: d.avatarUrl, primary: d.primary, accent: d.accent, bg: d.bg, text: d.text, position: d.position };
    if (canHide) skin.showPoweredBy = d.showPoweredBy;
    const a = await post({ action: "save_all", skin, content: { tone: d.tone, facts: d.facts, faqs: d.faqs } });
    if (!a.ok) { setErrs(a.j.fields ?? {}); setMsg(a.j.error || "Couldn't save."); setBusy(false); return; }
    setSaved(d); setMsg("Saved. The live widget picks it up within about a minute."); await onSaved(); setBusy(false);
  }

  const lowContrast = (fg: string, bgc: string) => isHex(fg) && isHex(bgc) && contrast(fg, bgc) < 4.5;
  const err = (k: string) => (errs[k] ? <div className="err" role="alert">{errs[k]}</div> : null);
  const colour = (k: "primary" | "accent" | "bg" | "text", label: string) => (
    <label key={k}>{label}
      <span className="col">
        <input type="color" aria-label={`${label} colour picker`} value={isHex(d[k]) ? d[k] : "#000000"} onChange={(e) => set(k, e.target.value)} data-testid={`color-${k}`} />
        <input type="text" aria-label={`${label} hex`} maxLength={7} value={d[k]} onChange={(e) => set(k, e.target.value)} data-testid={`hex-${k}`} style={{ borderColor: isHex(d[k]) ? undefined : "#d93a2b" }} />
      </span>{err(k)}
    </label>
  );
  const snippet = installSnippet(row.slug);
  const bgStyle = back === "dark" ? "#14123a" : back === "photo" ? "linear-gradient(135deg,#9bb7d4,#e8d5b5)" : "#f3f4f8";

  return (
    <div className="ce" data-testid={`editor-${row.slug}`}>
      <style>{css}</style>
      <div>
        <fieldset>
          <h3>Look</h3>
          <div className="two">
            <label>Bot name<input type="text" maxLength={40} value={d.botName} onChange={(e) => set("botName", e.target.value)} data-testid="f-botName" />{err("botName")}</label>
            <label>Position<select value={d.position} onChange={(e) => set("position", e.target.value as "left" | "right")} data-testid="f-position">{POSITIONS.map((p) => <option key={p} value={p}>{p === "right" ? "Bottom right" : "Bottom left"}</option>)}</select>{err("position")}</label>
          </div>
          <label>Greeting<textarea style={{ minHeight: 60 }} maxLength={300} value={d.greeting} onChange={(e) => set("greeting", e.target.value)} data-testid="f-greeting" />{err("greeting")}</label>
          <label>Avatar image link (https)<input type="text" placeholder="https://..." value={d.avatarUrl} onChange={(e) => set("avatarUrl", e.target.value)} data-testid="f-avatarUrl" />{err("avatarUrl")}</label>
          <div className="two">
            {colour("primary", "Header and your bubbles")}
            {colour("accent", "Accent and button ring")}
            {colour("bg", "Chat background")}
            {colour("text", "Text")}
          </div>
          {lowContrast(d.text, d.bg) && <div className="warn" role="status">Text and background are hard to read together. Try a darker text colour.</div>}
          {lowContrast("#ffffff", d.primary) && <div className="warn" role="status">White text on the header colour is hard to read. Try a darker header colour.</div>}
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
            <input type="checkbox" checked={poweredByVisible(row.plan as never, d.showPoweredBy)} disabled={!canHide} onChange={(e) => set("showPoweredBy", e.target.checked)} data-testid="f-powered" />
            Show &quot;Powered by Saabai&quot;
          </label>
          <div className="hint">{canHide ? "You can switch this line off on this plan." : "Always shown on the Presence plan. It can be removed on Growth and Signature."}</div>{err("showPoweredBy")}
        </fieldset>

        <fieldset>
          <h3>Personality and knowledge</h3>
          <label>Tone<select value={d.tone} onChange={(e) => set("tone", e.target.value as Tone)} data-testid="f-tone">{TONES.map((t) => <option key={t} value={t}>{TONE_LABEL[t]}</option>)}</select>{err("tone")}</label>
          <label>Business facts the bot can use (hours, services, prices, areas, policies)
            <textarea value={d.facts} maxLength={LIMITS.facts} onChange={(e) => set("facts", e.target.value)} data-testid="f-facts" />
          </label>
          <div className="hint">{d.facts.length} of {LIMITS.facts} characters. Plain text. The bot is told not to invent anything else.</div>{err("facts")}
          <h3 style={{ marginTop: 12 }}>Questions and approved answers</h3>
          {d.faqs.map((f, i) => (
            <div className="faq" key={i}>
              <label>Question<input type="text" maxLength={LIMITS.q} value={f.q} onChange={(e) => set("faqs", d.faqs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} data-testid={`faq-q-${i}`} /></label>
              <label>Answer<textarea style={{ minHeight: 56 }} maxLength={LIMITS.a} value={f.a} onChange={(e) => set("faqs", d.faqs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} data-testid={`faq-a-${i}`} /></label>
              <button type="button" className="btn sm" onClick={() => set("faqs", d.faqs.filter((_, j) => j !== i))}>Remove</button>
              {err(`faq${i}`)}
            </div>
          ))}
          {err("faqs")}
          <button type="button" className="btn sm" disabled={d.faqs.length >= LIMITS.faqs} onClick={() => set("faqs", [...d.faqs, { q: "", a: "" }])} data-testid="faq-add">Add a question</button>
        </fieldset>

        <fieldset>
          <h3>Install on a site</h3>
          <div className="hint">One line, just before the closing body tag. Factory sites get it automatically when the new widget is switched on.</div>
          <code data-testid="snippet">{snippet}</code>
          <div className="bar"><button type="button" className="btn sm" onClick={() => { void navigator.clipboard?.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied" : "Copy line"}</button></div>
        </fieldset>

        <div className="bar">
          <button type="button" className="btn pri" disabled={busy || !dirty} onClick={() => void save()} data-testid="editor-save">{busy ? "Saving" : "Save changes"}</button>
          <button type="button" className="btn" disabled={busy || !dirty} onClick={() => { setD(saved); setErrs({}); setMsg(""); }} data-testid="editor-reset">Discard changes</button>
          {dirty && !busy && <span className="hint" style={{ margin: 0 }}>Unsaved changes</span>}
          {msg && <span role="status" data-testid="editor-msg" style={{ fontSize: 12.5, color: Object.keys(errs).length ? "#b42318" : "#137a52" }}>{msg}</span>}
        </div>
      </div>

      <div className="pv">
        <h3>Live preview</h3>
        <div className="pvtools" role="group" aria-label="Preview options">
          <button type="button" className="seg" aria-pressed={width === "desktop"} onClick={() => setWidth("desktop")}>Desktop</button>
          <button type="button" className="seg" aria-pressed={width === "mobile"} onClick={() => setWidth("mobile")}>Mobile</button>
          <button type="button" className="seg" aria-pressed={back === "light"} onClick={() => setBack("light")}>Light page</button>
          <button type="button" className="seg" aria-pressed={back === "dark"} onClick={() => setBack("dark")}>Dark page</button>
          <button type="button" className="seg" aria-pressed={back === "photo"} onClick={() => setBack("photo")}>Photo page</button>
          <button type="button" className="seg" aria-pressed={showOff} onClick={() => setShowOff((v) => !v)} data-testid="preview-off">Break message</button>
        </div>
        <div className="pvbox" style={{ background: bgStyle }}>
          <iframe ref={frame} title={`Chat widget preview for ${row.name}`} src="/embed/preview.html" style={{ width: width === "mobile" ? 390 : "100%" }} data-testid="preview-frame" />
        </div>
        <div className="hint">This is the real widget. Replies in the preview are not sent to the AI.</div>
      </div>
    </div>
  );
}
