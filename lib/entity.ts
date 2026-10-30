/**
 * Single source of truth for Saabai's legal entity.
 *
 * Saabai Pty Ltd trades as "Saabai". When the ACN and the company ABN are
 * issued, set them below (digits with the usual spacing, e.g. "123 456 789").
 * Until then they are empty and NOTHING about ACN/ABN is rendered anywhere:
 * no label, no placeholder. Every helper here hides a missing number.
 *
 * Client-safe: no secrets, no env, no server imports.
 */

export const LEGAL_NAME = "Saabai Pty Ltd";
export const TRADING_AS = "Saabai";
/** Australian Company Number. Empty until issued. */
export const ACN: string = "";
/** Company ABN. Empty until issued. Not the old sole-trader ABN. */
export const ABN: string = "";
/** Public suburb address used on the site and in email sender lines. */
export const PUBLIC_ADDRESS = "Merrimac QLD 4226, Australia";
/** Company registered/issuer address for invoices. "ADDRESS_PENDING" until confirmed; never rendered while pending. */
export const ENTITY_ADDRESS: string = "ADDRESS_PENDING";
export const isPending = (v: string) => /_PENDING$/.test(v.trim());
/** Issuer address for invoices, or "" while ENTITY_ADDRESS is still the placeholder. */
export const issuerAddress = (addr: string = ENTITY_ADDRESS) => (isPending(addr) ? "" : addr.trim());

/**
 * GST. false: the live "GST not applicable" wording. true: prices are GST-inclusive (same amounts),
 * invoices are tax invoices and show GST = price / 11.
 */
export const GST_REGISTERED: boolean = false;

export function gstCopy(registered: boolean = GST_REGISTERED) {
  return registered
    ? {
        short: "including GST",
        pricesLine: "Prices in AUD and include GST.",
        pricePhrase: "AUD, including GST",
        offerSuffix: "AUD. Includes GST.",
        terms: "All prices are in Australian dollars and include GST unless stated otherwise.",
        faq: "Yes. All prices are in Australian dollars and include GST.",
        contactRow: "Prices include GST",
        invoiceTitle: "TAX INVOICE",
        llms: "All prices are in AUD and include GST.",
      }
    : {
        short: "GST not applicable",
        pricesLine: "Prices in AUD. GST not applicable.",
        pricePhrase: "AUD, GST not applicable",
        offerSuffix: "AUD. GST not applicable.",
        terms: "Prices are in Australian dollars. Saabai is not registered for GST, so GST is not applicable and invoices are not tax invoices. If this changes we will update our prices and invoices.",
        faq: "Yes. All prices are in Australian dollars. GST not applicable.",
        contactRow: "Not applicable",
        invoiceTitle: "INVOICE",
        llms: "All prices are in AUD. Saabai is not GST registered (GST not applicable).",
      };
}
export const GST = gstCopy();

/** GST included in a GST-inclusive amount (price / 11), rounded to cents. 0 when not registered. */
export function gstOf(total: number, registered: boolean = GST_REGISTERED): number {
  return registered ? Math.round((total / 11) * 100) / 100 : 0;
}
export const ENTITY_EMAIL = "hello@saabai.ai";

const clean = (v: string) => v.trim();
export const hasAcn = () => clean(ACN).length > 0;
export const hasAbn = () => clean(ABN).length > 0;

/** "ACN 123 456 789, ABN 12 345 678 901", or only the ones present, or "". */
export function entityIds(acn: string = ACN, abn: string = ABN): string {
  const parts: string[] = [];
  if (clean(acn)) parts.push(`ACN ${clean(acn)}`);
  if (clean(abn)) parts.push(`ABN ${clean(abn)}`);
  return parts.join(", ");
}

/** "Saabai Pty Ltd (ACN …, ABN …), trading as Saabai" with ids only when set. */
export function entityLegalLine(acn: string = ACN, abn: string = ABN): string {
  const ids = entityIds(acn, abn);
  return `${LEGAL_NAME}${ids ? ` (${ids})` : ""}, trading as ${TRADING_AS}`;
}

/** Sender ID for email footers: "Saabai Pty Ltd, trading as Saabai, ABN …, Merrimac QLD 4226, Australia". */
export function entitySender(acn: string = ACN, abn: string = ABN): string {
  const ids = entityIds(acn, abn);
  return `${LEGAL_NAME}, trading as ${TRADING_AS}${ids ? `, ${ids}` : ""}, ${PUBLIC_ADDRESS}`;
}

/** ABN digits only, for structured data. "" when unset. */
export const abnDigits = (abn: string = ABN) => clean(abn).replace(/\D/g, "");
