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
export const ENTITY_ADDRESS = "Merrimac QLD 4226, Australia";
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
  return `${LEGAL_NAME}, trading as ${TRADING_AS}${ids ? `, ${ids}` : ""}, ${ENTITY_ADDRESS}`;
}

/** ABN digits only, for structured data. "" when unset. */
export const abnDigits = (abn: string = ABN) => clean(abn).replace(/\D/g, "");
