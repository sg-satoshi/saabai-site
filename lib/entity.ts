/**
 * Single source of truth for Saabai's legal entity.
 *
 * Saabai moved from a sole trader to a company. Fill in ENTITY_ACN and
 * ENTITY_ABN (spaced format, e.g. "123 456 789" and "12 345 678 901") when
 * the ASIC/ABR registrations arrive. scripts/check-entity.mjs and
 * tests/entity.test.ts fail while either value is still a placeholder, so the
 * placeholders cannot ship by accident.
 */
export const ENTITY_NAME = "Saabai Pty Ltd";
export const TRADING_NAME = "Saabai";
export const ENTITY_ACN = "ACN_PENDING";
export const ENTITY_ABN = "ABN_PENDING";

/** ABN with spaces removed, for structured data identifiers. */
export const ENTITY_ABN_DIGITS = ENTITY_ABN.replace(/\s+/g, "");

/** "Saabai Pty Ltd (ACN xxx xxx xxx) trading as Saabai" */
export const ENTITY_LINE = `${ENTITY_NAME} (ACN ${ENTITY_ACN}) trading as ${TRADING_NAME}`;

/** Sender ID used in email and PDF footers. */
export const ENTITY_SENDER = `${ENTITY_LINE}, ABN ${ENTITY_ABN}`;

export const ENTITY_PLACEHOLDERS = ["ACN_PENDING", "ABN_PENDING"] as const;
