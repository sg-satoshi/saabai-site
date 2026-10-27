import { LIMITS, validateContent, type Faq } from "./core";

/**
 * Bulk FAQ import for the chatbot editor.
 *
 * Paste format: pairs of `Q:` / `A:` (or `Question:` / `Answer:`), separated by a blank line.
 * An answer can run over several lines until the blank line. CSV is `question,answer`
 * (a header row is optional; commas inside a field must be quoted).
 *
 * This module decides what the editor may append. Saving still goes through validateContent.
 */

export const FAQ_PASTE_EXAMPLE = `Q: What are your opening hours?
A: Monday to Friday, 9am to 5pm.

Q: Do you travel to the Gold Coast?
A: Yes. The call-out fee is $99.`;

const MAX_CHARS = 100_000;
const MAX_ROWS = 50;
const Q_LINE = /^\s*(?:q|question)\s*:\s*(.*)$/i;
const A_LINE = /^\s*(?:a|answer)\s*:\s*(.*)$/i;

export interface FaqImportNotice {
  line?: number;
  message: string;
}

export interface FaqImportDraft {
  q: string;
  a: string;
  line: number;
  warning?: string;
}

export interface FaqImportParse {
  format: "paste" | "csv" | "empty";
  rows: FaqImportDraft[];
  notices: FaqImportNotice[];
}

export interface FaqImportCandidate extends FaqImportDraft {
  /** The user left this row out. Duplicates and invalid rows are left out even when this is false. */
  skip: boolean;
}

export interface FaqImportReviewRow {
  q: string;
  a: string;
  line: number;
  warning?: string;
  skip: boolean;
  messages: string[];
  ready: boolean;
}

/** Same trim and control-character strip as validateContent, with CR turned into a newline first. */
export function normaliseFaqField(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim();
}

function pairKey(q: string, a: string): string {
  return `${q}\u0000${a}`;
}

function looksLikePaste(text: string): boolean {
  return text.split("\n").some((line) => Q_LINE.test(line));
}

function serverError(faqs: Faq[]): string | null {
  const v = validateContent({ faqs });
  if (v.ok) return null;
  return Object.values(v.errors)[0] ?? null;
}

/** Copy taken from validateContent so the preview cannot drift from the save check. */
const MISSING_PAIR = serverError([{ q: "", a: "x" }]) ?? "Add both a question and an answer, or remove it.";
const TOO_MANY = serverError(Array.from({ length: LIMITS.faqs + 1 }, () => ({ q: "q", a: "a" }))) ?? `Max ${LIMITS.faqs} questions.`;

function fieldMessages(q: string, a: string): string[] {
  if (!q || !a) return [MISSING_PAIR];
  const messages: string[] = [];
  if (q.length > LIMITS.q) {
    const msg = serverError([{ q, a: "ok" }]);
    if (msg) messages.push(msg);
  }
  if (a.length > LIMITS.a) {
    const msg = serverError([{ q: "ok", a }]);
    if (msg) messages.push(msg);
  }
  return messages;
}

/** Parse a paste or a CSV. `format: "csv"` forces the spreadsheet reader (used for file upload). */
export function parseFaqImport(input: string, format: "auto" | "paste" | "csv" = "auto"): FaqImportParse {
  const text = input.replace(/^\uFEFF/, "");
  if (!text.trim()) return { format: "empty", rows: [], notices: [] };
  if (text.length > MAX_CHARS) {
    return { format: "empty", rows: [], notices: [{ message: "That is too long to import at once. Split it into smaller pastes." }] };
  }
  const first = text.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const header = isHeader(parseCsvTable(first, detectDelimiter(first))[0] ?? []);
  const usePaste = format === "paste" || (format === "auto" && looksLikePaste(text) && !header);
  return usePaste ? parsePaste(text) : parseCsvImport(text);
}

function parsePaste(text: string): FaqImportParse {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const rows: FaqImportDraft[] = [];
  const notices: FaqImportNotice[] = [];
  let cur: { q: string; a: string; phase: "q" | "a"; startLine: number } | null = null;
  let capped = false;

  const flush = () => {
    if (!cur) return;
    if (rows.length >= MAX_ROWS) {
      if (!capped) {
        notices.push({ line: cur.startLine, message: `Only the first ${MAX_ROWS} pairs were read. Add these, then paste the rest.` });
        capped = true;
      }
      cur = null;
      return;
    }
    rows.push({ q: normaliseFaqField(cur.q), a: normaliseFaqField(cur.a), line: cur.startLine });
    cur = null;
  };

  for (let i = 0; i < lines.length && !capped; i++) {
    const raw = lines[i];
    if (raw.trim() === "") {
      flush();
      continue;
    }
    const qMatch = raw.match(Q_LINE);
    const aMatch = raw.match(A_LINE);
    if (qMatch) {
      flush();
      if (capped) break;
      cur = { q: qMatch[1], a: "", phase: "q", startLine: i + 1 };
      continue;
    }
    if (aMatch) {
      if (!cur) cur = { q: "", a: aMatch[1], phase: "a", startLine: i + 1 };
      else if (cur.phase === "q") {
        cur.a = aMatch[1];
        cur.phase = "a";
      } else cur.a = cur.a ? `${cur.a}\n${aMatch[1]}` : aMatch[1];
      continue;
    }
    if (!cur) {
      notices.push({ line: i + 1, message: "Skipped. Start each pair with Q: or Question:." });
      continue;
    }
    if (cur.phase === "q") cur.q = cur.q ? `${cur.q} ${raw.trim()}` : raw.trim();
    else cur.a = cur.a ? `${cur.a}\n${raw.trim()}` : raw.trim();
  }
  flush();
  if (!rows.length && !notices.length) notices.push({ message: "No questions found. Start each pair with Q: and A:." });
  return { format: "paste", rows, notices };
}

