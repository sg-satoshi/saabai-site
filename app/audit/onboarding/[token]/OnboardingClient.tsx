"use client";

/**
 * Mobile-friendly search onboarding. One short step at a time.
 * Demo links keep progress in the page only. Nothing is emailed from here.
 */

import React, { useEffect, useMemo, useState } from "react";

type Field = {
  id: string;
  checkId: string;
  label: string;
  help?: string;
  optional: boolean;
  type: "text" | "textarea" | "number" | "select" | "choice" | "qa";
  options?: { value: string; label: string }[];
  placement: "confirm" | "ask";
  found: string | null;
  value: string | number | null;
  suggestion: string | number | null;
};

type Completeness = { percent: number; ready: number; total: number; rows: { checkId: string; label: string; state: string; optional: boolean }[] };

type Draft = {
  id: string;
  question: string;
  answer: string;
  source: "client" | "site" | "unanswered";
  sourceDetail: string;
  status: "admin_review" | "client_review" | "approved" | "unanswered";
};

type View = {
  firmName: string;
  contactName: string;
  website: string;
  demo?: boolean;
  completed: boolean;
  knownBusiness: string | null;
  confirms: Field[];
  asks: Field[];
  completeness: Completeness;
  faqs: { drafts: Draft[]; published: false; faqPage: unknown } | null;
  sampleUrl?: string;
  resume?: unknown;
  error?: string;
  missing?: string[];
};

const NAVY = "#0e0c2e";
const GOLD = "#C9A84C";

