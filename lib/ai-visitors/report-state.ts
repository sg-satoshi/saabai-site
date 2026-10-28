/** Whether the AI visitors report may show counts. A failed load is unknown, not zero. */

export type AiVisitorPanelMode = "unknown" | "report" | "pending";

export function aiVisitorPanelMode(input: {
  error: string;
  lastError: string;
  partialDays: number;
  hasReport: boolean;
  collecting: boolean;
}): AiVisitorPanelMode {
  const noHistory = input.partialDays <= 0;
  if (noHistory && (input.error || input.lastError)) return "unknown";
  if (noHistory && (input.collecting || !input.hasReport)) return "pending";
  if (input.hasReport) return "report";
  if (input.error || input.lastError) return "unknown";
  return "pending";
}
