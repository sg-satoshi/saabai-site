"use client";
import type { ReactNode } from "react";

export type Value = string | string[] | number | null;
export interface Q { id: string; label: string; help?: string; type: "text" | "textarea" | "select" | "multiselect" | "number" | "scale"; options?: string[]; required?: boolean }

export default function QuestionField({ q, n, value, onChange, onBlur, disabled }: {
  q: Q; n: number; value: Value; onChange: (v: Value) => void; onBlur: () => void; disabled?: boolean;
}) {
  const hid = `h-${q.id}`;
  const iid = `q-${q.id}`;
  let control: ReactNode = null;
  if (q.type === "text") control = <input id={iid} className="bp-in" type="text" maxLength={5000} value={(value as string) ?? ""} disabled={disabled} aria-describedby={q.help ? hid : undefined} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />;
  if (q.type === "textarea") control = <textarea id={iid} className="bp-in" maxLength={5000} value={(value as string) ?? ""} disabled={disabled} aria-describedby={q.help ? hid : undefined} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />;
  if (q.type === "number") control = <input id={iid} className="bp-in" style={{ maxWidth: 200 }} type="number" min={0} inputMode="decimal" value={value === null || value === undefined ? "" : String(value)} disabled={disabled} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} onBlur={onBlur} />;
  if (q.type === "select") control = (
    <div className="bp-opts" role="group" aria-labelledby={`l-${q.id}`}>
      {(q.options ?? []).map((o) => (
        <button key={o} type="button" className="bp-opt" aria-pressed={value === o} disabled={disabled} onClick={() => { onChange(value === o ? null : o); setTimeout(onBlur, 0); }}>{o}</button>
      ))}
    </div>
  );
  if (q.type === "multiselect") {
    const arr = Array.isArray(value) ? value : [];
    control = (
      <div className="bp-opts" role="group" aria-labelledby={`l-${q.id}`}>
        {(q.options ?? []).map((o) => {
          const on = arr.includes(o);
          return <button key={o} type="button" className="bp-opt" aria-pressed={on} disabled={disabled} onClick={() => { onChange(on ? arr.filter((x) => x !== o) : [...arr, o]); setTimeout(onBlur, 0); }}>{o}</button>;
        })}
      </div>
    );
  }
  if (q.type === "scale") control = (
    <div className="bp-opts" role="group" aria-labelledby={`l-${q.id}`}>
      {[1, 2, 3, 4, 5].map((k) => (
        <button key={k} type="button" className="bp-opt" style={{ width: 48, padding: 0 }} aria-pressed={value === k} aria-label={`${k} of 5`} disabled={disabled} onClick={() => { onChange(value === k ? null : k); setTimeout(onBlur, 0); }}>{k}</button>
      ))}
    </div>
  );
  return (
    <div className="bp-q">
      <label className="t" id={`l-${q.id}`} htmlFor={["text", "textarea", "number"].includes(q.type) ? iid : undefined}>
        <span className="qn mono">Q{n}</span>{q.label}
        {q.required ? <span className="req">Required</span> : <span className="opt">Optional</span>}
      </label>
      {q.help && <p className="hint" id={hid}>{q.help}</p>}
      {control}
    </div>
  );
}
