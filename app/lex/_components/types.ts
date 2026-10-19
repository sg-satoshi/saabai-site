import type { LexAnswerMeta } from "../../../lib/lex-sources";

/** A saved message. `at` (ms) is set on new messages; threads saved before phase B have none. */
export type ChatMessage = { role: "user" | "assistant"; content: string; meta?: LexAnswerMeta; at?: number };
export type Thread = { id: string; title: string; messages: ChatMessage[]; createdAt: number; projectId?: string };
export type Project = { id: string; name: string; createdAt: number; colour: string };
export type Mode = "research" | "draft" | "review";
