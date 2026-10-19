/**
 * Lex error handling shared by the /lex page and the Lex API routes.
 *
 * Rule: an API failure is never an answer. It is shown as an error state with
 * Retry, it is never saved into a thread, and it is never sent back to the model
 * as conversation history.
 */

export type LexErrorKind = "auth" | "forbidden" | "limit" | "server" | "network" | "empty";

export type LexError = {
  kind: LexErrorKind;
  title: string;
  message: string;
  /** Show a Retry button (false when retrying cannot help, e.g. signed out). */
  canRetry: boolean;
  /** Show a "Sign in" link back to this page. */
  signIn: boolean;
};

/** Error text older versions of Lex saved into threads as if it were an answer. */
export const LEGACY_ERROR_ANSWERS = [
  "There was a problem reaching the research API. Please try again.",
  "There was a problem reaching the drafting API. Please try again.",
];

export function isLegacyErrorAnswer(content: unknown): boolean {
  return typeof content === "string" && LEGACY_ERROR_ANSWERS.includes(content.trim());
}

type Msg = { role: string; content: string };

/** Drops saved error "answers" so they are never shown as answers or sent to the model. */
export function stripErrorAnswers<T extends Msg>(messages: T[]): T[] {
  return messages.filter((m) => !(m.role === "assistant" && isLegacyErrorAnswer(m.content)));
}

/** Same, for a saved thread list (used when threads load from storage). */
export function cleanThreads<T extends { messages: Msg[] }>(threads: T[]): T[] {
  return threads.map((t) => (Array.isArray(t.messages) ? { ...t, messages: stripErrorAnswers(t.messages) } : t));
}

export function signInHref(path = "/lex"): string {
  return `/login?redirect=${encodeURIComponent(path)}`;
}

/** Turns an HTTP status (and the JSON body when there is one) into a user facing error. */
export function lexErrorFromStatus(status: number, body?: { error?: unknown; message?: unknown } | null, task = "research"): LexError {
  const serverMsg = body && typeof body.message === "string" ? body.message : "";
  if (status === 401) {
    return { kind: "auth", title: "Please sign in", message: "Your session has ended. Sign in again to keep working.", canRetry: false, signIn: true };
  }
  if (status === 403) {
    return { kind: "forbidden", title: "Not available on this account", message: serverMsg || `Your login does not have access to Lex ${task}. Contact Saabai if you think this is wrong.`, canRetry: false, signIn: false };
  }
  if (status === 429) {
    return { kind: "limit", title: "Daily limit reached", message: serverMsg || "Your firm has reached today's limit. It resets tomorrow.", canRetry: false, signIn: false };
  }
  const clientMsg = body && typeof body.error === "string" ? body.error : "";
  if (status >= 400 && status < 500 && clientMsg && !/^(unauthori[sz]ed|forbidden)$/i.test(clientMsg)) {
    // Request problems the user can fix (file too large, unsupported type): show the route's own wording.
    return { kind: "server", title: `Lex couldn't start this ${task}`, message: serverMsg || clientMsg, canRetry: false, signIn: false };
  }
  return { kind: "server", title: `Lex couldn't finish this ${task}`, message: "Something went wrong on our side. Nothing was saved as an answer. Please try again.", canRetry: true, signIn: false };
}

export function lexNetworkError(task = "research"): LexError {
  return { kind: "network", title: `Lex couldn't finish this ${task}`, message: "The connection dropped before the answer came back. Check your connection and try again.", canRetry: true, signIn: false };
}

export function lexEmptyError(task = "research"): LexError {
  return { kind: "empty", title: "No answer came back", message: `Lex didn't return a ${task === "research" ? "answer" : "result"} this time. Nothing was saved. Please try again.`, canRetry: true, signIn: false };
}

/** Reads a failed fetch Response into a LexError without throwing. */
export async function lexErrorFromResponse(res: Response, task = "research"): Promise<LexError> {
  let body: { error?: unknown; message?: unknown } | null = null;
  try { body = await res.json(); } catch { /* not JSON */ }
  return lexErrorFromStatus(res.status, body, task);
}

/** JSON error for Lex API routes. Never includes the raw exception (it can carry keys or prompts). */
export function lexErrorResponse(status: number, error: string, message?: string): Response {
  return new Response(JSON.stringify({ error, ...(message ? { message } : {}) }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** An AI SDK UI stream part that reports a failure mid-stream. */
export function isStreamErrorPart(parsed: unknown): boolean {
  return !!parsed && typeof parsed === "object" && (parsed as { type?: unknown }).type === "error";
}
