// Client-safe constants (no server imports).
export const CONSENT_LABELS = {
  internal: "Internal only, don't publish",
  anonymous: "Publish without my name",
  name: "Publish with my name and business",
  name_logo: "Publish with my name, business and logo",
} as const;
