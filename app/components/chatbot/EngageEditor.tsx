"use client";
/** Conversion playbook toggles. Shared by Saabai admin and the client portal. */
import React from "react";
import { ENGAGE_FIELDS, ENGAGE_LIMITS as L, type EngageConfig, type EngageField } from "../../../lib/chatbot/engage";

const css = `
.ee label{display:block;font-size:12px;color:#4b5068;margin:0 0 10px}
.ee label.tg{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:#14123a}
.ee label.tg small{display:block;color:#6b7085;font-size:12px}
.ee input[type=text],.ee input[type=number],.ee input[type=date],.ee textarea{display:block;width:100%;margin-top:4px;padding:6px 8px;border:1px solid #d9dbe6;border-radius:8px;font:400 13px system-ui,sans-serif;background:#fff;color:#14123a;box-sizing:border-box}
.ee textarea{min-height:56px}
.ee h4{margin:14px 0 6px;font:600 13px system-ui,sans-serif;color:#14123a}
.ee .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ee .err{color:#b42318;font-size:12px}
.ee .lock{margin-left:8px;font-size:11px;color:#4b5068;font-weight:400}
.ee .lock input{margin:0 4px 0 0;vertical-align:middle}
.ee .hint{color:#6b7085;font-size:12px;margin:0 0 8px}
@media (max-width:700px){.ee .two{grid-template-columns:1fr}}
`;

const lines = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);

type Props = {
  value: EngageConfig;
  onChange: (v: EngageConfig) => void;
  errors?: Record<string, string>;
  readOnly?: boolean;
  /** Admin: show lock boxes. Client: locked settings are read-only. */
  mode?: "admin" | "client";
};

