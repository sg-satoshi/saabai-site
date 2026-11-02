/**
 * Send gates. The admin UI mirrors these. The server is the one that enforces them.
 * Pending (unconfirmed) people are not an audience. A test of an older version does not unlock a send.
 */
import type { Block } from "./blocks";

export const SEND_CONFIRM_OVER = 500;
export const MIN_SENDS_FOR_RATES = 500;
export const AUTO_PAUSE_BOUNCE = 0.04;
export const AUTO_PAUSE_COMPLAINT = 0.0008;
export const REVIEW_BOUNCE = 0.05;
export const REVIEW_COMPLAINT = 0.001;
export const SUBJECT_MAX = 60;
export const PREHEADER_MAX = 110;
export const DEFAULT_DAILY_CAP = 2000;

export function contentHash(input: { subject: string; preheader: string; blocks: Block[] }): string {
  const body = JSON.stringify({
    subject: input.subject.trim(),
    preheader: input.preheader.trim(),
    blocks: input.blocks,
  });
  let h = 5381;
  for (let i = 0; i < body.length; i++) h = ((h << 5) + h) ^ body.charCodeAt(i);
  return (h >>> 0).toString(16);
}

export function blockProblem(blocks: Block[]): string | null {
  if (!blocks.length) return "Add a message first.";
  for (const b of blocks) {
    if ((b.kind === "heading" || b.kind === "text") && !b.text.trim()) return "Fill in every text block, or remove it.";
    if (b.kind === "image" && (!b.src.trim() || !b.alt.trim())) return "Each image needs an address and alt text.";
    if (b.kind === "button" && (!b.label.trim() || !b.href.trim())) return "Each button needs a label and a link.";
    if (b.kind === "columns" && (!b.left.trim() || !b.right.trim())) return "Each two-column block needs both columns.";
    if (b.kind === "product" && (!b.title.trim() || !b.href.trim())) return "Each product card needs a title and a link.";
  }
  return null;
}

export function copyProblem(input: { subject: string; preheader: string; blocks: Block[] }): string | null {
  const subject = input.subject.trim();
  if (!subject) return "Add a subject first.";
  if (subject.length > SUBJECT_MAX) return `Subjects are limited to ${SUBJECT_MAX} characters.`;
  if (input.preheader.trim().length > PREHEADER_MAX) return `Preview text is limited to ${PREHEADER_MAX} characters.`;
  return blockProblem(input.blocks);
}

/** Null when the send or schedule may proceed. */
export function sendBlocked(input: {
  paused: boolean;
  audience: number;
  testHash: string | null;
  contentHash: string;
  confirm?: string;
}): string | null {
  if (input.paused) return "Sending is paused.";
  if (input.audience < 1) return "Nobody confirmed is in this audience.";
  if (!input.testHash || input.testHash !== input.contentHash) return "Send a test of this version first.";
  if (input.audience > SEND_CONFIRM_OVER && input.confirm !== "SEND") return "Type SEND to confirm a send over 500 people.";
  return null;
}

/** How many of this audience go today, and how many wait until tomorrow 7:00am. */
export function splitByDailyCap(audience: number, sentToday: number, cap: number): { today: number; later: number } {
  const room = Math.max(0, cap - Math.max(0, sentToday));
  const today = Math.max(0, Math.min(audience, room));
  return { today, later: Math.max(0, audience - today) };
}

/**
 * Bounce and complaint rates are null until the tenant has 500 sends in 7 days.
 * Auto-pause does not fire below that volume.
 */
export function rateDecision(sends: number, bounces: number, complaints: number): {
  rates: { bounce: number; complaint: number } | null;
  pause: string | null;
} {
  if (sends < MIN_SENDS_FOR_RATES) return { rates: null, pause: null };
  const bounce = bounces / sends;
  const complaint = complaints / sends;
  if (bounce >= AUTO_PAUSE_BOUNCE) {
    return { rates: { bounce, complaint }, pause: `Bounce rate reached ${(bounce * 100).toFixed(1)}%. Clean the list, then resume.` };
  }
  if (complaint >= AUTO_PAUSE_COMPLAINT) {
    return { rates: { bounce, complaint }, pause: `Complaint rate reached ${(complaint * 100).toFixed(2)}%. Clean the list, then resume.` };
  }
  return { rates: { bounce, complaint }, pause: null };
}