export default function OnboardingClient({ token }: { token: string }) {
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [url, setUrl] = useState("");
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [resume, setResume] = useState<unknown>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/audit/onboarding/${token}`)
      .then((r) => r.json())
      .then((d: View) => {
        if (d.error) {
          setError(d.error);
          return;
        }
        setView(d);
        setUrl(d.website || "");
        setValues(seed(d));
        if (d.completed) setDone(true);
      })
      .catch(() => setError("This link is invalid or has expired. Please contact hello@saabai.ai."));
  }, [token]);

  const steps = useMemo(() => {
    if (!view) return ["site"] as string[];
    const askGroups: string[] = [];
    for (let i = 0; i < view.asks.length; i += 2) askGroups.push(`ask-${i}`);
    return ["site", ...(view.confirms.length ? ["confirm"] : []), ...askGroups, "review"];
  }, [view]);

  async function post(body: Record<string, unknown>): Promise<View | null> {
    setSaving(true);
    setNote(null);
    try {
      const res = await fetch(`/api/audit/onboarding/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(view?.demo ? { ...body, session: resume } : body),
      });
      const data = (await res.json()) as View;
      if (!res.ok) {
        setNote(data.missing?.length ? `${data.error} ${data.missing[0]}` : data.error || "Something went wrong.");
        return null;
      }
      if (data.resume) setResume(data.resume);
      setView((prev) => ({ ...(prev ?? data), ...data, demo: prev?.demo ?? data.demo }));
      return data;
    } catch {
      setNote("Something went wrong. Your place is still on this page.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function readSite(sample: boolean) {
    const target = sample ? view?.sampleUrl || "https://preview.example/" : url.trim();
    const data = await post({ action: "prefill", url: target });
    if (!data) return;
    setValues(seed(data));
    setUrl(data.website || target);
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(complete: boolean) {
    const data = await post({ action: "save", answers: payload(view, values), complete });
    if (!data) return null;
    if (complete) {
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return data;
  }

  async function next() {
    const key = steps[step];
    if (key === "site") {
      await readSite(false);
      return;
    }
    const data = await save(key === "review");
    if (!data || key === "review") return;
    setStep((n) => Math.min(steps.length - 1, n + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (error) {
    return <Shell><p className="px-5 py-16 text-center text-base" style={{ color: "#e2e4f0" }}>{error}</p></Shell>;
  }
  if (!view) {
    return <Shell><p className="px-5 py-16 text-center" style={{ color: "#9aa0c3" }}>Loading your onboarding…</p></Shell>;
  }

  if (done) {
    return (
      <Shell>
        <main className="mx-auto max-w-2xl px-4 py-8">
          <Completeness view={view} />
          <h1 className="mt-6 text-2xl font-semibold" style={{ color: "#fff" }}>Answers saved.</h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "#9aa0c3" }}>
            FAQ drafts go to Saabai for review, then back to you to approve. Nothing is put on your website automatically.
          </p>
          <FaqPanel token={token} drafts={view.faqs?.drafts ?? []} demo={!!view.demo} resume={resume} onResume={setResume} onDrafts={(drafts) => setView({ ...view, faqs: { drafts, published: false, faqPage: view.faqs?.faqPage ?? null } })} />
        </main>
      </Shell>
    );
  }

  const key = steps[step] || "site";
  const askStart = key.startsWith("ask-") ? Number(key.slice(4)) : 0;
  const askFields = view.asks.slice(askStart, askStart + 2);

  return (
    <Shell>
      <main className="mx-auto max-w-2xl px-4 pb-36 pt-6">
        <p className="text-xs uppercase tracking-widest" style={{ color: GOLD }}>Saabai Blueprint · {view.firmName}</p>
        <h1 className="mt-2 text-2xl font-semibold" style={{ color: "#fff" }}>Search onboarding</h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "#9aa0c3" }}>
          We read your website first, then ask only for what we could not find. Progress saves as you go.
        </p>
        {view.demo && (
          <p className="mt-3 rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(201,168,76,0.1)", color: "#e2e4f0" }} data-testid="demo-banner">
            Preview demo. Nothing is stored and no email is sent.
          </p>
        )}
        <div className="mt-5">
          <Completeness view={view} />
        </div>

        {key === "site" && (
          <section className="mt-8">
            <label className="block text-base font-medium" style={{ color: "#e2e4f0" }} htmlFor="site-url">Website address</label>
            <p className="mb-2 mt-1 text-sm" style={{ color: "#7c81a6" }}>We only read public pages. We do not log in.</p>
            <input id="site-url" value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" autoComplete="url" className="min-h-12 w-full rounded-lg px-4 text-base" style={inputStyle} placeholder="https://" />
            {view.knownBusiness && <p className="mt-4 text-sm" style={{ color: "#c4c8e0" }}>{view.knownBusiness}</p>}
          </section>
        )}

        {key === "confirm" && (
          <section className="mt-8 space-y-6">
            <h2 className="text-xl font-semibold" style={{ color: "#fff" }}>Confirm what we found</h2>
            {view.confirms.map((field) => (
              <FieldInput key={field.id} field={field} value={values[field.id] ?? ""} onChange={(v) => setValues({ ...values, [field.id]: v })} />
            ))}
          </section>
        )}

        {key.startsWith("ask-") && (
          <section className="mt-8 space-y-6">
            <h2 className="text-xl font-semibold" style={{ color: "#fff" }}>Still needed</h2>
            {askFields.map((field) => (
              <FieldInput key={field.id} field={field} value={values[field.id] ?? ""} onChange={(v) => setValues({ ...values, [field.id]: v })} />
            ))}
          </section>
        )}

        {key === "review" && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold" style={{ color: "#fff" }}>Review</h2>
            <p className="mt-2 text-sm" style={{ color: "#9aa0c3" }}>Checks we still cannot confirm are marked as an assumption in your Blueprint. We do not fill those in.</p>
            <ul className="mt-4 space-y-2">
              {view.completeness.rows.filter((r) => r.state === "missing").map((r) => (
                <li key={r.checkId} className="text-sm" style={{ color: "#e2e4f0" }}>{r.label}{r.optional ? " (optional)" : ""}: still open</li>
              ))}
            </ul>
          </section>
        )}

        {note && <p className="mt-4 text-sm" style={{ color: "#ff8a8a" }}>{note}</p>}
      </main>
      <div className="fixed inset-x-0 bottom-0 border-t px-4 py-3" style={{ background: NAVY, borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button type="button" disabled={step === 0 || saving} onClick={() => setStep((n) => Math.max(0, n - 1))} className="min-h-12 rounded-lg px-4 text-base disabled:opacity-30" style={{ color: "#e2e4f0", border: "1px solid rgba(255,255,255,0.15)" }}>Back</button>
          {key === "site" && view.demo && (
            <button type="button" disabled={saving} onClick={() => readSite(true)} className="min-h-12 flex-1 rounded-lg px-3 text-sm font-medium" style={{ color: GOLD, border: `1px solid ${GOLD}` }}>Use sample site</button>
          )}
          <button type="button" disabled={saving} onClick={next} className="min-h-12 flex-1 rounded-lg px-4 text-base font-semibold disabled:opacity-60" style={{ background: GOLD, color: NAVY }}>
            {saving ? "Saving…" : key === "review" ? "Save answers" : key === "site" ? "Read my site" : "Save and continue"}
          </button>
        </div>
      </div>
    </Shell>
  );
}

