import type { EvalResult } from "./run-one";

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

export function summarise(results: EvalResult[]): string {
  const models = [...new Set(results.map((r) => r.model))];
  const rows = models.map((m) => {
    const rs = results.filter((r) => r.model === m);
    const ok = rs.filter((r) => r.ok);
    const ms = ok.map((r) => r.ms).sort((a, b) => a - b);
    const urls = ok.reduce((a, r) => a + r.urls, 0);
    const grounded = ok.reduce((a, r) => a + r.groundedUrls, 0);
    return [
      m, `${ok.length}/${rs.length}`, pct(avg(ok.map((r) => r.accuracy))),
      ok.reduce((a, r) => a + r.wrongHit.length, 0), avg(ok.map((r) => r.citations)).toFixed(1),
      urls ? pct(grounded / urls) : "n/a", `${urls - grounded}`,
      `${(avg(ms) / 1000).toFixed(1)}s`, `${((ms[Math.floor(ms.length / 2)] ?? 0) / 1000).toFixed(1)}s`,
      `US$${avg(ok.map((r) => r.costUsd)).toFixed(3)}`, `US$${ok.reduce((a, r) => a + r.costUsd, 0).toFixed(2)}`,
      ok.reduce((a, r) => a + r.emDashes, 0), ok.reduce((a, r) => a + r.markdown, 0),
    ];
  });
  const head = ["Model", "Answered", "Key points hit", "Known errors", "Citations per answer", "URLs from search results", "URLs not from search", "Mean time", "Median time", "Cost per answer", "Total cost", "Em dashes", "Markdown"];
  return [head, head.map(() => "---"), ...rows].map((r) => `| ${r.join(" | ")} |`).join("\n");
}
