import Link from "next/link";
import Shell from "../_c/Shell";
import { loadPortalPage } from "../_c/load";

export default async function Home({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { snap, ref, plan } = await loadPortalPage(id);
  const p = snap.progress;
  const first = (snap.contactName || "").split(/\s+/)[0] || "there";
  const next = p.sections.find((s) => s.state !== "done");
  const chip = (state: string) =>
    state === "done" ? <span className="bp-chip ok">Done</span> : state === "partial" ? <span className="bp-chip info">In progress</span> : <span className="bp-chip neu">Not started</span>;
  return (
    <Shell id={id} active="home" orderRef={ref} planName={plan} name={first}>
      <h1>{p.answered === 0 ? `Welcome, ${first}.` : `Welcome back, ${first}.`}</h1>
      <p className="lead">{snap.locked ? "Your fact-find is submitted and with our team." : "Pick up where you left off. Everything saves as you go."}</p>
      <section className="bp-card" aria-label="Overall progress">
        <div className="bp-row" style={{ alignItems: "flex-end" }}>
          <div>
            <span className="bp-eyebrow mono">Overall progress</span>
            <div style={{ fontSize: 48, fontWeight: 700, color: "var(--navy)", lineHeight: 1.1 }}>{p.percent}%</div>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="bp-bar" role="progressbar" aria-label="Fact-find progress" aria-valuenow={p.percent} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${p.percent}%` }} /></div>
            <p style={{ margin: "10px 0 0", color: "var(--muted)" }}>
              {snap.locked ? `Submitted ${new Date(snap.submittedAt!).toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "long", year: "numeric" })}.`
                : next ? <>Next step: <b>{next.title}</b> ({next.total - next.answered} question{next.total - next.answered === 1 ? "" : "s"} left).</> : "Every question is answered. Review and submit when you are ready."}
            </p>
          </div>
        </div>
        <div className="bp-foot-actions">
          <span className="mono" style={{ fontSize: 13, color: "var(--muted)" }}>{p.answered} of {p.totalQuestions} answered · {p.sections.length} sections</span>
          {snap.locked
            ? <Link className="bp-btn ghost" href={`/portal/${id}/submitted`}>View my submission</Link>
            : <Link className="bp-btn" href={`/portal/${id}/factfind`}>{p.answered === 0 ? "Start fact-find" : "Continue fact-find"}</Link>}
        </div>
      </section>
      <section className="bp-card" aria-label="Fact-find sections">
        <h2>Fact-find sections</h2>
        <div className="bp-list">
          {p.sections.map((s, i) => (
            <Link key={s.id} href={snap.locked ? `/portal/${id}/submitted` : `/portal/${id}/factfind?s=${s.id}`}>
              <span><span className="mono" style={{ color: "var(--muted)", marginRight: 12 }}>{String(i + 1).padStart(2, "0")}</span>{s.title}</span>
              {chip(s.state)}
            </Link>
          ))}
        </div>
      </section>
    </Shell>
  );
}