function Completeness({ view }: { view: View }) {
  const missing = view.completeness.rows.filter((r) => r.state === "missing").length;
  return (
    <div data-testid="completeness">
      <div className="mb-2 flex items-center justify-between text-sm" style={{ color: "#c4c8e0" }}>
        <span>Data completeness</span>
        <span>{view.completeness.percent}%</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-2 rounded-full" style={{ width: `${view.completeness.percent}%`, background: GOLD }} />
      </div>
      <p className="mt-2 text-xs" style={{ color: "#7c81a6" }}>{view.completeness.ready} of {view.completeness.total} checks are covered. {missing} still need something, and those stay marked as an assumption.</p>
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: Field; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-base font-medium" style={{ color: "#e2e4f0" }}>
        {field.label}{!field.optional && <span style={{ color: GOLD }}> *</span>}
        {field.optional && <span className="ml-2 text-xs font-normal" style={{ color: "#7c81a6" }}>Optional</span>}
      </label>
      {field.found && <p className="mt-1 text-sm" style={{ color: GOLD }}>{field.found}</p>}
      {field.help && <p className="mb-2 mt-1 text-sm leading-relaxed" style={{ color: "#7c81a6" }}>{field.help}</p>}
      {field.checkId === "rating_fold" && <p className="mb-2 text-sm" style={{ color: "#7c81a6" }}>We will not copy a rating off the page into your answers.</p>}
      {field.type === "textarea" && <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} className="w-full rounded-lg px-4 py-3 text-base" style={inputStyle} />}
      {field.type === "text" && <input value={value} onChange={(e) => onChange(e.target.value)} className="min-h-12 w-full rounded-lg px-4 text-base" style={inputStyle} />}
      {field.type === "number" && <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" className="min-h-12 w-full rounded-lg px-4 text-base" style={inputStyle} />}
      {(field.type === "select" || field.type === "choice") && (
        <div className="flex flex-col gap-2">
          {(field.options ?? []).map((opt) => {
            const active = value === opt.value;
            return (
              <button type="button" key={opt.value} onClick={() => onChange(active ? "" : opt.value)} className="min-h-12 rounded-lg px-4 text-left text-base" style={active ? { background: "rgba(201,168,76,0.18)", border: `1px solid ${GOLD}`, color: "#fff" } : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#c4c8e0" }}>{opt.label}</button>
            );
          })}
        </div>
      )}
      {field.type === "qa" && <QaEditor value={value} onChange={onChange} />}
    </div>
  );
}

function QaEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const rows = parseRows(value);
  function update(next: { question: string; answer: string }[]) {
    onChange(JSON.stringify(next.slice(0, 10)));
  }
  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="rounded-lg p-3" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
          <input value={row.question} onChange={(e) => update(rows.map((r, j) => j === i ? { ...r, question: e.target.value } : r))} placeholder="Question" className="min-h-12 w-full rounded-lg px-3 text-base" style={inputStyle} />
          <textarea value={row.answer} onChange={(e) => update(rows.map((r, j) => j === i ? { ...r, answer: e.target.value } : r))} placeholder="Answer, if you have one" rows={3} className="mt-2 w-full rounded-lg px-3 py-3 text-base" style={inputStyle} />
        </div>
      ))}
      {rows.length < 10 && (
        <button type="button" className="min-h-12 w-full rounded-lg text-base" style={{ color: GOLD, border: `1px solid ${GOLD}` }} onClick={() => update([...rows, { question: "", answer: "" }])}>Add a question</button>
      )}
    </div>
  );
}

