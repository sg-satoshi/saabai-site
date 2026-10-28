/** Shown in place of the report card when AI visitor counts were not loaded. */
export function AiVisitorsStatus({ mode, message }: { mode: "unknown" | "pending"; message?: string }) {
  if (mode === "pending") {
    return <div className="aiv-banner" role="status" data-state="pending">Checking AI visitor logs…</div>;
  }
  return (
    <div className="card" role="alert" data-state="unknown" style={{ marginBottom: 16 }}>
      <div className="aiv-hero">
        <div className="aiv-kicker">Report</div>
        <h3>AI visitor counts are unknown.</h3>
        <p>Couldn&apos;t load AI visitor data.{message ? ` ${message}` : ""}</p>
      </div>
    </div>
  );
}
