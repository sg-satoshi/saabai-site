/** Client-safe copy for the Lex free trial (no server imports). */
export type Trial = { daysLeft: number; day: number; stage: "none" | "day45" | "day55" | "ended"; endsAt: string };

export function trialMessage(t: Trial, isAdmin: boolean, admin?: string): string | null {
  const ask = isAdmin ? "Subscribe to keep Lex on." : `Ask ${admin ?? "your firm's account owner"} to subscribe to keep Lex on.`;
  if (t.stage === "ended") return `Your free trial has ended. ${ask}`;
  if (t.stage === "day55") return `${t.daysLeft} ${t.daysLeft === 1 ? "day" : "days"} left in your free trial. ${ask}`;
  if (t.stage === "day45") return `Your free trial ends in ${t.daysLeft} days. ${ask} Your matters and drafts stay as they are.`;
  return null;
}

/** One-trial-per-firm marker, disclosed on the trial page and in the privacy policy (section 6). */
export const LEX_TRIAL_MARKER_COPY = "To keep to one free trial per firm, we keep a one-way coded marker (a hash) made from your firm's email domain, so it does not contain your email address or name, it is kept after your other trial data is deleted, and it is only used to check whether a free trial has already been used.";

/** Trial signup contact details, disclosed on the trial page and in the privacy policy (section 6). */
export const LEX_TRIAL_CONTACT_COPY = "When your firm starts a Lex free trial we collect your name, work email, phone number and your firm's name and street address. We use them to set up and secure the trial (including checking that the email domain belongs to a real firm), to contact you about Lex, and to stop misuse. They are kept with your firm's account and deleted with your other Lex data. When a trial starts we also email ourselves a short alert with your name, firm name and email domain, and that alert stays in our mailbox. Lex pages also show a faint watermark with your firm name and email, to discourage copying.";
