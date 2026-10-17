"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QuestionField, { type Q, type Value } from "../../_c/QuestionField";

interface Section { id: string; title: string; description?: string }
interface SecProg { id: string; state: "empty" | "partial" | "done" }
interface Initial {
  id: string; version: number; sections: Section[]; questions: (Q & { section: string })[];
  answers: Record<string, Value>; progress: { sections: SecProg[] };
}
type Pill = { kind: "saved" | "saving" | "err"; at?: number; msg?: string };

function ago(at: number, now: number): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 45) return "Saved just now";
  const m = Math.round(s / 60);
  return `Saved ${m} min ago`;
}

export default function FactFindPortal({ initial, startSection }: { initial: Initial; startSection: string }) {
  const router = useRouter();
  const idx0 = Math.max(0, initial.sections.findIndex((s) => s.id === startSection));
  const [step, setStep] = useState(idx0);
  const [answers, setAnswers] = useState<Record<string, Value>>(initial.answers);
  const [secState, setSecState] = useState<Record<string, string>>(Object.fromEntries(initial.progress.sections.map((s) => [s.id, s.state])));
  const [pill, setPill] = useState<Pill>({ kind: "saved", at: undefined });
  const [now, setNow] = useState(Date.now());
  const [conflict, setConflict] = useState<{ version: number; answers: Record<string, Value> } | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const ans = useRef(answers); ans.current = answers;
  const version = useRef(initial.version);
  const dirty = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Promise<boolean> | null>(null);

  const qnum = useMemo(() => new Map(initial.questions.map((q, i) => [q.id, i + 1])), [initial.questions]);
  const sec = initial.sections[step];
  const qs = initial.questions.filter((q) => q.section === sec.id);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 20000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty.current.size > 0) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);
  useEffect(() => { const u = new URL(window.location.href); u.searchParams.set("s", sec.id); window.history.replaceState(null, "", u); }, [sec.id]);

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (inflight.current) await inflight.current.catch(() => false);
    if (dirty.current.size === 0) return true;
    const keys = [...dirty.current];
    dirty.current = new Set();
    const payload = Object.fromEntries(keys.map((k) => [k, ans.current[k] === undefined ? null : ans.current[k]]));
    setPill({ kind: "saving" });
    const run = (async () => {
      try {
        const r = await fetch(`/api/portal/blueprint/${initial.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: payload, version: version.current }) });
        if (r.ok) {
          const d = await r.json();
          version.current = d.version;
          setSecState(Object.fromEntries(d.progress.sections.map((s: SecProg) => [s.id, s.state])));
          setPill({ kind: "saved", at: Date.now() });
          setNow(Date.now());
          return true;
        }
        keys.forEach((k) => dirty.current.add(k));
        if (r.status === 409) { const d = await r.json(); setConflict({ version: d.version, answers: d.answers }); setPill({ kind: "err", msg: "Changed somewhere else" }); return false; }
        if (r.status === 423) { router.replace(`/portal/${initial.id}/submitted`); return false; }
        if (r.status === 401) { setPill({ kind: "err", msg: "Signed out. Sign in again to keep saving" }); return false; }
        if (r.status === 422) { setPill({ kind: "err", msg: "One answer could not be saved. Please check your entries" }); return false; }
        throw new Error("retry");
      } catch {
        keys.forEach((k) => dirty.current.add(k));
        setPill({ kind: "err", msg: "Not saved yet, we will retry" });
        if (retry.current) clearTimeout(retry.current);
        retry.current = setTimeout(() => { void flush(); }, 5000);
        return false;
      }
    })();
    inflight.current = run;
    const ok = await run;
    inflight.current = null;
    return ok;
  }, [initial.id, router]);

  function setVal(id: string, v: Value) {
    setAnswers((p) => ({ ...p, [id]: v }));
    ans.current = { ...ans.current, [id]: v };
    dirty.current.add(id);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flush(); }, 1500);
  }

  async function go(delta: number) {
    setBusy(true);
    const ok = await flush();
    setBusy(false);
    if (!ok) return;
    if (step + delta >= initial.sections.length) { router.push(`/portal/${initial.id}/review`); return; }
    setStep(Math.max(0, step + delta));
    window.scrollTo({ top: 0 });
  }

  async function later() {
    setBusy(true);
    const ok = await flush();
    if (ok) {
      await fetch(`/api/portal/blueprint/${initial.id}/link`, { method: "POST" }).catch(() => null);
      setNotice("Saved. We have emailed you a fresh link so you can pick up right where you stopped. It is safe to close this page.");
    }
    setBusy(false);
  }

  function keepMine() {
    if (!conflict) return;
    const merged = { ...conflict.answers };
    for (const k of dirty.current) merged[k] = ans.current[k] ?? null;
    version.current = conflict.version;
    setAnswers(merged); ans.current = merged;
    setConflict(null);
    void flush();
  }

  const pillText = pill.kind === "saving" ? "Saving..." : pill.kind === "err" ? pill.msg : pill.at ? ago(pill.at, now) : "Saves automatically";
  const last = step === initial.sections.length - 1;

  return (
    <>
      <div className="bp-row" style={{ alignItems: "flex-start" }}>
        <div>
          <span className="bp-eyebrow mono">Section {step + 1} of {initial.sections.length}</span>
          <h1>{sec.title}</h1>
          {sec.description && <p className="lead" style={{ marginBottom: 12 }}>{sec.description}</p>}
        </div>
        <span className={`bp-pill ${pill.kind === "saving" ? "saving" : pill.kind === "err" ? "err" : ""}`} role="status" aria-live="polite">{pillText}</span>
      </div>
      <div className="bp-steps" style={{ ["--n" as string]: initial.sections.length }} role="progressbar" aria-label="Section progress" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={initial.sections.length}>
        {initial.sections.map((s, i) => (
          <a key={s.id} href={`?s=${s.id}`} aria-label={`${s.title}: ${secState[s.id] === "done" ? "done" : secState[s.id] === "partial" ? "in progress" : "not started"}`} className={i === step ? "cur" : secState[s.id] === "done" ? "done" : secState[s.id] === "partial" ? "partial" : ""}
            onClick={(e) => { e.preventDefault(); void (async () => { if (await flush()) { setStep(i); window.scrollTo({ top: 0 }); } })(); }} />
        ))}
      </div>
      {conflict && (
        <div className="bp-banner warn" role="alert">
          This fact-find was changed in another tab or device. <button className="bp-btn ghost" style={{ minHeight: 40, marginLeft: 8 }} onClick={() => window.location.reload()}>Load the latest</button>{" "}
          <button className="bp-btn ghost" style={{ minHeight: 40 }} onClick={keepMine}>Keep what I typed here</button>
        </div>
      )}
      {notice && <div className="bp-banner info" role="status">{notice}</div>}
      <div className="bp-card" style={{ paddingTop: 8, paddingBottom: 8 }}>
        {qs.map((q) => (
          <QuestionField key={q.id} q={q} n={qnum.get(q.id) ?? 0} value={answers[q.id] ?? null} onChange={(v) => setVal(q.id, v)} onBlur={() => { void flush(); }} />
        ))}
      </div>
      <div className="bp-foot-actions">
        <button className="bp-btn ghost" onClick={() => go(-1)} disabled={busy || step === 0}>Back</button>
        <button className="bp-btn ghost" onClick={later} disabled={busy}>Save and come back later</button>
        <button className="bp-btn" onClick={() => go(1)} disabled={busy}>{last ? "Save and review" : "Save and continue"}</button>
      </div>
      <p className="bp-note">Your answers save automatically as you type. Leaving is safe.</p>
    </>
  );
}
