/**
 * Source scope for Lex research. The lawyer picks which source groups Lex may search;
 * the server drops the other search tools and tells the model what was excluded.
 */
export type LexScopeKey = "cases" | "legislation" | "ato" | "tribunals" | "other";

export const LEX_SCOPES: { key: LexScopeKey; label: string; hint: string; tools: string[] }[] = [
  { key: "cases", label: "Cases", hint: "AustLII judgments", tools: ["searchAustLII"] },
  { key: "legislation", label: "Legislation", hint: "Federal and state Acts", tools: ["searchLegislation", "searchStateLegislation", "verifySection", "checkLegislationStatus"] },
  { key: "ato", label: "ATO", hint: "Rulings and guidance", tools: ["searchATO"] },
  { key: "tribunals", label: "Tribunals", hint: "ART, former AAT, Fair Work", tools: ["searchART", "searchFairWork"] },
  { key: "other", label: "Other", hint: "ASIC, corporations, family, international", tools: ["searchASIC", "searchCorporationsLaw", "searchFamilyLaw", "searchInternational"] },
];

export const ALL_SCOPES: LexScopeKey[] = LEX_SCOPES.map((s) => s.key);
const SCOPED_TOOLS = new Set(LEX_SCOPES.flatMap((s) => s.tools));

/** Keeps only known scope keys. Empty or invalid input means everything. */
export function normalizeScope(raw: unknown): LexScopeKey[] {
  if (!Array.isArray(raw)) return ALL_SCOPES;
  const keys = ALL_SCOPES.filter((k) => raw.includes(k));
  return keys.length ? keys : ALL_SCOPES;
}

export function isFullScope(scope: LexScopeKey[]): boolean {
  return ALL_SCOPES.every((k) => scope.includes(k));
}

/** Drops search tools outside the scope. Tools that are not searches (readSource, captureMatter) always stay. */
export function filterToolsByScope<T extends Record<string, unknown>>(tools: T, scope: LexScopeKey[]): T {
  if (isFullScope(scope)) return tools;
  const allowed = new Set(LEX_SCOPES.filter((s) => scope.includes(s.key)).flatMap((s) => s.tools));
  const out: Record<string, unknown> = {};
  for (const [name, t] of Object.entries(tools)) if (!SCOPED_TOOLS.has(name) || allowed.has(name)) out[name] = t;
  return out as T;
}

/** Line added to the system prompt when the scope is narrowed. */
export function scopePrompt(scope: LexScopeKey[]): string {
  if (isFullScope(scope)) return "";
  const names = LEX_SCOPES.filter((s) => scope.includes(s.key)).map((s) => s.label).join(", ");
  return `\n\nSOURCE SCOPE: The lawyer limited this research to: ${names}. Only search those sources. If the question needs other sources, say which ones would help instead of guessing.`;
}

export function scopeLabel(scope: LexScopeKey[]): string {
  if (isFullScope(scope)) return "Sources: All";
  return "Sources: " + LEX_SCOPES.filter((s) => scope.includes(s.key)).map((s) => s.label).join(", ");
}
