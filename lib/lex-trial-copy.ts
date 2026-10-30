/** Client-safe copy for the Lex free trial (no server imports). */
export type Trial = { daysLeft: number; day: number; stage: "none" | "day45" | "day55" | "ended"; endsAt: string };

export function trialMessage(t: Trial, isAdmin: boolean, admin?: string): string | null {
  const ask = isAdmin ? "Subscribe to keep Lex on." : `Ask ${admin ?? "your firm's account owner"} to subscribe to keep Lex on.`;
  if (t.stage === "ended") return `Your free trial has ended. ${ask}`;
  if (t.stage === "day55") return `${t.daysLeft} ${t.daysLeft === 1 ? "day" : "days"} left in your free trial. ${ask}`;
  if (t.stage === "day45") return `Your free trial ends in ${t.daysLeft} days. ${ask} Your matters and drafts stay as they are.`;
  return null;
}
