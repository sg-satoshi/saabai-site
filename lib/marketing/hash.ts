import { createHash } from "node:crypto";

/** SHA-256 hex, as Meta's Conversions API expects for hashed user data. */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Meta email normalisation: trim and lowercase. Periods stay (Meta does not strip them).
 * Returns null when the value is not a usable email.
 */
export function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const email = raw.trim().toLowerCase();
  if (!email || email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

/**
 * Meta phone normalisation: digits only, country code included, no leading trunk zero.
 * Australian numbers are the default (Saabai is in Australia). 0412 345 678 becomes 61412345678.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("61")) {
    if (digits.startsWith("610")) digits = `61${digits.slice(3)}`;
  } else if (digits.startsWith("0")) {
    digits = `61${digits.slice(1)}`;
  } else if (digits.length === 9 && /^[23478]/.test(digits)) {
    digits = `61${digits}`;
  }
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

export function hashEmail(raw: string | null | undefined): string | null {
  const email = normalizeEmail(raw);
  return email ? sha256(email) : null;
}

export function hashPhone(raw: string | null | undefined): string | null {
  const phone = normalizePhone(raw);
  return phone ? sha256(phone) : null;
}
