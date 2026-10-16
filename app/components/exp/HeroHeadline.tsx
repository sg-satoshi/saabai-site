import { headers } from "next/headers";
import { EXP_HEADER, EXP_TRACK_HEADER, defaultVariant } from "@/lib/exp/core";
import { ensureSeeded, getExperiments } from "@/lib/exp/config";
import { SEED_EXPERIMENTS } from "@/lib/exp/seed";
import ExpBeacon from "./ExpBeacon";

const SLOT = "home.hero.headline";
const FALLBACK = SEED_EXPERIMENTS[0];

/**
 * Server-rendered hero headline. The proxy picks the variant and passes it in a request header, so the
 * chosen copy is in the first HTML (no flicker, no layout shift). Any problem renders the control.
 */
export default async function HeroHeadline() {
  let exp = FALLBACK;
  let variant = defaultVariant(FALLBACK);
  let tracked = false;
  try {
    const h = await headers();
    const list = await getExperiments("saabai");
    exp = list.find((e) => e.slot === SLOT) ?? FALLBACK;
    variant = defaultVariant(exp);
    const [expId, varId] = (h.get(EXP_HEADER) ?? "").split(":");
    if (expId === exp.id && exp.status === "running") {
      const v = exp.variants.find((x) => x.id === varId && x.active);
      if (v) variant = v;
      tracked = h.get(EXP_TRACK_HEADER) === "1" && !!v;
    }
    void ensureSeeded("saabai");
  } catch { /* render control */ }
  return (
    <>
      <h1 style={{ marginTop: 28 }} data-exp-slot={SLOT} data-exp-id={exp.id} data-exp-variant={variant.id}>
        {variant.text} <br />
        <span className="grad">{variant.emphasis}</span>
      </h1>
      {tracked && <ExpBeacon exp={exp.id} />}
    </>
  );
}