function detectDelimiter(line: string): "," | ";" | "\t" {
  const counts = { ",": 0, ";": 0, "\t": 0 };
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') i++;
      else quoted = !quoted;
      continue;
    }
    if (!quoted && (c === "," || c === ";" || c === "\t")) counts[c]++;
  }
  if (counts["\t"] > 0 && counts["\t"] >= counts[","] && counts["\t"] >= counts[";"]) return "\t";
  if (counts[";"] > counts[","]) return ";";
  return ",";
}

function parseCsvTable(text: string, delimiter: "," | ";" | "\t"): string[][] {
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const table: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      table.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell.length || row.length) {
    row.push(cell);
    table.push(row);
  }
  return table;
}

function isHeader(cells: string[]): boolean {
  const q = cells[0]?.trim().toLowerCase() ?? "";
  const a = cells[1]?.trim().toLowerCase() ?? "";
  return (q === "question" || q === "q") && (a === "answer" || a === "a");
}

function parseCsvImport(text: string): FaqImportParse {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);
  const table = parseCsvTable(text, delimiter);
  const notices: FaqImportNotice[] = [];
  const rows: FaqImportDraft[] = [];
  let start = 0;
  if (table.length && isHeader(table[0])) start = 1;
  if (start === 1 && table.length === 1) {
    return { format: "csv", rows: [], notices: [{ message: "The CSV has a header but no questions." }] };
  }
  for (let i = start; i < table.length; i++) {
    const cells = table[i].map((c) => c.trim());
    if (cells.every((c) => c === "")) continue;
    if (rows.length >= MAX_ROWS) {
      notices.push({ line: i + 1, message: `Only the first ${MAX_ROWS} rows were read. Add these, then upload the rest.` });
      break;
    }
    const extra = cells.slice(2).some((c) => c !== "");
    const q = cells[0] ?? "";
    // An unquoted comma splits an answer across columns. Join those columns back and ask the user to check.
    const joiner = delimiter === "\t" ? ", " : `${delimiter} `;
    const a = extra ? cells.slice(1).join(joiner) : (cells[1] ?? "");
    const warning = extra ? "This row had extra columns, so everything after the question was joined into the answer. Check it." : undefined;
    if (cells.length < 2) notices.push({ line: i + 1, message: "This row has no answer column. Add one, or fill the answer below." });
    rows.push({ q: normaliseFaqField(q), a: normaliseFaqField(a), line: i + 1, warning });
  }
  if (!rows.length && !notices.length) notices.push({ message: "No questions found. Use two columns: question, answer." });
  return { format: "csv", rows, notices };
}

/**
 * Classify parsed rows against the current list.
 * Ready rows are safe to append. Exact duplicates (after the same cleanup the server uses) are not ready.
 * Rows past the 20-question cap are not ready. Skipping an earlier row frees a space for a later one.
 */
export function reviewFaqImport(rows: readonly FaqImportCandidate[], existing: readonly Faq[]): FaqImportReviewRow[] {
  const existingKeys = new Set(
    existing
      .map((f) => ({ q: normaliseFaqField(f.q), a: normaliseFaqField(f.a) }))
      .filter((f) => f.q && f.a)
      .map((f) => pairKey(f.q, f.a)),
  );
  let room = Math.max(0, LIMITS.faqs - existing.length);
  const kept: string[] = [];
  return rows.map((row) => {
    const q = normaliseFaqField(row.q);
    const a = normaliseFaqField(row.a);
    const messages = fieldMessages(q, a);
    if (q && a && existingKeys.has(pairKey(q, a))) messages.push("Already in the list, so this copy will be skipped.");
    else if (q && a && !row.skip && kept.includes(pairKey(q, a))) messages.push("Same question and answer as another row above, so this copy will be skipped.");
    const blocked = messages.length > 0 || row.skip;
    if (!blocked) {
      if (room <= 0) messages.push(TOO_MANY);
      else {
        room--;
        kept.push(pairKey(q, a));
      }
    }
    return { q, a, line: row.line, warning: row.warning, skip: row.skip, messages, ready: messages.length === 0 && !row.skip };
  });
}

export function faqsToAppend(rows: readonly FaqImportReviewRow[]): Faq[] {
  return rows.filter((r) => r.ready).map((r) => ({ q: r.q, a: r.a }));
}

/**
 * Append cleaned rows onto a copy of the current list.
 * Existing rows stay as they are. Exact duplicates, incomplete rows, over-long rows, and rows past the cap are not added.
 */
export function appendFaqs(existing: readonly Faq[], incoming: readonly Faq[]): Faq[] {
  const next = existing.map((f) => ({ q: f.q, a: f.a }));
  const seen = new Set(
    next
      .map((f) => ({ q: normaliseFaqField(f.q), a: normaliseFaqField(f.a) }))
      .filter((f) => f.q && f.a)
      .map((f) => pairKey(f.q, f.a)),
  );
  for (const row of incoming) {
    if (next.length >= LIMITS.faqs) break;
    const q = normaliseFaqField(row.q);
    const a = normaliseFaqField(row.a);
    if (!q || !a || q.length > LIMITS.q || a.length > LIMITS.a) continue;
    const key = pairKey(q, a);
    if (seen.has(key)) continue;
    seen.add(key);
    next.push({ q, a });
  }
  return next;
}
