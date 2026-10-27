import { resolveSlot } from "@/lib/exp/resolve";
import { CLICK_KINDS } from "@/lib/exp/core";
import { qualifyHoursClaim } from "@/lib/exp/seed";
import ExpBeacon from "./ExpBeacon";
import type { ReactNode } from "react";

/**
 * Generic test slot. Renders the visitor's variant server-side and mounts the tracking beacon.
 * `children` receives the chosen copy so the caller keeps its own markup and styling:
 *   <ExpText slot="home.hero.cta">{(v) => <a className="btn" href="/score" data-exp-event="cta_click">{v.text} →</a>}</ExpText>
 * The wrapper adds data-exp-slot / data-exp-id / data-exp-variant through the `attrs` argument.
 */
export default async function ExpText({ slot, children }: {
  slot: string;
  children: (v: { text: string; emphasis?: string; attrs: Record<string, string> }) => ReactNode;
}) {
  const { exp, variant, tracked } = await resolveSlot(slot);
  const kind = exp.kind ?? "headline";
  const shown = kind === "headline" ? qualifyHoursClaim(variant.text, variant.emphasis) : variant;
  const attrs = { "data-exp-slot": slot, "data-exp-id": exp.id, "data-exp-variant": variant.id, "data-exp-kind": kind };
  return (
    <>
      {children({ text: shown.text, emphasis: shown.emphasis, attrs })}
      {tracked && <ExpBeacon exp={exp.id} slot={slot} scope={CLICK_KINDS.includes(exp.kind ?? "headline") ? "slot" : "page"} />}
    </>
  );
}
