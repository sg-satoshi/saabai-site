"use client";

/**
 * Public AI Audit fact-find form — client mode.
 * Section-by-section stepper, autosaves on every step, resumable via the
 * same tokenised link.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";

type QType = "text" | "textarea" | "select" | "multiselect" | "number" | "scale";

interface Question {
  id: string;
  section: string;
  label: string;
  help?: string;
  type: QType;
  options?: string[];
  required?: boolean;
}

interface Section {
  id: string;
  title: string;
  description?: string;
}

type Value = string | string[] | number | null;

interface FormData {
  firmName: string;
  contactName: string;
  tier: string;
  completed: boolean;
  sections: Section[];
  questions: Question[];
  answers: Record<string, Value>;
}

const NAVY = "#0e0c2e";
const GOLD = "#C9A84C";

export default function FactFindClient({ token }: { token: string }) {
  const [data, setData] = useState<FormData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, Value>>({});
  const [step, setStep] = useState(0); // section index
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/audit/factfind/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Invalid link"))))
      .then((d: FormData) => {
        setData(d);
        setAnswers(d.answers ?? {});
        if (d.completed) setDone(true);
      })
      .catch(() => setError("This link is invalid or has expired. Please contact hello@saabai.ai."));
  }, [token]);

  const sections = useMemo(() => {
    if (!data) return [];
    return data.sections.filter((s) =>
      data.questions.some((q) => q.section === s.id)
    );
  }, [data]);

  const currentSection = sections[step];
  const currentQuestions = useMemo(
    () =>
      data && currentSection
        ? data.questions.filter((q) => q.section === currentSection.id)
        : [],
    [data, currentSection]
  );

  const save = useCallback(
    async (complete: boolean): Promise<boolean> => {
      setSaving(true);
      try {
        const res = await fetch(`/api/audit/factfind/${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers, complete }),
        });
        return res.ok;
      } catch {
        return false;
      } finally {
        setSaving(false);
      }
    },
    [token, answers]
  );

  function missingRequired(): string | null {
    for (const q of currentQuestions) {
      if (!q.required) continue;
      const v = answers[q.id];
      if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) {
        return q.label;
      }
    }
    return null;
  }

  async function next() {
    const missing = missingRequired();
    if (missing) {
      setValidationMsg(`Please answer: "${missing}"`);
      return;
    }
    setValidationMsg(null);
    await save(false);
    if (step < sections.length - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const ok = await save(true);
      if (ok) setDone(true);
      else setValidationMsg("Something went wrong submitting — please try again.");
    }
  }

  function back() {
    setValidationMsg(null);
    if (step > 0) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function setVal(id: string, v: Value) {
    setAnswers((prev) => ({ ...prev, [id]: v }));
  }

  if (error) {
    return (
      <Shell>
        <div className="text-center py-24">
          <p className="text-lg" style={{ color: "#e2e4f0" }}>{error}</p>
        </div>
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell>
        <div className="text-center py-24">
          <p style={{ color: "#9aa0c3" }}>Loading your questionnaire…</p>
        </div>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <div className="max-w-xl mx-auto text-center py-20 px-6">
          <div
            className="w-14 h-14 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ background: "rgba(201,168,76,0.15)", border: `1px solid ${GOLD}` }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold mb-4" style={{ color: "#ffffff" }}>
            Thank you, {data.contactName.split(" ")[0]}.
          </h1>
          <p className="mb-3" style={{ color: "#9aa0c3" }}>
            Your questionnaire is in. We&apos;ll review your answers and be in
            touch shortly to schedule your discovery session.
          </p>
          <p style={{ color: "#9aa0c3" }}>
            Questions in the meantime? Email{" "}
            <a href="mailto:hello@saabai.ai" style={{ color: GOLD }}>hello@saabai.ai</a>.
          </p>
        </div>
      </Shell>
    );
  }

  const progress = sections.length > 0 ? ((step + 1) / sections.length) * 100 : 0;

  return (
    <Shell>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: GOLD }}>
          AI Audit · {data.firmName}
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold mb-2" style={{ color: "#ffffff" }}>
          Pre-Audit Questionnaire
        </h1>
        <p className="mb-8 text-sm" style={{ color: "#9aa0c3" }}>
          Your progress saves automatically each step. The more specific your
          answers, the sharper your audit.
        </p>

        {/* Progress */}
        <div className="mb-10">
          <div className="flex justify-between text-xs mb-2" style={{ color: "#9aa0c3" }}>
            <span>
              Section {step + 1} of {sections.length}: {currentSection?.title}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, background: GOLD }}
            />
          </div>
        </div>

        {/* Section */}
        <div className="mb-2">
          <h2 className="text-xl font-semibold mb-1" style={{ color: "#ffffff" }}>
            {currentSection?.title}
          </h2>
          {currentSection?.description && (
            <p className="text-sm mb-6" style={{ color: "#9aa0c3" }}>
              {currentSection.description}
            </p>
          )}
        </div>

        <div className="space-y-7">
          {currentQuestions.map((q) => (
            <QuestionField key={q.id} q={q} value={answers[q.id] ?? null} onChange={(v) => setVal(q.id, v)} />
          ))}
        </div>

        {validationMsg && (
          <p className="mt-6 text-sm" style={{ color: "#ff8a8a" }}>{validationMsg}</p>
        )}

        <div className="flex items-center justify-between mt-10">
          <button
            onClick={back}
            disabled={step === 0 || saving}
            className="px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-30"
            style={{ color: "#e2e4f0", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            ← Back
          </button>
          <button
            onClick={next}
            disabled={saving}
            className="px-7 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60"
            style={{ background: GOLD, color: NAVY }}
          >
            {saving ? "Saving…" : step === sections.length - 1 ? "Submit questionnaire" : "Save & continue →"}
          </button>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: NAVY }}>
      <div className="border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="max-w-2xl mx-auto px-6 py-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/saabai-logo-full.png" alt="Saabai.ai" className="h-7 w-auto" />
        </div>
      </div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#ffffff",
};

