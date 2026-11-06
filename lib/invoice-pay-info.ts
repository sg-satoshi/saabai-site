// Server-only: bank details for invoice payment info come from env vars.
// Never NEXT_PUBLIC. If any are unset, callers render a safe fallback.
export type PayInfo = { accountName: string; bsb: string; accountNumber: string };

export const PAY_INFO_FALLBACK = "Payment details provided on request: hello@saabai.ai";

export function getPayInfo(): PayInfo | null {
  const accountName = process.env.INVOICE_BANK_ACCOUNT_NAME?.trim();
  const bsb = process.env.INVOICE_BANK_BSB?.trim();
  const accountNumber = process.env.INVOICE_BANK_ACCOUNT_NUMBER?.trim();
  if (!accountName || !bsb || !accountNumber) return null;
  return { accountName, bsb, accountNumber };
}
