/**
 * Which request status changes email the client, and the first line of that email.
 * Internal steps (triaged, QA, blocked) stay off unless someone turns the switch on.
 * No server imports: the admin panel can use this in the browser.
 */

export const INTERNAL_REQUEST_STATUSES = ["triaged", "qa", "blocked"] as const;

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  received: "New",
  awaiting_client: "Awaiting client",
  triaged: "Triaged",
  in_progress: "In progress",
  qa: "QA / Review",
  blocked: "Blocked",
  done: "Done",
};

export function isInternalRequestStatus(status: string): boolean {
  return (INTERNAL_REQUEST_STATUSES as readonly string[]).includes(status);
}

/** Client-facing steps default to emailing. Internal steps default to not emailing. */
export function notifyClientDefault(status: string): boolean {
  return !isInternalRequestStatus(status);
}

/**
 * Explicit true or false wins. A missing flag follows the status default,
 * so an old client that omits the flag does not email a Triaged or QA change.
 */
export function shouldEmailStatus(status: string, notifyClient: unknown): boolean {
  if (notifyClient === false) return false;
  if (notifyClient === true) return true;
  return notifyClientDefault(status);
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] || status || "updated";
}

/** Plain first sentence, lowercase, straight quotes. The preview shows this after "Hi {name}, ". */
export function statusLeadPlain(status: string, title: string): string {
  const quoted = `"${title}"`;
  if (status === "done") return `good news, your request ${quoted} is done.`;
  if (status === "in_progress") return `quick update: work has started on ${quoted}.`;
  if (status === "awaiting_client") return `we need a quick detail from you on ${quoted}.`;
  const label = statusLabel(status).toLowerCase();
  return `your request ${quoted} is now marked as ${label}.`;
}

export function statusEmailSubject(title: string): string {
  return `Update on your request: ${title}`;
}

export function statusEmailFirstLine(status: string, title: string, clientName?: string): string {
  const first = (clientName || "").split(" ")[0] || "there";
  return `Hi ${first}, ${statusLeadPlain(status, title)}`;
}

export function statusTimelineLine(fromStatus: string, toStatus: string, emailed: boolean): string {
  return `Status: ${statusLabel(fromStatus)} → ${statusLabel(toStatus)} · ${emailed ? "Client emailed" : "Client not emailed"}`;
}
