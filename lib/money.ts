/**
 * Price formatting for Mia. House style is "$2,000": dollar sign, comma for
 * thousands, no decimals unless the amount has cents. Deterministic, so it
 * never depends on the runtime's Intl/ICU data.
 */

/** Group an integer string with commas: "12480" → "12,480". */
function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** 2000 → "$2,000", 1497 → "$1,497", 497 → "$497". */
export function formatAud(n: number): string {
  const neg = n < 0;
  const abs = Math.abs(n);
  const whole = Math.trunc(abs);
  const cents = Math.round((abs - whole) * 100);
  const base = `$${groupThousands(String(whole))}${cents ? "." + String(cents).padStart(2, "0") : ""}`;
  return neg ? `-${base}` : base;
}

/**
 * Add thousands commas to dollar amounts written without them, in model output:
 * "$2000" → "$2,000", "$12480.50" → "$12,480.50". Amounts already written
 * "$2,000" and numbers without a "$" are left alone.
 */
export function formatPrices(text: string): string {
  if (!text || !text.includes("$")) return text;
  return text.replace(/\$(\d{4,})(?![\d,])/g, (_m, d: string) => `$${groupThousands(d)}`);
}