function QuestionField({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: Value;
  onChange: (v: Value) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "#e2e4f0" }}>
        {q.label}
        {q.required && <span style={{ color: GOLD }}> *</span>}
      </label>
      {q.help && (
        <p className="text-xs mb-2" style={{ color: "#7c81a6" }}>{q.help}</p>
      )}

      {q.type === "text" && (
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1"
          style={inputStyle}
        />
      )}

      {q.type === "textarea" && (
        <textarea
          rows={4}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 resize-y"
          style={inputStyle}
        />
      )}

      {q.type === "number" && (
        <input
          type="number"
          min={0}
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          className="w-40 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1"
          style={inputStyle}
        />
      )}

      {q.type === "select" && (
        <div className="flex flex-wrap gap-2">
          {(q.options ?? []).map((opt) => {
            const active = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(active ? null : opt)}
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={
                  active
                    ? { background: "rgba(201,168,76,0.18)", border: `1px solid ${GOLD}`, color: "#ffffff" }
                    : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#c4c8e0" }
                }
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {q.type === "multiselect" && (
        <div className="flex flex-wrap gap-2">
          {(q.options ?? []).map((opt) => {
            const arr = Array.isArray(value) ? value : [];
            const active = arr.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() =>
                  onChange(active ? arr.filter((x) => x !== opt) : [...arr, opt])
                }
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={
                  active
                    ? { background: "rgba(201,168,76,0.18)", border: `1px solid ${GOLD}`, color: "#ffffff" }
                    : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#c4c8e0" }
                }
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {q.type === "scale" && (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = value === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onChange(active ? null : n)}
                className="w-11 h-11 rounded-lg text-sm font-semibold transition-colors"
                style={
                  active
                    ? { background: GOLD, color: NAVY, border: `1px solid ${GOLD}` }
                    : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#c4c8e0" }
                }
              >
                {n}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
