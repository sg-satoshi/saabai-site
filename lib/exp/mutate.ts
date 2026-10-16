import { KIND_RULES, kindOf, validateExperiment, type Experiment, type Variant } from "./core";

/** Dashboard actions on one experiment. Pure: returns the next config or an error, never touches storage. */
export type Action =
  | { type: "update_variant"; variantId: string; text: string; emphasis?: string }
  | { type: "add_variant"; text: string; emphasis?: string; source?: "human" | "ai"; suggestionId?: string; edited?: boolean }
  | { type: "set_variant_active"; variantId: string; active: boolean }
  | { type: "set_status"; status: "running" | "paused" }
  | { type: "make_winner"; variantId: string }
  | { type: "set_lead_value"; leadValueAUD: number | null };

export type MutationResult =
  | { ok: true; exp: Experiment; action: string; detail: Record<string, unknown> }
  | { ok: false; error: string; status: number };

const fail = (error: string, status = 400): MutationResult => ({ ok: false, error, status });
const LETTERS = "abcdefgh";
export const MAX_VARIANTS = 8;
export const MAX_LEN = 90;

const tidy = (s: unknown) => (typeof s === "string" ? s.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim() : "");

function checkCopy(exp: Experiment, text: string, emphasis: string): string | null {
  const r = KIND_RULES[kindOf(exp)];
  if (!text) return `The ${r.noun} can't be empty.`;
  if (text.length > r.maxText) return `Keep the ${r.noun} under ${r.maxText} characters.`;
  if (emphasis && !r.emphasis) return `A ${r.noun} has no highlighted part.`;
  if (emphasis.length > r.maxEmphasis) return `Keep the highlighted part under ${r.maxEmphasis} characters.`;
  if (/[\u2013\u2014]/.test(text + emphasis)) return `Please avoid long dashes (en and em dashes). Use a comma or full stop instead.`;
  return null;
}

export const variantLabel = (e: Experiment, v: Variant) => `${v.id.toUpperCase()}${v.id === e.defaultVariantId ? " (control)" : ""}`;

export function applyAction(current: Experiment, a: Action, now: Date = new Date()): MutationResult {
  const exp: Experiment = structuredClone(current);
  const find = (id: string) => exp.variants.find((v) => v.id === id);
  let action = a.type as string;
  let detail: Record<string, unknown> = {};

  switch (a.type) {
    case "update_variant": {
      const v = find(a.variantId);
      if (!v) return fail("That variant doesn't exist.", 404);
      if ((exp.slotType ?? "text") !== "text") return fail("Only text slots can be edited here for now.");
      if (v.id === exp.defaultVariantId && exp.status === "running") return fail("The control is the live copy, so it can't be edited while the test runs. Pause the test first, or edit a variant.");
      const text = tidy(a.text), emphasis = tidy(a.emphasis ?? "");
      const bad = checkCopy(exp, text, emphasis);
      if (bad) return fail(bad);
      detail = { variant: v.id, before: { text: v.text, emphasis: v.emphasis ?? "" }, after: { text, emphasis } };
      if (v.text === text && (v.emphasis ?? "") === emphasis) return fail("Nothing changed.");
      v.text = text;
      if (emphasis) v.emphasis = emphasis; else delete v.emphasis;
      break;
    }
    case "add_variant": {
      if (exp.variants.length >= MAX_VARIANTS) return fail(`A test can have at most ${MAX_VARIANTS} variants.`);
      if ((exp.slotType ?? "text") !== "text") return fail("Only text slots can be added here for now.");
      const text = tidy(a.text), emphasis = tidy(a.emphasis ?? "");
      const bad = checkCopy(exp, text, emphasis);
      if (bad) return fail(bad);
      const id = [...LETTERS].find((l) => !exp.variants.some((v) => v.id === l));
      if (!id) return fail("No free variant slot.");
      const v: Variant = { id, text, active: true, source: a.source === "ai" ? "ai" : "human" };
      if (emphasis) v.emphasis = emphasis;
      exp.variants.push(v);
      detail = { variant: id, text, emphasis };
      if (a.source === "ai") { detail.source = "ai"; detail.suggestionId = a.suggestionId ?? null; detail.editedBeforeApproval = !!a.edited; action = "approve_suggestion"; }
      break;
    }
    case "set_variant_active": {
      const v = find(a.variantId);
      if (!v) return fail("That variant doesn't exist.", 404);
      if (!a.active && v.id === exp.defaultVariantId) return fail("The control can't be paused. Make another variant the winner instead.");
      if (v.active === a.active) return fail("Nothing changed.");
      v.active = a.active;
      action = a.active ? "resume_variant" : "pause_variant";
      detail = { variant: v.id };
      break;
    }
    case "set_status": {
      if (a.status !== "running" && a.status !== "paused") return fail("Unknown status.");
      if (exp.status === a.status) return fail("Nothing changed.");
      if (a.status === "running" && exp.variants.filter((v) => v.active).length < 2) return fail("A running test needs at least two active variants.");
      detail = { from: exp.status, to: a.status };
      action = a.status === "running" ? (exp.status === "won" ? "reopen_test" : "resume_test") : "pause_test";
      exp.status = a.status;
      break;
    }
    case "make_winner": {
      const v = find(a.variantId);
      if (!v) return fail("That variant doesn't exist.", 404);
      detail = { variant: v.id, previousControl: exp.defaultVariantId, text: v.text, emphasis: v.emphasis ?? "" };
      v.active = true;
      exp.defaultVariantId = v.id;
      exp.status = "won";
      break;
    }
    case "set_lead_value": {
      const n = a.leadValueAUD;
      if (n !== null && (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 1_000_000)) return fail("Enter a dollar value of 0 or more, or leave it blank.");
      detail = { before: exp.leadValueAUD ?? null, after: n };
      if (n === null) delete exp.leadValueAUD; else exp.leadValueAUD = Math.round(n * 100) / 100;
      break;
    }
    default:
      return fail("Unknown action.");
  }

  exp.rev = (current.rev ?? 0) + 1;
  exp.updatedAt = now.toISOString();
  const ok = validateExperiment(exp);
  if (!ok) return fail("That change would make the test invalid.");
  return { ok: true, exp: ok, action, detail };
}

/** Rows for Supabase exp_admin_apply (event allow-list and history). */
export function variantRows(e: Experiment) {
  return e.variants.map((v) => ({
    key: v.id,
    label: `${v.id.toUpperCase()}${v.id === e.defaultVariantId ? " (control)" : ""}`,
    copy: [v.text, v.emphasis].filter(Boolean).join(" "),
    is_default: v.id === e.defaultVariantId,
    active: v.active,
    source: v.source ?? "human",
  }));
}
