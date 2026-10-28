"use client";

import { useEffect, useState } from "react";
import "./onboarding.css";

type StepId = "business" | "brand" | "access" | "next" | "lex";

interface FieldDef {
  key: string;
  label: string;
  hint?: string;
  kind: "text" | "email" | "textarea" | "select" | "access";
  options?: { value: string; label: string }[];
}

interface Step {
  id: StepId;
  label: string;
  title: string;
  lede: string;
  fields: FieldDef[];
}

interface OnboardingView {
  enabled: boolean;
  steps?: Step[];
  nextCopy?: string[];
  prefill?: Record<string, string>;
  state?: {
    step: StepId;
    status: string;
    payload: Record<string, string>;
    skipped: StepId[];
    updatedAt: string;
  };
  error?: string;
}

const CHOICES = [
  { value: "requested", label: "Requested" },
  { value: "granted", label: "Granted" },
  { value: "not_needed", label: "Not needed" },
];

function blankFields(step: Step, view: OnboardingView): Record<string, string> {
  const next: Record<string, string> = {};
  for (const field of step.fields) {
    const saved = view.state?.payload?.[field.key];
    if (typeof saved === "string" && saved) next[field.key] = saved;
    else if (field.kind === "access") next[field.key] = "requested";
    else next[field.key] = view.prefill?.[field.key] || "";
  }
  return next;
}

export function OnboardingCard() {
  const [view, setView] = useState<OnboardingView | null>(null);
  const [open, setOpen] = useState(true);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/portal/onboarding", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { enabled: false }))
      .then((data: OnboardingView) => {
        if (!cancelled) setView(data?.enabled ? data : { enabled: false });
      })
      .catch(() => {
        if (!cancelled) setView({ enabled: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const steps = view?.steps ?? [];
  const current = steps.find((s) => s.id === view?.state?.step) ?? steps[0];
  const stepKey = current?.id;
  const updatedAt = view?.state?.updatedAt;

  useEffect(() => {
    if (!view?.enabled || !current) return;
    setFields(blankFields(current, view));
  }, [view, current, stepKey, updatedAt]);

  if (!view?.enabled || !current || steps.length === 0) return null;

  const complete = view.state?.status === "complete";
  const showForm = open && !complete;
  const index = steps.findIndex((s) => s.id === current.id);
  const isLast = index === steps.length - 1;

  async function post(action: string, step: string, bodyFields: Record<string, string>, collapse = false): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/onboarding", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, step, fields: bodyFields }),
      });
      const data = (await res.json()) as OnboardingView;
      if (!res.ok || !data.enabled) {
        setError(data.error || "Could not save this step. The rest of the portal stays open.");
        return false;
      }
      setView(data);
      if (collapse || data.state?.status === "complete") setOpen(false);
      return true;
    } catch {
      setError("Could not save this step. The rest of the portal stays open.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function chipClass(step: Step) {
    if (step.id === current.id && !complete) return "onb-step on";
    const done = view?.state?.status === "complete" || steps.findIndex((s) => s.id === step.id) < index;
    const skipped = view?.state?.skipped?.includes(step.id);
    if (done || skipped) return "onb-step done";
    return "onb-step";
  }

  return (
    <section className="onb card" aria-label="Setup checklist">
      <div className="hd">
        <div>
          <h2>Setup checklist</h2>
          <div className="sub">
            {complete
              ? "Setup complete. Saabai has what it needs from this checklist."
              : "You can leave this and come back. The rest of the portal stays open."}
          </div>
        </div>
      </div>
      <div className="bd">
        <div className="onb-steps" role="tablist" aria-label="Onboarding steps">
          {steps.map((step, i) => (
            <button
              key={step.id}
              type="button"
              className={chipClass(step)}
              aria-current={step.id === current.id ? "step" : undefined}
              onClick={() => {
                setOpen(true);
                void (async () => {
                  const saved = await post("draft", current.id, fields);
                  if (saved) await post("goto", step.id, {});
                })();
              }}
            >
              {i + 1}. {step.label}
            </button>
          ))}
        </div>

        {showForm && (
          <form
            className="onb-form"
            style={{ marginTop: 16 }}
            onSubmit={(e) => {
              e.preventDefault();
              void post("save", current.id, fields);
            }}
          >
            <div>
              <h2 style={{ marginBottom: 4 }}>{current.title}</h2>
              <p className="onb-note">{current.lede}</p>
            </div>

            {current.id === "next" &&
              (view.nextCopy ?? []).map((para) => (
                <p className="onb-note" key={para}>
                  {para}
                </p>
              ))}

            {current.fields.map((field) =>
              field.kind === "access" ? (
                <fieldset key={field.key} className="onb-access" style={{ border: 0, margin: 0, padding: "12px 0" }}>
                  <legend style={{ fontWeight: 500, padding: 0 }}>{field.label}</legend>
                  <div className="onb-choices" style={{ marginTop: 8 }}>
                    {CHOICES.map((choice) => (
                      <button
                        key={choice.value}
                        type="button"
                        className={fields[field.key] === choice.value ? "on" : ""}
                        aria-pressed={fields[field.key] === choice.value}
                        onClick={() => setFields((prev) => ({ ...prev, [field.key]: choice.value }))}
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <label key={field.key} className="onb-field">
                  <span>{field.label}</span>
                  {field.hint ? <small>{field.hint}</small> : null}
                  {field.kind === "textarea" ? (
                    <textarea
                      value={fields[field.key] ?? ""}
                      onChange={(e) => setFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    />
                  ) : field.kind === "select" ? (
                    <select
                      value={fields[field.key] ?? ""}
                      onChange={(e) => setFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    >
                      <option value="">Select a timezone</option>
                      {(field.options ?? []).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.kind === "email" ? "email" : field.key === "phone" ? "tel" : "text"}
                      value={fields[field.key] ?? ""}
                      autoComplete={field.key === "phone" ? "tel" : field.kind === "email" ? "email" : "organization"}
                      onChange={(e) => setFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    />
                  )}
                </label>
              ),
            )}

            {error ? (
              <p className="onb-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="onb-actions">
              {index > 0 ? (
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => {
                    const prev = steps[index - 1];
                    void (async () => {
                      const saved = await post("draft", current.id, fields);
                      if (saved) await post("goto", prev.id, {});
                    })();
                  }}
                >
                  Back
                </button>
              ) : null}
              <button type="button" className="btn" disabled={busy} onClick={() => void post("draft", current.id, fields, true)}>
                Not now
              </button>
              <button type="button" className="btn" disabled={busy} onClick={() => void post("skip", current.id, {})}>
                Skip this step
              </button>
              <button type="submit" className="btn pri" disabled={busy}>
                {busy ? "Saving..." : isLast ? "Finish" : "Save and continue"}
              </button>
            </div>
          </form>
        )}

        {!showForm && !complete ? (
          <div style={{ marginTop: 12 }}>
            <button type="button" className="btn pri" onClick={() => setOpen(true)}>
              Continue setup
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
