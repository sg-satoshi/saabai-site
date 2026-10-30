/**
 * Chatbot insights: conversion funnel (counts and rates, never field values) and
 * transcripts for one bot. Read only. Transcripts respect the 90 day chat log retention
 * and the per-bot `transcripts` toggle. The caller must already have scoped the slug.
 */
import { getRedis } from "../redis";
import { CHAT_EVENTS, eventKey, type ChatEventName } from "./events";
import { monthKey } from "./core";
import { CHAT_LOG_RETENTION_DAYS } from "../chat-log";

export type Counts = Partial<Record<ChatEventName, number>>;
export interface FunnelStep { key: string; label: string; count: number; rate: number | null; of: string }
export interface Funnel { month: string; steps: FunnelStep[] }

const STEPS: Array<{ key: ChatEventName; label: string; of: ChatEventName | null }> = [
  { key: "conversation_started", label: "Chats started", of: null },
  { key: "cta_shown", label: "Main button shown", of: "conversation_started" },
  { key: "cta_click", label: "Main button clicked", of: "cta_shown" },
  { key: "goal_reached", label: "Goal reached", of: "conversation_started" },
  { key: "fallback_click", label: "Fallback clicked", of: "conversation_started" },
  { key: "form_opened", label: "Follow-up form opened", of: "conversation_started" },
  { key: "field_email", label: "Email field filled", of: "form_opened" },
  { key: "form_submitted", label: "Follow-up form sent", of: "form_opened" },
  { key: "nudge_shown", label: "Nudge shown", of: null },
  { key: "nudge_click", label: "Nudge clicked", of: "nudge_shown" },
  { key: "review_shown", label: "Review invite shown", of: "conversation_started" },
  { key: "review_click", label: "Review link clicked", of: "review_shown" },
  { key: "offer_click", label: "Free offer clicked", of: "conversation_started" },
  { key: "handoff", label: "Handed to a person", of: "conversation_started" },
];

export function isMonth(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

export function buildFunnel(month: string, raw: Record<string, unknown> | null): Funnel {
  const c: Counts = {};
  for (const e of CHAT_EVENTS) {
    const n = Number(raw?.[e] ?? 0);
    c[e] = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }
  return {
    month,
    steps: STEPS.map((s) => {
      const count = c[s.key] ?? 0;
      const base = s.of ? c[s.of] ?? 0 : 0;
      return { key: s.key, label: s.label, count, of: s.of ?? "", rate: s.of && base > 0 ? Math.round((count / base) * 1000) / 10 : null };
    }),
  };
}

export async function readFunnel(slug: string, month = monthKey()): Promise<Funnel> {
  try {
    const r = getRedis();
    const raw = r ? ((await r.hgetall(eventKey(slug, month))) as Record<string, unknown> | null) : null;
    return buildFunnel(month, raw);
  } catch {
    return buildFunnel(month, null);
  }
}

export interface TranscriptMessage { role: "user" | "assistant"; content: string; at: string }
export interface Transcript { id: string; startedAt: string; messages: TranscriptMessage[] }
interface Row { conversation_id: string; role: string; content: string; created_at: string }

export function retentionCutoff(now = Date.now()): string {
  return new Date(now - CHAT_LOG_RETENTION_DAYS * 86400000).toISOString();
}

/** Groups message rows into conversations, newest first. Pure for tests. */
export function groupTranscripts(rows: Row[], slugCheck: (id: string) => boolean, cutoff: string, limit = 50): Transcript[] {
  const map = new Map<string, Transcript>();
  for (const r of rows) {
    if (!r || typeof r.conversation_id !== "string" || !slugCheck(r.conversation_id)) continue;
    if (typeof r.created_at !== "string" || r.created_at < cutoff) continue;
    if (r.role !== "user" && r.role !== "assistant") continue;
    let t = map.get(r.conversation_id);
    if (!t) { t = { id: r.conversation_id, startedAt: r.created_at, messages: [] }; map.set(r.conversation_id, t); }
    if (r.created_at < t.startedAt) t.startedAt = r.created_at;
    t.messages.push({ role: r.role, content: String(r.content ?? "").slice(0, 4000), at: r.created_at });
  }
  const list = [...map.values()];
  for (const t of list) t.messages.sort((a, b) => a.at.localeCompare(b.at));
  return list.sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, limit);
}

export async function listTranscripts(slug: string, limit = 50): Promise<{ transcripts: Transcript[]; available: boolean }> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { transcripts: [], available: false };
  try {
    const { serviceClient } = await import("../agent-supabase");
    const cutoff = retentionCutoff();
    const { data, error } = await serviceClient()
      .from("messages")
      .select("conversation_id, role, content, created_at")
      .eq("bot_slug", slug)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) return { transcripts: [], available: false };
    return { transcripts: groupTranscripts((data ?? []) as Row[], () => true, cutoff, limit), available: true };
  } catch {
    return { transcripts: [], available: false };
  }
}
