/**
 * Browser-side idempotency id for one money submission (no server imports, safe in client components).
 *
 * One SubmissionKey per form. key(payload) returns the same id while the payload is unchanged
 * (so a double click or network retry of the SAME submission collapses in Stripe), and a fresh id
 * as soon as any field changes. renew() is called after any error and after success, so a corrected
 * resubmit or a genuine second sale never reuses a key.
 */
export function newRequestId(): string {
  return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, "");
}

export class SubmissionKey {
  private id: string;
  private sig: string | null = null;
  constructor(private readonly gen: () => string = newRequestId) {
    this.id = gen();
  }
  /** Id for this payload: unchanged payload keeps the id, a changed payload gets a new one. */
  key(payload: unknown): string {
    const sig = JSON.stringify(payload ?? null);
    if (this.sig !== null && this.sig !== sig) this.id = this.gen();
    this.sig = sig;
    return this.id;
  }
  /** Drop the current id (after an error or a completed submission). */
  renew(): void {
    this.id = this.gen();
    this.sig = null;
  }
}
