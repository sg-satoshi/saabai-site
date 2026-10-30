"use client";
/** Conversion playbook toggles. Shared by Saabai admin and the client portal. */
import React from "react";
import { ENGAGE_LIMITS as L, type EngageConfig } from "../../../lib/chatbot/engage";

const css = `
.ee label{display:block;font-size:12px;color:#4b5068;margin:0 0 10px}
.ee label.tg{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:#14123a}
.ee label.tg small{display:block;color:#6b7085;font-size:12px}
.ee input[type=text],.ee input[type=number],.ee input[type=date],.ee textarea{display:block;width:100%;margin-top:4px;padding:6px 8px;border:1px solid #d9dbe6;border-radius:8px;font:400 13px system-ui,sans-serif;background:#fff;color:#14123a;box-sizing:border-box}
.ee textarea{min-height:56px}
.ee h4{margin:14px 0 6px;font:600 13px system-ui,sans-serif;color:#14123a}
.ee .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ee .err{color:#b42318;font-size:12px}
.ee .hint{color:#6b7085;font-size:12px;margin:0 0 8px}
@media (max-width:700px){.ee .two{grid-template-columns:1fr}}
`;

const lines = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);

export default function EngageEditor({ value: e, onChange, errors = {}, readOnly }: { value: EngageConfig; onChange: (v: EngageConfig) => void; errors?: Record<string, string>; readOnly?: boolean }) {
  const set = <K extends keyof EngageConfig>(k: K, v: EngageConfig[K]) => onChange({ ...e, [k]: v });
  const err = (k: string) => (errors[k] ? <div className="err" role="alert">{errors[k]}</div> : null);
  const errsLike = (p: string) => Object.keys(errors).filter((k) => k.startsWith(p)).map((k) => <div key={k} className="err" role="alert">{errors[k]}</div>);
  const tog = (k: "endChat" | "emailCopy" | "transcripts" | "exitIntent" | "microCommit" | "objections", label: string, hint: string) => (
    <label className="tg"><input type="checkbox" checked={e[k]} disabled={readOnly} onChange={(x) => set(k, x.target.checked)} data-testid={`e-${k}`} /><span>{label}<small>{hint}</small></span></label>
  );
  return (
    <div className="ee">
      <style>{css}</style>
      <h4>Chat features</h4>
      {tog("endChat", "End chat and New chat buttons", "Visitors can finish or start fresh at any time.")}
      {tog("emailCopy", "Offer a copy of the chat at the end", "Asks for an email with a consent tick box. Only works once Saabai switches on lead capture for your account.")}
      {tog("transcripts", "Show chat transcripts in my portal", "Chats are kept for 90 days, then deleted.")}
      <h4>Gentle nudges</h4>
      <div className="hint">Shown once per page, at most 3 times a week per visitor, and always easy to close. Never opens the chat by itself.</div>
      <label>Page openers (one per line: /page-path | message)
        <textarea disabled={readOnly} value={e.openers.map((o) => `${o.match} | ${o.text}`).join("\n")} onChange={(x) => set("openers", lines(x.target.value).slice(0, L.openers).map((l) => { const [m, ...t] = l.split("|"); return { match: (m || "").trim(), text: t.join("|").trim() }; }))} data-testid="e-openers" />
        {errsLike("opener")}{err("openers")}
      </label>
      <div className="two">
        <label>Idle nudge after seconds (0 is off)<input type="number" min={0} max={L.idleMax} disabled={readOnly} value={e.idleSeconds} onChange={(x) => set("idleSeconds", Number(x.target.value))} />{err("idleSeconds")}</label>
        <label>Scroll depth nudge percent (0 is off)<input type="number" min={0} max={90} disabled={readOnly} value={e.scrollPercent} onChange={(x) => set("scrollPercent", Number(x.target.value))} />{err("scrollPercent")}</label>
      </div>
      {tog("exitIntent", "Exit nudge on desktop", "A small note when the mouse heads for the close button. Not on phones.")}
      <h4>Conversation</h4>
      {tog("microCommit", "Easy question first", "Asks a one-tap question before asking for details.")}
      {tog("objections", "Handle worries from my approved answers", "Uses your questions and answers for price, timing and trust worries.")}
      <div className="two">
        <label>Free offer button label<input type="text" maxLength={L.label} disabled={readOnly} value={e.freeOffer?.label ?? ""} onChange={(x) => set("freeOffer", { label: x.target.value, url: e.freeOffer?.url ?? "", value: e.freeOffer?.value ?? "" })} placeholder="Free quote" />{err("freeOfferLabel")}</label>
        <label>Free offer link<input type="text" disabled={readOnly} value={e.freeOffer?.url ?? ""} onChange={(x) => set("freeOffer", { label: e.freeOffer?.label ?? "", url: x.target.value, value: e.freeOffer?.value ?? "" })} placeholder="https://..." />{err("freeOfferUrl")}</label>
      </div>
      <label>What they get from it<input type="text" maxLength={L.value} disabled={readOnly} value={e.freeOffer?.value ?? ""} onChange={(x) => set("freeOffer", { label: e.freeOffer?.label ?? "", url: e.freeOffer?.url ?? "", value: x.target.value })} />{err("freeOfferValue")}</label>
      <label>Your real client reviews (one per line: quote | name). The bot quotes them word for word and never makes any up.
        <textarea disabled={readOnly} value={e.testimonials.map((t) => `${t.quote} | ${t.name}`).join("\n")} onChange={(x) => set("testimonials", lines(x.target.value).slice(0, L.testimonials).map((l) => { const i = l.lastIndexOf("|"); return i > 0 ? { quote: l.slice(0, i).trim(), name: l.slice(i + 1).trim() } : { quote: l, name: "" }; }))} data-testid="e-testimonials" />
        {errsLike("testimonial")}{err("testimonials")}
      </label>
      <div className="two">
        <label>Current offer (only if real)<input type="text" maxLength={L.offer} disabled={readOnly} value={e.offer?.text ?? ""} onChange={(x) => set("offer", { text: x.target.value, endsOn: e.offer?.endsOn ?? "" })} />{err("offerText")}</label>
        <label>Offer ends on<input type="date" disabled={readOnly} value={e.offer?.endsOn ?? ""} onChange={(x) => set("offer", { text: e.offer?.text ?? "", endsOn: x.target.value })} />{err("offerEndsOn")}</label>
      </div>
      <div className="hint">The offer hides itself after the end date. No countdowns or limited-spots wording.</div>
      <label>Welcome back message for returning visitors<input type="text" maxLength={L.returnGreeting} disabled={readOnly} value={e.returnGreeting ?? ""} onChange={(x) => set("returnGreeting", x.target.value)} />{err("returnGreeting")}</label>
      <h4>Reviews</h4>
      <label className="tg"><input type="checkbox" checked={e.reviews.enabled} disabled={readOnly} onChange={(x) => set("reviews", { ...e.reviews, enabled: x.target.checked })} data-testid="e-reviews" /><span>Invite existing clients to leave a Google review<small>Asked once per visitor at the end of a chat. Every existing client is asked, happy or not, as Google and the ACCC require. Unhappy visitors are also offered to pass their concern to you.</small></span></label>
      <label>Google review link<input type="text" disabled={readOnly} value={e.reviews.url} onChange={(x) => set("reviews", { ...e.reviews, url: x.target.value })} placeholder="https://g.page/r/..." />{err("reviewsUrl")}</label>
    </div>
  );
}
