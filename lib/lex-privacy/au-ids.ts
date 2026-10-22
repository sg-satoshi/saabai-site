/**
 * Australian identifier checksums (official ATO, ASIC and Services Australia algorithms).
 * Used by the PII scanner so an unlabelled number is only masked as an ABN, ACN, TFN or Medicare
 * number when its checksum is valid. Pure functions, no I/O.
 */
const digitsOf = (s: string) => s.replace(/\D/g, "");

/** ABN: subtract 1 from the first digit, weight, sum mod 89 is 0. */
export function isValidABN(s: string): boolean {
  const d = digitsOf(s);
  if (!/^\d{11}$/.test(d) || d[0] === "0") return false;
  const w = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  let sum = 0;
  for (let i = 0; i < 11; i++) sum += (Number(d[i]) - (i === 0 ? 1 : 0)) * w[i];
  return sum % 89 === 0;
}

/** ACN (and ARBN): weights 8..1 over the first 8 digits, check digit is (10 - sum mod 10) mod 10. */
export function isValidACN(s: string): boolean {
  const d = digitsOf(s);
  if (!/^\d{9}$/.test(d)) return false;
  const w = [8, 7, 6, 5, 4, 3, 2, 1];
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(d[i]) * w[i];
  return (10 - (sum % 10)) % 10 === Number(d[8]);
}

/** TFN: 9 digit (and legacy 8 digit) weighted sum mod 11 is 0. */
export function isValidTFN(s: string): boolean {
  const d = digitsOf(s);
  const w = d.length === 9 ? [1, 4, 3, 7, 5, 8, 6, 9, 10] : d.length === 8 ? [10, 7, 8, 4, 6, 3, 5, 1] : null;
  if (!w || /^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) sum += Number(d[i]) * w[i];
  return sum % 11 === 0;
}

/** Medicare: 10 digits (11 with the IRN), first digit 2 to 6, check digit is weighted sum of first 8 mod 10. */
export function isValidMedicare(s: string): boolean {
  const d = digitsOf(s);
  if (!/^[2-6]\d{9,10}$/.test(d)) return false;
  const w = [1, 3, 7, 9, 1, 3, 7, 9];
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(d[i]) * w[i];
  if (sum % 10 !== Number(d[8])) return false;
  // Issue number (10th digit) and IRN (11th) are 1 to 9.
  return d[9] !== "0" && (d.length === 10 || d[10] !== "0");
}

/** Real Australian phone ranges: mobiles, geographic landlines, 13, 1300, 1800, with or without +61. */
export function isAuPhone(s: string): boolean {
  let d = digitsOf(s);
  if (s.trim().startsWith("+61") || (d.startsWith("61") && d.length === 11)) d = "0" + d.slice(2);
  if (/^0[2378]\d{8}$/.test(d)) return true; // landline
  if (/^04\d{8}$/.test(d)) return true; // mobile
  if (/^1[38]00\d{6}$/.test(d)) return true; // 1300 / 1800
  if (/^13\d{4}$/.test(d)) return true; // 13 xx xx
  return false;
}
