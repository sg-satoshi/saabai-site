"use client";
/** Goal-first settings form. Used by Saabai admin (with locks) and the client portal (locked fields read-only). */
import React from "react";
import { GOAL_FIELDS, GOAL_LABEL, GOAL_LIMITS, GOAL_TYPES, type GoalConfig, type GoalField, type GoalType } from "../../../lib/chatbot/goal";

export const EMPTY_GOAL: GoalConfig = { primary: "none", fallback: "none", questions: [], stages: [], quickReplies: [] };

const css = `
.ge fieldset{border:0;padding:0;margin:0 0 14px}
.ge label{display:block;font-size:12px;color:#4b5068;margin:0 0 10px}
.ge input[type=text],.ge textarea,.ge select{display:block;width:100%;margin-top:4px;padding:6px 8px;border:1px solid #d9dbe6;border-radius:8px;font:400 13px system-ui,sans-serif;background:#fff;color:#14123a;box-sizing:border-box}
.ge textarea{min-height:60px;resize:vertical}
.ge .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ge .err{color:#b42318;font-size:12px;margin-top:3px}
.ge .hint{color:#6b7085;font-size:12px;margin:2px 0 8px}
.ge .lock{font-size:11px;color:#6b7085;margin-left:6px}
.ge .lock input{margin:0 4px 0 0;vertical-align:middle}
.ge .gb{height:30px;padding:0 12px;border-radius:8px;border:1px solid #0b092e;background:#fff;color:#0b092e;font:600 12px system-ui,sans-serif;cursor:pointer}
.ge .gb:disabled{opacity:.5;cursor:default}
@media (max-width:700px){.ge .two{grid-template-columns:1fr}}
`;

type Props = {
  value: GoalConfig;
  onChange: (g: GoalConfig) => void;
  errors?: Record<string, string>;
  /** Admin: show lock boxes. Client: locked fields are read-only. */
  mode: "admin" | "client";
  readOnly?: boolean;
};

export default function GoalEditor({ value: g, onChange, errors = {}, mode, readOnly }: Props) {
  const locked = new Set(g.locked ?? []);
  const off = (f: GoalField) => !!readOnly || (mode === "client" && locked.has(f));
  const set = <K extends keyof GoalConfig>(k: K, v: GoalConfig[K]) => onChange({ ...g, [k]: v });
  const err = (k: string) => (errors[k] ? <div className="err" role="alert">{errors[k]}</div> : null);
  const lock = (f: GoalField) =>
    mode === "admin" ? (
      <span className="lock"><label style={{ display: "inline", margin: 0 }}><input type="checkbox" checked={locked.has(f)} disabled={readOnly} onChange={(e) => {
        const next = new Set(locked); if (e.target.checked) next.add(f); else next.delete(f);
        set("locked", GOAL_FIELDS.filter((x) => next.has(x)));
      }} data-testid={`lock-${f}`} />Lock for client</label></span>
    ) : locked.has(f) ? <span className="lock">Set by Saabai</span> : null;

  const goalSelect = (k: "primary" | "fallback", ck: "primaryCustom" | "fallbackCustom", label: string) => (
    <label>{label}{lock(k)}
      <select value={g[k]} disabled={off(k)} onChange={(e) => set(k, e.target.value as GoalType)} data-testid={`g-${k}`}>
        {GOAL_TYPES.map((t) => <option key={t} value={t}>{GOAL_LABEL[t]}</option>)}
      </select>{err(k)}
      {g[k] === "custom" && <input type="text" placeholder="Describe the goal in plain words" maxLength={GOAL_LIMITS.custom} value={g[ck] ?? ""} disabled={off(k)} onChange={(e) => set(ck, e.target.value)} data-testid={`g-${ck}`} />}
      {err(ck)}
    </label>
  );
  const list = (k: "questions" | "stages" | "quickReplies", label: string, max: number, len: number, hint: string) => (
    <label>{label}{lock(k)}
      <textarea value={g[k].join("\n")} disabled={off(k)} onChange={(e) => set(k, e.target.value.split("\n").slice(0, max).map((s) => s.slice(0, len)))} data-testid={`g-${k}`} />
      <div className="hint">{hint} One per line, up to {max}, {len} characters each.</div>
      {err(k)}{g[k].map((_, i) => err(`${k}${i}`))}
    </label>
  );
  const cta = (k: "cta" | "fallbackCta", label: string, urlHint: string) => (
    <div className="two">
      <label>{label} button label{lock(k)}
        <input type="text" maxLength={GOAL_LIMITS.ctaLabel} value={g[k]?.label ?? ""} disabled={off(k)} onChange={(e) => set(k, { label: e.target.value, url: g[k]?.url ?? "" })} data-testid={`g-${k}-label`} />{err(`${k}Label`)}
      </label>
      <label>{urlHint}
        <input type="text" placeholder="https://..." value={g[k]?.url ?? ""} disabled={off(k)} onChange={(e) => set(k, { label: g[k]?.label ?? "", url: e.target.value })} data-testid={`g-${k}-url`} />{err(`${k}Url`)}
      </label>
    </div>
  );

  return (
    <div className="ge">
      <style>{css}</style>
      <fieldset>
        <div className="two">
          {goalSelect("primary", "primaryCustom", "Main goal")}
          {goalSelect("fallback", "fallbackCustom", "Fallback goal")}
        </div>
        {cta("cta", "Main", "Booking or quote link (https, mailto: or tel:)")}
        {cta("fallbackCta", "Fallback", "Fallback link (https, mailto: or tel:)")}
        <div className="hint">If the main link is empty, the bot offers the fallback button instead.</div>
      </fieldset>
      <fieldset>
        <label>Persona and tone notes{lock("persona")}
          <textarea maxLength={GOAL_LIMITS.persona} value={g.persona ?? ""} disabled={off("persona")} onChange={(e) => set("persona", e.target.value)} data-testid="g-persona" />{err("persona")}
        </label>
        {list("questions", "Qualifying questions", GOAL_LIMITS.questions, GOAL_LIMITS.question, "Asked one at a time, only when they fit.")}
        {list("quickReplies", "Quick reply buttons under the greeting", GOAL_LIMITS.quickReplies, GOAL_LIMITS.quickReply, "Short choices visitors can tap.")}
        {list("stages", "Conversation stages", GOAL_LIMITS.stages, GOAL_LIMITS.stage, "Leave empty for the standard stages.")}
        <label>When to hand over to your team{lock("handoff")}
          <textarea maxLength={GOAL_LIMITS.handoff} value={g.handoff ?? ""} disabled={off("handoff")} onChange={(e) => set("handoff", e.target.value)} data-testid="g-handoff" />{err("handoff")}
        </label>
        <div className="hint">Plain words only. Text that tries to give the AI new instructions is rejected.</div>
      </fieldset>
    </div>
  );
}
