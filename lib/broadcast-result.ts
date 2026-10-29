/** Turns the broadcast route's response into the message the admin panel shows (#341). Client-safe. */
export const NONE_SENT_MSG = "No opted-in subscribers in this selection, so nothing was sent.";

export type BroadcastResultView = { kind: "ok" | "none" | "error"; msg: string };

export function broadcastResult(ok: boolean, data: unknown): BroadcastResultView {
  const d = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const sent = num(d.sent);
  const failed = num(d.failed);
  const total = num(d.total);
  const suppressed = Array.isArray(d.suppressed) ? d.suppressed.length : num(d.suppressed);
  const skipped = suppressed > 0 ? ` ${suppressed} unsubscribed or not opted in ${suppressed === 1 ? "was" : "were"} skipped.` : "";
  const error = typeof d.error === "string" ? d.error : "";

  // The route answers 400 when nobody in the selection can receive marketing email.
  if ((!ok && /opted in/i.test(error)) || (ok && total === 0 && sent === 0 && failed === 0)) {
    return { kind: "none", msg: NONE_SENT_MSG };
  }
  if (!ok) return { kind: "error", msg: error ? `Nothing was sent: ${error}` : "Nothing was sent. The server refused the broadcast." };
  if (failed > 0) return { kind: "error", msg: `${sent} sent, ${failed} failed.${skipped}` };
  return { kind: "ok", msg: `Sent to ${sent} subscriber${sent === 1 ? "" : "s"}.${skipped}` };
}
