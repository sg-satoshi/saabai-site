/** Safe log fields for a failed Lex signup Stripe call. No request body, customer data or secrets. */

/** Masks emails and Stripe key or secret fragments (sk_, rk_, pk_, whsec_), keeping only the prefix. */
export function maskSecrets(s: string): string {
  return s
    .replace(/[^\s@]+@[^\s@]+/g, "[email]")
    .replace(/\b(sk|rk|pk)_(live|test)_[A-Za-z0-9*.]+/g, "$1_$2_[redacted]")
    .replace(/\b(sk|rk)_(?!live_|test_)[A-Za-z0-9*.]{4,}/g, "$1_[redacted]")
    .replace(/\bwhsec_[A-Za-z0-9*.]+/g, "whsec_[redacted]");
}

/** Stripe error cause only: name, type, code, param, message. Each masked and capped at 300 chars. */
export function stripeErrorFields(err: unknown): Record<string, string> {
  if (!err || typeof err !== "object") return { name: typeof err };
  const e = err as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const k of ["name", "type", "code", "param", "message"]) {
    if (typeof e[k] === "string") out[k] = maskSecrets(e[k] as string).slice(0, 300);
  }
  return out;
}
