/**
 * Research step list built from the AI SDK UI message stream, plus small thread helpers
 * for the command palette and Share menu. Pure so it can be tested.
 */
export type StepStatus = "running" | "done" | "empty" | "failed";
export type LexStep = { id: string; tool: string; status: StepStatus; count?: number };

type Part = { type?: string; toolCallId?: string; toolName?: string; output?: unknown; errorText?: string };

const HIDDEN = new Set(["captureMatter"]);

/** Applies one stream part to the step list. Returns the same array when nothing changed. */
export function applyStepPart(steps: LexStep[], part: Part): LexStep[] {
  if (!part || typeof part.type !== "string") return steps;
  if (part.type === "tool-input-start" && part.toolCallId && part.toolName) {
    if (HIDDEN.has(part.toolName) || steps.some((s) => s.id === part.toolCallId)) return steps;
    return [...steps, { id: part.toolCallId, tool: part.toolName, status: "running" }];
  }
  const i = steps.findIndex((s) => s.id === part.toolCallId);
  if (i < 0) return steps;
  let next: LexStep | null = null;
  if (part.type === "tool-output-error") next = { ...steps[i], status: "failed" };
  if (part.type === "tool-output-available") {
    const out = (part.output ?? {}) as { ok?: boolean; results?: unknown[] };
    if (out.ok === false) next = { ...steps[i], status: "failed" };
    else if (Array.isArray(out.results)) next = { ...steps[i], status: out.results.length ? "done" : "empty", count: out.results.length };
    else next = { ...steps[i], status: "done" };
  }
  if (!next) return steps;
  const copy = steps.slice();
  copy[i] = next;
  return copy;
}

export function stepSummary(steps: LexStep[]) {
  const searches = steps.filter((s) => s.tool !== "readSource" && s.tool !== "verifySection");
  return {
    failed: steps.filter((s) => s.status === "failed").length,
    empty: searches.filter((s) => s.status === "empty").length,
    found: searches.reduce((n, s) => n + (s.count ?? 0), 0),
    /** Every search finished with nothing usable. */
    noResults: searches.length > 0 && searches.every((s) => s.status === "empty" || s.status === "failed"),
  };
}

type Msg = { role: string; content: string };
type ThreadLike = { id: string; title: string; messages: Msg[]; createdAt?: number };

/** Threads for the Ctrl K palette: title matches first, then content matches. */
export function searchThreads<T extends ThreadLike>(threads: T[], query: string, limit = 8): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return threads.slice(0, limit);
  const terms = q.split(/\s+/);
  const has = (s: string) => terms.every((t) => s.includes(t));
  const title = threads.filter((t) => has(t.title.toLowerCase()));
  const body = threads.filter((t) => !title.includes(t) && has(t.messages.map((m) => m.content).join(" ").toLowerCase()));
  return [...title, ...body].slice(0, limit);
}

/** Short snippet around the first match, for the palette row. */
export function matchSnippet(thread: ThreadLike, query: string, width = 90): string {
  const q = query.trim().toLowerCase().split(/\s+/)[0];
  const text = thread.messages.map((m) => m.content).join(" ").replace(/\[\[cite:[^\]]*\]\]/g, "").replace(/\s+/g, " ");
  if (!q) return text.slice(0, width);
  const at = text.toLowerCase().indexOf(q);
  if (at < 0) return text.slice(0, width);
  const start = Math.max(0, at - 30);
  return (start > 0 ? "..." : "") + text.slice(start, start + width);
}

/** mailto bodies over about 2000 characters fail in some mail apps. */
export function mailtoHref(subject: string, body: string, max = 1800): string {
  const b = body.length > max ? body.slice(0, max).trimEnd() + "\n\n[Shortened. Use Copy research thread for the full text.]" : body;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(b)}`;
}