function FaqPanel({ token, drafts, demo, resume, onResume, onDrafts }: { token: string; drafts: Draft[]; demo: boolean; resume: unknown; onResume: (v: unknown) => void; onDrafts: (d: Draft[]) => void }) {
  const [pending, setPending] = useState<Record<string, string>>({});
  const unanswered = drafts.filter((d) => d.status === "unanswered" || !d.answer);
  const rest = drafts.filter((d) => d.answer && d.status !== "unanswered");
  async function send(action: "faq-answer" | "faq-approve", draftId: string, answer?: string) {
    const res = await fetch(`/api/audit/onboarding/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(demo ? { action, draftId, answer, session: resume } : { action, draftId, answer }),
    });
    const data = await res.json();
    if (data.resume) onResume(data.resume);
    if (data.faqs?.drafts) onDrafts(data.faqs.drafts);
  }
  return (
    <div className="mt-8 space-y-4" data-testid="faq-drafts">
      <h2 className="text-xl font-semibold" style={{ color: "#fff" }}>FAQ drafts</h2>
      <p className="text-sm" style={{ color: "#9aa0c3" }}>Each answer says where it came from. Unanswered questions are listed for you. Nothing here is published.</p>
      {unanswered.map((d) => (
        <div key={d.id} className="rounded-lg p-3" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
          <p className="text-base" style={{ color: "#fff" }}>{d.question}</p>
          <p className="mt-1 text-xs" style={{ color: "#7c81a6" }}>Needs your answer. We did not invent one.</p>
          <textarea value={pending[d.id] ?? ""} onChange={(e) => setPending({ ...pending, [d.id]: e.target.value })} rows={3} className="mt-2 w-full rounded-lg px-3 py-3 text-base" style={inputStyle} />
          <button type="button" className="mt-2 min-h-12 rounded-lg px-4 text-base font-semibold" style={{ background: GOLD, color: NAVY }} onClick={() => send("faq-answer", d.id, pending[d.id] || "")}>Send this answer to Saabai</button>
        </div>
      ))}
      {rest.map((d) => (
        <div key={d.id} className="rounded-lg p-3" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
          <p className="text-base" style={{ color: "#fff" }}>{d.question}</p>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "#e2e4f0" }}>{d.answer}</p>
          <p className="mt-2 text-xs" style={{ color: "#7c81a6" }}>Source: {d.source === "client" ? "You wrote this." : "Taken from your website."} {d.sourceDetail}</p>
          {d.status === "admin_review" && <p className="mt-2 text-sm" style={{ color: GOLD }}>Waiting for Saabai to review. Not on your website.</p>}
          {d.status === "approved" && <p className="mt-2 text-sm" style={{ color: GOLD }}>Approved. Not published.</p>}
          {d.status === "client_review" && (
            <button type="button" className="mt-3 min-h-12 rounded-lg px-4 text-base font-semibold" style={{ background: GOLD, color: NAVY }} onClick={() => send("faq-approve", d.id)}>Approve this answer</button>
          )}
        </div>
      ))}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: NAVY }}>
      <div className="border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="mx-auto max-w-2xl px-4 py-4">
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

function seed(view: View): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of [...view.confirms, ...view.asks]) {
    const raw = field.value ?? field.suggestion;
    out[field.id] = raw === null || raw === undefined ? "" : String(raw);
  }
  return out;
}

function payload(view: View | null, values: Record<string, string>): Record<string, string | number | null> {
  const fields = [...(view?.confirms ?? []), ...(view?.asks ?? [])];
  const out: Record<string, string | number | null> = {};
  for (const field of fields) {
    const raw = (values[field.id] ?? "").trim();
    if (!raw) {
      out[field.id] = null;
      continue;
    }
    if (field.type === "number") {
      const n = Number(raw);
      out[field.id] = Number.isFinite(n) ? n : null;
    } else out[field.id] = raw;
  }
  return out;
}

function parseRows(value: string): { question: string; answer: string }[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [{ question: "", answer: "" }];
    const rows = parsed.slice(0, 10).map((item) => {
      const rec = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return { question: typeof rec.question === "string" ? rec.question : "", answer: typeof rec.answer === "string" ? rec.answer : "" };
    });
    return rows.length ? rows : [{ question: "", answer: "" }];
  } catch {
    return [{ question: "", answer: "" }];
  }
}
