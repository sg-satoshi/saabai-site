/** Matter types shown in Lex New Matter Intake. Keep Property as the UI default. */
export const LEX_INTAKE_MATTER_TYPES = [
  "Tax",
  "Property",
  "Family Law",
  "Corporate / Commercial",
  "Litigation",
  "Employment",
  "Wills & Estates",
  "Criminal",
  "Other",
] as const;

export type LexIntakeMatterType = (typeof LEX_INTAKE_MATTER_TYPES)[number];

export const LEX_INTAKE_MATTER_TYPE_DEFAULT: LexIntakeMatterType = "Property";

export function isLexIntakeMatterType(value: string): value is LexIntakeMatterType {
  return (LEX_INTAKE_MATTER_TYPES as readonly string[]).includes(value);
}
