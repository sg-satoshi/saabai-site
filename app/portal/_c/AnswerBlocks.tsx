import Link from "next/link";
import type { Q, Value } from "./QuestionField";

export function show(v: Value | undefined): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (Array.isArray(v)) return v.length ? v.join(", ") : null;
  return String(v);
}

export default function AnswerBlocks({ id, sections, questions, answers, editable }: {
  id: string;
  sections: { id: string; title: string }[];
  questions: (Q & { section: string })[];
  answers: Record<string, Value>;
  editable: boolean;
}) {
  const num = new Map(questions.map((q, i) => [q.id, i + 1]));
  return (
    <>
      {sections.map((s) => {
        const qs = questions.filter((q) => q.section === s.id);
        const blanks = qs.filter((q) => show(answers[q.id]) === null).length;
        return (
          <section key={s.id} className="bp-rv" aria-label={s.title}>
            <header>
              <div>
                <b>{s.title}</b>{" "}
                {blanks === 0 ? <span className="bp-chip ok">Complete</span> : <span className="bp-chip warn">{blanks} blank</span>}
              </div>
              {editable && <Link className="bp-btn ghost" style={{ minHeight: 40 }} href={`/portal/${id}/factfind?s=${s.id}`}>Edit</Link>}
            </header>
            <dl>
              {qs.map((q) => {
                const v = show(answers[q.id]);
                return (
                  <div className="r" key={q.id}>
                    <dt><span className="mono">Q{num.get(q.id)}</span> {q.label}{q.required && v === null ? " (required)" : ""}</dt>
                    <dd>{v ?? <span className="blank">Not answered yet</span>}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        );
      })}
    </>
  );
}