export default function EngageEditor({ value: e, onChange, errors = {}, readOnly, mode = "client" }: Props) {
  const locked = new Set<EngageField>(e.locked ?? []);
  const off = (f: EngageField) => !!readOnly || (mode === "client" && locked.has(f));
  const lock = (f: EngageField) =>
    mode === "admin" ? (
      <span className="lock"><label style={{ display: "inline", margin: 0, fontSize: 11 }}><input type="checkbox" checked={locked.has(f)} disabled={readOnly} onChange={(x) => {
        const next = new Set(locked); if (x.target.checked) next.add(f); else next.delete(f);
        onChange({ ...e, locked: ENGAGE_FIELDS.filter((y) => next.has(y)) });
      }} data-testid={`elock-${f}`} />Lock for client</label></span>
    ) : locked.has(f) ? <span className="lock">Set by Saabai</span> : null;
  const set = <K extends keyof EngageConfig>(k: K, v: EngageConfig[K]) => onChange({ ...e, [k]: v });
  const err = (k: string) => (errors[k] ? <div className="err" role="alert">{errors[k]}</div> : null);
  const errsLike = (p: string) => Object.keys(errors).filter((k) => k.startsWith(p)).map((k) => <div key={k} className="err" role="alert">{errors[k]}</div>);
  const tog = (k: "endChat" | "emailCopy" | "transcripts" | "exitIntent" | "microCommit" | "objections", label: string, hint: string) => (
    <label className="tg"><input type="checkbox" checked={e[k]} disabled={off(k === "exitIntent" ? "nudges" : k)} onChange={(x) => set(k, x.target.checked)} data-testid={`e-${k}`} /><span>{label}{k !== "exitIntent" && lock(k)}<small>{hint}</small></span></label>
  );
  return (
    <div className="ee">
      <style>{css}</style>
      <h4>Chat features</h4>
      {tog("endChat", "End chat and New chat buttons", "Visitors can finish or start fresh at any time.")}
      {tog("emailCopy", "Offer a copy of the chat at the end", "Asks for an email with a consent tick box. Only works once Saabai switches on lead capture for your account.")}
      {tog("transcripts", "Show chat transcripts in my portal", "Lets the client read past chats in their portal.")}
      <h4>Gentle nudges</h4>
      <div className="hint">Shown once per page, at most 3 times a week per visitor, and always easy to close. Never opens the chat by itself.</div>
      <label>Page openers (one per line: /page-path | message){lock("openers")}
        <textarea disabled={off("openers")} value={e.openers.map((o) => `${o.match} | ${o.text}`).join("\n")} onChange={(x) => set("openers", lines(x.target.value).slice(0, L.openers).map((l) => { const [m, ...t] = l.split("|"); return { match: (m || "").trim(), text: t.join("|").trim() }; }))} data-testid="e-openers" />
        {errsLike("opener")}{err("openers")}
      </label>
      <div className="two">
        <label>Idle nudge after seconds (0 is off){lock("nudges")}<input type="number" min={0} max={L.idleMax} disabled={off("nudges")} value={e.idleSeconds} onChange={(x) => set("idleSeconds", Number(x.target.value))} />{err("idleSeconds")}</label>
        <label>Scroll depth nudge percent (0 is off)<input type="number" min={0} max={90} disabled={off("nudges")} value={e.scrollPercent} onChange={(x) => set("scrollPercent", Number(x.target.value))} />{err("scrollPercent")}</label>
      </div>
      {tog("exitIntent", "Exit nudge on desktop", "A small note when the mouse heads for the close button. Not on phones.")}
      <h4>Conversation</h4>
      {tog("microCommit", "Easy question first", "Asks a one-tap question before asking for details.")}
      {tog("objections", "Handle worries from my approved answers", "Uses your questions and answers for price, timing and trust worries.")}
      <div className="two">
        <label>Free offer button label{lock("freeOffer")}<input type="text" maxLength={L.label} disabled={off("freeOffer")} value={e.freeOffer?.label ?? ""} onChange={(x) => set("freeOffer", { label: x.target.value, url: e.freeOffer?.url ?? "", value: e.freeOffer?.value ?? "" })} placeholder="Free quote" />{err("freeOfferLabel")}</label>
        <label>Free offer link<input type="text" disabled={off("freeOffer")} value={e.freeOffer?.url ?? ""} onChange={(x) => set("freeOffer", { label: e.freeOffer?.label ?? "", url: x.target.value, value: e.freeOffer?.value ?? "" })} placeholder="https://..." />{err("freeOfferUrl")}</label>
      </div>
      <label>What they get from it<input type="text" maxLength={L.value} disabled={off("freeOffer")} value={e.freeOffer?.value ?? ""} onChange={(x) => set("freeOffer", { label: e.freeOffer?.label ?? "", url: e.freeOffer?.url ?? "", value: x.target.value })} />{err("freeOfferValue")}</label>
      <label>Your real client reviews (one per line: quote | name). The bot quotes them word for word and never makes any up.{lock("testimonials")}
        <textarea disabled={off("testimonials")} value={e.testimonials.map((t) => `${t.quote} | ${t.name}`).join("\n")} onChange={(x) => set("testimonials", lines(x.target.value).slice(0, L.testimonials).map((l) => { const i = l.lastIndexOf("|"); return i > 0 ? { quote: l.slice(0, i).trim(), name: l.slice(i + 1).trim() } : { quote: l, name: "" }; }))} data-testid="e-testimonials" />
        {errsLike("testimonial")}{err("testimonials")}
      </label>
      <div className="two">
        <label>Current offer (only if real){lock("offer")}<input type="text" maxLength={L.offer} disabled={off("offer")} value={e.offer?.text ?? ""} onChange={(x) => set("offer", { text: x.target.value, endsOn: e.offer?.endsOn ?? "" })} />{err("offerText")}</label>
        <label>Offer ends on<input type="date" disabled={off("offer")} value={e.offer?.endsOn ?? ""} onChange={(x) => set("offer", { text: e.offer?.text ?? "", endsOn: x.target.value })} />{err("offerEndsOn")}</label>
      </div>
      <div className="hint">The offer hides itself after the end date. No countdowns or limited-spots wording.</div>
      <label>Welcome back message for returning visitors{lock("returnGreeting")}<input type="text" maxLength={L.returnGreeting} disabled={off("returnGreeting")} value={e.returnGreeting ?? ""} onChange={(x) => set("returnGreeting", x.target.value)} />{err("returnGreeting")}</label>
      <h4>Reviews</h4>
      <label className="tg"><input type="checkbox" checked={e.reviews.enabled} disabled={off("reviews")} onChange={(x) => set("reviews", { ...e.reviews, enabled: x.target.checked })} data-testid="e-reviews" /><span>Invite existing clients to leave a Google review{lock("reviews")}<small>Asked once per visitor at the end of a chat. Every existing client is asked, happy or not, as Google and the ACCC require. Unhappy visitors are also offered to pass their concern to you.</small></span></label>
      <label>Google review link<input type="text" disabled={off("reviews")} value={e.reviews.url} onChange={(x) => set("reviews", { ...e.reviews, url: x.target.value })} placeholder="https://g.page/r/..." />{err("reviewsUrl")}</label>
    </div>
  );
}
