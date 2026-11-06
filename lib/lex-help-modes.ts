/**
 * Lex Assist panel modes. Phase 1 ships "ask" only; "report" and "suggest" are reserved slots
 * (phase 2, separate PR: screen-capture reports, ideas, thumbs, hand-off, My reports tab).
 * The mode switch only renders when more than one mode is enabled.
 */
export type LexAssistMode = "ask" | "report" | "suggest";
export const LEX_ASSIST_MODES: ReadonlyArray<{ id: LexAssistMode; label: string; enabled: boolean }> = [
  { id: "ask", label: "Ask", enabled: true },
  { id: "report", label: "Report a problem", enabled: false },
  { id: "suggest", label: "Suggest an idea", enabled: false },
];
export const enabledAssistModes = () => LEX_ASSIST_MODES.filter((m) => m.enabled);
