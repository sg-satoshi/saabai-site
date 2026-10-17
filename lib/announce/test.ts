import { getExperiments, writeExperiment } from "@/lib/exp/config";
import { validateExperiment, type Experiment } from "@/lib/exp/core";
import { variantRows } from "@/lib/exp/mutate";
import { serviceDb } from "@/lib/exp/track";
import { visibleText } from "./rich";
import { announcementValue, testIdFor, type Announcement, type Goal } from "./core";

export type TestKind = "bar_vs_none" | "ab";
export type AbOverride = { layout?: Announcement["layout"]; message?: string; theme?: Announcement["theme"] };

/**
 * Creates a DRAFT experiment (never running) for an announcement: slotType "announcement", variants carry flat JSON-ish
 * config in Variant.value, control "a". Starting it is a separate, deliberate step on /saabai-admin/experiments.
 */
export function buildTest(a: Announcement, kind: TestKind, goal: Goal, ab: AbOverride = {}, now = new Date()): Experiment | { error: string } {
  const barVal = announcementValue(a);
  const label = (v: Record<string, string>) => (v.message ? `${v.layout}: ${visibleText(v.message)}`.slice(0, 280) : "No announcement (control)");
  let a1: Record<string, string>, b1: Record<string, string>;
  if (kind === "bar_vs_none") { a1 = {}; b1 = barVal; }
  else {
    const changed = Object.keys(ab).filter((k) => ab[k as keyof AbOverride] !== undefined && ab[k as keyof AbOverride] !== (a as unknown as Record<string, unknown>)[k]);
    if (changed.length !== 1) return { error: "For an A vs B test, change exactly one thing (copy, position or theme)." };
    a1 = barVal; b1 = announcementValue({ ...a, ...(ab as object) } as Announcement);
  }
  const e: Experiment = {
    id: testIdFor(a.id), siteKey: a.siteKey, slot: `announcement.${a.id}`, kind: "text", slotType: "announcement",
    name: `Announcement: ${a.name}`.slice(0, 90), path: "/", status: "draft", defaultVariantId: "a", rev: 1, updatedAt: now.toISOString(),
    variants: [
      { id: "a", text: label(a1), active: true, value: { ...a1, goal } },
      { id: "b", text: label(b1), active: true, value: { ...b1, goal } },
    ],
  };
  return validateExperiment(e) ?? { error: "That test configuration is not valid." };
}

export async function createTest(a: Announcement, kind: TestKind, goal: Goal, ab: AbOverride, actor: string): Promise<{ ok: true; exp: Experiment } | { ok: false; error: string; status: number }> {
  const existing = (await getExperiments(a.siteKey, { fresh: true })).find((e) => e.id === testIdFor(a.id));
  if (existing) return { ok: false, error: "This announcement already has a test. Manage it on the Experiments page.", status: 409 };
  const e = buildTest(a, kind, goal, ab);
  if ("error" in e) return { ok: false, error: e.error, status: 400 };
  const db = serviceDb();
  if (!db) return { ok: false, error: "The split testing database isn't configured.", status: 503 };
  const { error } = await db.rpc("exp_admin_apply", { p_key: e.id, p_site: e.siteKey, p_slot: e.slot, p_name: e.name ?? e.id, p_status: e.status, p_lead: null, p_variants: variantRows(e), p_actor: actor, p_action: "create_announcement_test", p_detail: { announcement: a.id, kind, goal } });
  if (error) return { ok: false, error: "Couldn't register the test (database). Nothing was changed.", status: 502 };
  try { await writeExperiment(e); } catch { return { ok: false, error: "Registered but couldn't publish. Try again.", status: 502 }; }
  return { ok: true, exp: e };
}
