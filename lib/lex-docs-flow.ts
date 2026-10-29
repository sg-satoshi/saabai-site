/**
 * Lex Draft Documents flow: final copy and the open design choices (spec section 11), kept in one place
 * so a decision by Shane is a one-line change.
 *
 * Storage facts behind the copy (lib/lex-draft-progress.ts): progress lives in this browser only
 * (localStorage), for 30 days after the last edit, never synced to other devices. Uploaded files are
 * read, extracted and discarded by /api/lex-doc-extract and never stored.
 */

export type VerifyConfirmMode = "drawer" | "inline";
export type TilePickerScope = "all" | "registry-first";

export const DOCS_FLOW_OPTIONS = {
  /**
   * Q2. "drawer" (Designer default): a Verify answer can only be confirmed in the source drawer or sheet.
   * "inline": also show a Confirm button on the field itself.
   */
  verifyConfirm: "drawer" as VerifyConfirmMode,
  /**
   * Q4. "all" (Designer default): tiles for every document type plus Custom, grouped by category.
   * "registry-first": tiles only for types with a checklist template, the rest under "More document types".
   */
  tilePicker: "all" as TilePickerScope,
  /**
   * Q5. Phase 2 guided assistant (concept only, not built). false (Designer default): it only asks and
   * records, it never pre-selects a quick answer from the deed. Nothing reads this yet; the guided mode
   * must honour it when it is built.
   */
  guidedPreselectFromDeed: false,
};

export const DOCS_FLOW_COPY = {
  progressSaved: "Progress saved in this browser.",
  draftsListTitle: "Drafts in this browser",
  retention: "Saved in this browser for 30 days. Not synced to other devices.",
  railFoot: "Ticks fill in as you go. Progress saved in this browser.",
  uploadNote: "PDF, Word or text, up to 8 files. Names are masked before Lex's model reads them, and the files are not kept.",
  legalLine: "Drafting assistance only, not legal advice.",
  draftFooter: "Drafting assistance only, not legal advice. Check every reference and Verify marker before this document is used.",
  noAnswers: "No answers found in these files. Fill in the form or add another file.",
  queuedMask: "Privacy check runs before Lex reads it.",
};

/** Top bar: "Saved in this browser 3:52 PM". */
export function savedLabel(time: string): string {
  return `Saved in this browser ${time}`;
}

/**
 * Resume card label, desktop only (the mobile card has none). Drafts are not linked to matters, so never
 * "Matter:". Trust resolutions read "Draft: Harbour Pines, FY2027 distributions".
 */
export function draftLabel(docName: string, trustName?: string, financialYearLine?: string): string {
  const short = (trustName ?? "").trim().replace(/\s+(family\s+)?trust$/i, "").trim();
  const fy = financialYearLine?.match(/\b(20\d\d)\b/)?.[1];
  if (short && fy) return `Draft: ${short}, FY${fy} distributions`;
  return `Draft: ${short || docName}`;
}

/** Tiles split by the Q4 choice. */
export function splitTiles<T extends { partiesTemplate?: string }>(types: T[], scope: TilePickerScope = DOCS_FLOW_OPTIONS.tilePicker): { tiles: T[]; more: T[] } {
  if (scope === "all") return { tiles: types, more: [] };
  return { tiles: types.filter((t) => !!t.partiesTemplate), more: types.filter((t) => !t.partiesTemplate) };
}
