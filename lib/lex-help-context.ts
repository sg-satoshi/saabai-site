/**
 * Signed-in firm context for Lex Assist. Built ONLY from the session actor (never from the
 * request body), so a user can only ever see their own firm's plan, trial and usage.
 */
import { firmByEmail, LEX_SEAT_CAP, seatsUsed } from "./lex-subscription";
import { firmUsageToday } from "./lex-review-access";

export type HelpActor = { kind: "admin"; id: string } | { kind: "firm"; email: string; firm: string };
export type HelpFirmContext = {
  plan: string; status: string; seats?: string; trialDaysLeft?: number;
  reviewsToday: number; reviewCap: number; comparesToday: number; compareCap: number;
};

export async function helpFirmContext(actor: HelpActor, now = new Date()): Promise<HelpFirmContext | null> {
  if (actor.kind !== "firm") return null;
  const f = await firmByEmail(actor.email).catch(() => null);
  const u = await firmUsageToday(actor.firm, now);
  const ext = f as (typeof f & { trialEndsAt?: string }) | null;
  const trialDaysLeft = f?.status === ("trial" as string) && ext?.trialEndsAt ? Math.max(0, Math.ceil((Date.parse(ext.trialEndsAt) - now.getTime()) / 86400_000)) : undefined;
  return {
    plan: f ? "Firm plan" : "Individual access", status: f?.status ?? "active",
    ...(f ? { seats: `${seatsUsed(f)} of ${LEX_SEAT_CAP}` } : {}),
    ...(trialDaysLeft !== undefined ? { trialDaysLeft } : {}),
    reviewsToday: u.reviews, reviewCap: u.reviewCap, comparesToday: u.compares, compareCap: u.compareCap,
  };
}

export function helpContextText(route: string | null, c: HelpFirmContext | null): string {
  const lines = [`Current screen: ${route ?? "unknown"}`];
  if (c) {
    lines.push(`Your firm: ${c.plan}, status ${c.status}${c.seats ? `, seats used ${c.seats}` : ""}${c.trialDaysLeft !== undefined ? `, free trial days left ${c.trialDaysLeft}` : ""}.`);
    lines.push(`Today's usage (resets midnight Brisbane): reviews ${c.reviewsToday} of ${c.reviewCap}, compares ${c.comparesToday} of ${c.compareCap}.`);
  } else lines.push("User is Saabai staff (no firm).");
  return lines.join("\n");
}
