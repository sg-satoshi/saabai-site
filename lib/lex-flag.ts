/** "Flag an issue" on a Lex answer. Stored internally for review; nothing is emailed. */
export const FLAG_REASONS = [
  { key: "wrong_citation", label: "Wrong or missing citation" },
  { key: "outdated", label: "Outdated law" },
  { key: "wrong_answer", label: "Answer is wrong" },
  { key: "other", label: "Something else" },
] as const;
export type FlagReason = (typeof FLAG_REASONS)[number]["key"];

export type LexFlag = { reason: FlagReason; note: string; question: string; answer: string; threadId: string; at: number };

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");

/** Validates a flag body. Returns null when the reason or answer is missing. */
export function normalizeFlag(raw: unknown, now = Date.now()): LexFlag | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const reason = FLAG_REASONS.find((r) => r.key === b.reason)?.key;
  const answer = clip(b.answer, 8000);
  if (!reason || !answer.trim()) return null;
  return { reason, note: clip(b.note, 1000).trim(), question: clip(b.question, 2000), answer, threadId: clip(b.threadId, 64), at: now };
}
