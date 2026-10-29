/**
 * "Send test to hello@saabai.ai" for admin broadcasts (#339).
 * The recipient is fixed here, server-side. Any recipient in the request is ignored, and this
 * path has no access to the subscriber list: its deps only let it check one suppression entry,
 * claim a rate-limit slot and send one email. The email is built by the same broadcastEmail
 * builder the real broadcast uses, so the footer and unsubscribe headers are exactly what
 * subscribers get.
 */
import { broadcastEmail, type BroadcastEmail } from "./broadcast";

export const BROADCAST_TEST_TO = "hello@saabai.ai";
export const BROADCAST_TEST_LIMIT = 5;
export const BROADCAST_TEST_WINDOW_SECONDS = 60 * 60;
const MAX_SUBJECT = 200;
const MAX_HTML = 200_000;

export type BroadcastTestDeps = {
  isAdmin: () => Promise<boolean>;
  /** true when a slot was claimed, false when over the limit, null when storage is down. */
  claimSlot: () => Promise<boolean | null>;
  isSuppressed: (email: string) => Promise<boolean>;
  unsubUrl: (email: string) => string;
  unsubHeaders: (email: string) => Record<string, string>;
  send: (email: BroadcastEmail) => Promise<{ ok: boolean; id?: string; error?: string }>;
};

export type BroadcastTestResult = { status: number; body: Record<string, unknown> };

export function testSubject(subject: string): string {
  const s = subject.trim().replace(/^\[TEST\]\s*/i, "");
  return `[TEST] ${s}`;
}

export function buildBroadcastTestEmail(msg: { subject: string; html: string; fromName?: string }, deps: Pick<BroadcastTestDeps, "unsubUrl" | "unsubHeaders">): BroadcastEmail {
  const email = broadcastEmail(
    { email: BROADCAST_TEST_TO, firstName: "" },
    { subject: testSubject(msg.subject), html: msg.html, fromName: msg.fromName || "Shane at Saabai" },
    deps,
  );
  // Belt and braces: the builder only ever gets the fixed address, but check the output too.
  if (email.to.length !== 1 || email.to[0] !== BROADCAST_TEST_TO) throw new Error("test recipient check failed");
  return email;
}

export async function handleBroadcastTest(body: unknown, deps: BroadcastTestDeps): Promise<BroadcastTestResult> {
  if (!(await deps.isAdmin())) return { status: 401, body: { error: "Your session expired. Sign in again." } };
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const subject = typeof b.subject === "string" ? b.subject : "";
  const html = typeof b.html === "string" ? b.html : "";
  const fromName = typeof b.fromName === "string" ? b.fromName : undefined;
  if (!subject.trim()) return { status: 400, body: { error: "subject required" } };
  if (!html.trim()) return { status: 400, body: { error: "html required" } };
  if (subject.length > MAX_SUBJECT || html.length > MAX_HTML) return { status: 400, body: { error: "Message too long" } };

  const slot = await deps.claimSlot();
  if (slot === null) return { status: 503, body: { error: "Test sends are unavailable right now (rate limit store is down). Try again later." } };
  if (!slot) return { status: 429, body: { error: `Test limit reached (${BROADCAST_TEST_LIMIT} per hour). Try again later.` } };

  if (await deps.isSuppressed(BROADCAST_TEST_TO)) {
    return { status: 409, body: { error: `${BROADCAST_TEST_TO} is on the unsubscribe list, so no test was sent.` } };
  }

  const email = buildBroadcastTestEmail({ subject, html, fromName }, deps);
  const r = await deps.send(email);
  if (!r.ok) return { status: 502, body: { error: r.error || "Test send failed" } };
  return { status: 200, body: { ok: true, sent: 1, to: BROADCAST_TEST_TO, subject: email.subject, id: r.id ?? null } };
}
