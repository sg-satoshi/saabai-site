import { headers } from "next/headers";
import { after } from "next/server";
import { EXP_TRACK_HEADER, EXP_HEADER, defaultVariant, variantFromHeader, type Experiment, type Variant } from "./core";
import { getExperiments } from "./config";
import { ensureSeeded } from "./register";
import { SEED_EXPERIMENTS } from "./seed";

export type ResolvedSlot = { exp: Experiment; variant: Variant; tracked: boolean };

/**
 * Server components call this to get the copy for a slot. The proxy picks the variant and passes it in a request
 * header, so the chosen copy is in the first HTML (no flicker). Any problem returns the control.
 */
export async function resolveSlot(slot: string, siteKey = "saabai"): Promise<ResolvedSlot> {
  const fallback = SEED_EXPERIMENTS.find((e) => e.slot === slot && e.siteKey === siteKey);
  if (!fallback) throw new Error(`Unknown test slot: ${slot}. Declare it in lib/exp/seed.ts`);
  let exp = fallback;
  let variant = defaultVariant(fallback);
  let tracked = false;
  try {
    const h = await headers();
    exp = (await getExperiments(siteKey)).find((e) => e.slot === slot) ?? fallback;
    variant = defaultVariant(exp);
    const varId = variantFromHeader(h.get(EXP_HEADER), exp.id);
    if (varId && exp.status === "running") {
      const v = exp.variants.find((x) => x.id === varId && x.active);
      if (v) variant = v;
      tracked = h.get(EXP_TRACK_HEADER) === "1" && !!v;
    }
    // after() keeps the serverless function alive until registration finishes (a bare void promise can be frozen).
    after(() => ensureSeeded(siteKey));
  } catch { /* render control */ }
  return { exp, variant, tracked };
}
