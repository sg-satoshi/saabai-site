/** Masks emails and Stripe key fragments (sk_, rk_, pk_, whsec_) in a log string, capped at 300 chars. */
export function maskLogText(s: string): string {
  return s
    .replace(/[^\s@]+@[^\s@]+/g, "[email]")
    .replace(/\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9*]+/g, "[key]")
    .replace(/\b(?:sk|rk|pk|whsec)_[A-Za-z0-9*]+/g, "[key]")
    .slice(0, 300);
}

/** Stripe error cause only: name, type, code, param, message. No request body, customer data or secrets. */
export function stripeErrorFields(err: unknown): Record<string, string> {
  if (!err || typeof err !== "object") return { name: typeof err };
  const e = err as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const k of ["name", "type", "code", "param", "message"]) {
    if (typeof e[k] === "string") out[k] = maskLogText(e[k] as string);
  }
  return out;
}
