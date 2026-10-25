/**
 * Request validation for /api/lex-chat. An empty or malformed body is a client
 * error (400), not a model failure: without this the AI SDK threw
 * "messages must not be empty" and the route returned a 500.
 */
export type LexChatMsg = { role: "user" | "assistant"; content: string };

export function normalizeLexChatMessages(raw: unknown): LexChatMsg[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is { role: string; content: string } =>
      !!m && typeof m === "object" && typeof (m as { content?: unknown }).content === "string")
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.content.trim().length > 0)
    .slice(-50)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
}
