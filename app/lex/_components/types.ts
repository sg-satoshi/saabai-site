import type { LexAnswerMeta } from "../../../lib/lex-sources";

/** A saved message. `at` (ms) is set on new messages; threads saved before phase B have none. */
export type ChatMessage = {
  role: "user" | "assistant"; content: string; meta?: LexAnswerMeta; at?: number;
  /** User turn: name of a file whose text is appended to content after ATTACH_MARK. */
  attachment?: string;
  /** Assistant turn: searches that failed, whether every search came back empty, and whether the user flagged it. */
  failedSearches?: number; noResults?: boolean; flagged?: boolean;
};

export const ATTACH_MARK = "\n\n--- Attached document: ";
export type Thread = { id: string; title: string; messages: ChatMessage[]; createdAt: number; projectId?: string; matterId?: string };
export type Project = { id: string; name: string; createdAt: number; colour: string };
export type Mode = "research" | "draft" | "review" | "dashboard" | "matters";
