/**
 * Browser-side idempotency id for one money submission (no server imports, safe in client components).
 *
 * One SubmissionKey per form. key(payload) returns the same id while the payload is unchanged
 * (so a double click or network retry of the SAME submission collapses in Stripe), and a fresh id
 * as soon as any field changes. After an attempt the form calls settle(outcome):
 *  - "success": renew, so a genuine second sale never reuses the key.
 *  - "definite": a clear 4xx / validation failure / card decline (nothing was created or charged): renew.
 *  - "ambiguous": thrown or aborted fetch, timeout, 5xx, 408/409/425/429, Stripe connection or API error.
 *    Stripe may already have succeeded, so KEEP the id: an identical retry is deduplicated by Stripe
 *    (the server key also hashes the details, and any field change still rotates the id).
 */
export function newRequestId(): string {
  return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, "");
}

export type SubmitOutcome = "success" | "definite" | "ambiguous";

/** Outcome of an HTTP response from a money route. Only a definite client error is "definite". */
export function httpOutcome(status: number): SubmitOutcome {
  if (status >= 200 && status < 300) return "success";
  if (status >= 400 && status < 500 && ![408, 409, 425, 429].includes(status)) return "definite";
  return "ambiguous";
}

/** Outcome of a Stripe.js confirm error. Card declines and validation errors are definite; anything else
 *  (api_connection_error, api_error, rate_limit_error, unknown) may have charged, so it is ambiguous. */
export function stripeErrorOutcome(err: { type?: string } | null | undefined): SubmitOutcome {
  if (!err) return "success";
  return err.type === "card_error" || err.type === "validation_error" ? "definite" : "ambiguous";
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
  /** Apply the keep-or-renew rule for one finished attempt. */
  settle(outcome: SubmitOutcome): void {
    if (outcome !== "ambiguous") this.renew();
  }
  /** Drop the current id (after success or a definite failure). */
  renew(): void {
    this.id = this.gen();
    this.sig = null;
  }
}
