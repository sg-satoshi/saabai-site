import { generateText } from "ai";
import { randomUUID } from "node:crypto";
import { getDefaultModel } from "../chat-config";
import { kindOf } from "./core";
import { applyDashboardAction, listExperiments, loadView, type ApplyOutcome } from "./admin";
import { serviceDb } from "./track";
import { SUGGEST_COOLDOWN_MS, MAX_PENDING, SUGGEST_COUNT, suggestSystem, buildSuggestPrompt, cleanSuggestions, combined, parseModelJson } from "./suggest";

export type SuggestionRow = { id: string; text: string; emphasis: string; rationale: string; status: "pending" | "approving" | "approved" | "rejected"; created_at: string; decided_at: string | null; variant_key: string | null };
type Fail = { ok: false; error: string; status: number };

export async function listSuggestions(expId: string): Promise<SuggestionRow[]> {
  const db = serviceDb();
  if (!db) return [];
  const { data } = await db.rpc("exp_suggestion_list", { p_experiment: expId });
  return (data ?? []) as SuggestionRow[];
}

/** Asks the AI for new headline variants and stores them as PENDING. Nothing here touches live copy. */
export async function generateSuggestions(siteKey: string, expId: string, actor: string): Promise<{ ok: true; added: number; suggestions: SuggestionRow[] } | Fail> {
  const db = serviceDb();
  if (!db) return { ok: false, error: "The split testing database isn't configured.", status: 503 };
  const exp = (await listExperiments(siteKey)).find((e) => e.id === expId);
  if (!exp) return { ok: false, error: "Test not found.", status: 404 };
  if ((exp.slotType ?? "text") !== "text") return { ok: false, error: "Suggestions only work for text slots for now.", status: 400 };

  const existing = await listSuggestions(expId);
  const pending = existing.filter((s) => s.status === "pending" || s.status === "approving");
  if (pending.length >= MAX_PENDING) return { ok: false, error: "There are plenty of suggestions waiting. Approve or reject some first.", status: 409 };
  const { data: last } = await db.rpc("exp_suggestion_last_batch_at", { p_experiment: expId });
  if (last && Date.now() - Date.parse(String(last)) < SUGGEST_COOLDOWN_MS) return { ok: false, error: "Suggestions were just made. Give it a minute.", status: 429 };

  const view = await loadView(exp);
  const rejected = existing.filter((s) => s.status === "rejected").map((s) => combined(s.text, s.emphasis));
  const live = exp.variants.map((v) => combined(v.text, v.emphasis ?? ""));
  const waiting = pending.map((s) => combined(s.text, s.emphasis));
  const avoid = [...live, ...waiting, ...rejected];
  const prompt = buildSuggestPrompt(exp, view.analysis, view.daysRunning, rejected.slice(0, 8));

  let good: ReturnType<typeof cleanSuggestions>["ok"] = [];
  let modelName = "default";
  try {
    modelName = process.env.DEFAULT_CHAT_MODEL || "anthropic:claude-haiku-4-5";
    for (let attempt = 0; attempt < 2 && good.length < SUGGEST_COUNT; attempt++) {
      const r = await generateText({ model: getDefaultModel(), system: suggestSystem(kindOf(exp)), prompt: attempt ? `${prompt}\nYour last answer broke a rule or repeated something. Follow every hard rule.` : prompt, maxOutputTokens: 700, temperature: 0.9 });
      const c = cleanSuggestions(parseModelJson(r.text), [...avoid, ...good.map((g) => combined(g.text, g.emphasis))], SUGGEST_COUNT - good.length, kindOf(exp));
      good = [...good, ...c.ok];
    }
  } catch (e) {
    console.error("[exp-suggest] model call failed", (e as Error).message?.slice(0, 200));
    return { ok: false, error: "The AI didn't answer. Try again in a moment.", status: 502 };
  }
  if (!good.length) return { ok: false, error: "The AI's ideas didn't pass our wording rules this time. Try again.", status: 502 };

  const { error } = await db.rpc("exp_suggestion_add", { p_experiment: expId, p_batch: randomUUID(), p_items: good, p_actor: actor, p_model: modelName.slice(0, 80) });
  if (error) return { ok: false, error: "Couldn't save the suggestions. Try again.", status: 502 };
  return { ok: true, added: good.length, suggestions: await listSuggestions(expId) };
}

async function transition(id: string, expId: string, from: string, to: string, actor: string, variant?: string) {
  const db = serviceDb();
  if (!db) return null;
  const { data, error } = await db.rpc("exp_suggestion_set", { p_id: id, p_experiment: expId, p_from: from, p_to: to, p_actor: actor, p_variant: variant ?? null });
  if (error || !Array.isArray(data) || !data.length) return null;
  return data[0] as { id: string; text: string; emphasis: string; rationale: string };
}

/**
 * Approve: claim the suggestion (so a double click cannot add it twice), add it as an AI-sourced variant through the
 * normal audited path (human may have edited the wording), then mark it approved. If adding fails the claim is undone.
 */
export async function approveSuggestion(siteKey: string, expId: string, id: string, edit: { text?: string; emphasis?: string } | undefined, actor: string): Promise<ApplyOutcome> {
  const claimed = await transition(id, expId, "pending", "approving", actor);
  if (!claimed) return { ok: false, error: "That suggestion was already handled. Refresh to see the latest.", status: 409 };
  const text = typeof edit?.text === "string" && edit.text.trim() ? edit.text : claimed.text;
  const emphasis = typeof edit?.text === "string" ? (edit.emphasis ?? "") : claimed.emphasis;
  const edited = text !== claimed.text || emphasis !== claimed.emphasis;
  const res = await applyDashboardAction(siteKey, expId, { type: "add_variant", text, emphasis, source: "ai", suggestionId: id, edited }, undefined, actor);
  if (!res.ok) { await transition(id, expId, "approving", "pending", actor); return res; }
  const newest = res.exp.variants[res.exp.variants.length - 1];
  await transition(id, expId, "approving", "approved", actor, newest?.id);
  return res;
}

export async function rejectSuggestion(expId: string, id: string, actor: string): Promise<{ ok: true } | Fail> {
  const done = await transition(id, expId, "pending", "rejected", actor);
  if (!done) return { ok: false, error: "That suggestion was already handled. Refresh to see the latest.", status: 409 };
  const db = serviceDb();
  await db?.rpc("exp_audit_add", { p_experiment: expId, p_actor: actor, p_action: "reject_suggestion", p_detail: { suggestionId: id, text: combined(done.text, done.emphasis) } });
  return { ok: true };
}
