import { redirect } from "next/navigation";
import Shell from "../../_c/Shell";
import { loadPortalPage } from "../../_c/load";
import AnswerBlocks from "../../_c/AnswerBlocks";

export default async function Submitted({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { snap, ref, plan } = await loadPortalPage(id);
  if (!snap.locked) redirect(`/portal/${id}/review`);
  const first = (snap.contactName || "").split(/\s+/)[0] || "there";
  const when = new Date(snap.submittedAt!).toLocaleString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });
  return (
    <Shell id={id} active="review" orderRef={ref} planName={plan} name={first}>
      <div className="bp-card" role="status">
        <span className="bp-chip ok">Submitted and locked</span>
        <h1 style={{ marginTop: 12 }}>Thanks, {first}. We have it.</h1>
        <p className="lead" style={{ marginBottom: 12 }}>Submitted {when} (Brisbane time). We have emailed you a confirmation.</p>
        <h2>What happens next</h2>
        <ol style={{ margin: "8px 0 0", paddingLeft: 22, color: "var(--muted)" }}>
          <li>We review your answers and may reach out with a question or two.</li>
          <li>We prepare your Blueprint.</li>
          <li>You receive it here and by email.</li>
        </ol>
        <p style={{ margin: "16px 0 0", color: "var(--muted)" }}>Need to change something? Reply to our email and we will reopen your fact-find.</p>
      </div>
      <h2 style={{ margin: "28px 0 12px" }}>Your submitted answers</h2>
      <AnswerBlocks id={id} sections={snap.sections} questions={snap.questions} answers={snap.answers} editable={false} />
    </Shell>
  );
}
