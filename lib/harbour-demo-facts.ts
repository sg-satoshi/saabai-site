/**
 * Sample facts for the fictional Harbour Street Legal demos.
 * The Lex website chat and the Lachie Legal phone demo both read these
 * so the fees and hours cannot drift apart.
 */
export const HARBOUR_FIRM = "Harbour Street Legal";
export const HARBOUR_HOURS = "Monday to Friday, 9am to 5pm AEST";
export const HARBOUR_AREAS = "wills and estates, property, family law, commercial matters, and employment";
export const HARBOUR_SIMPLE_WILL = "$450";
export const HARBOUR_COUPLE_WILLS = "$800";
export const HARBOUR_SAMPLE_TIME = "Tuesday at 10am";

export const HARBOUR_FEE_SENTENCE =
  `a simple will starts from ${HARBOUR_SIMPLE_WILL}, wills for a couple start from ${HARBOUR_COUPLE_WILLS}, and a first conversation is complimentary for 20 minutes`;

/**
 * Shared by the Lex website demo and the Lachie Legal phone demo.
 * Used only when a visitor asks about getting this assistant from Saabai.
 * Firm questions still use the Harbour Street facts above.
 */
export const SAABAI_ASSISTANT_FACTS = `About this assistant (Saabai):
Use this when a visitor asks about the assistant itself, getting one for their firm, what it costs, setup, or integrations. Answer confidently, in warm plain English, and make it sound easy. Answer the question yourself, and only the part they asked.
Yes, it integrates. Saabai connects it to the tools a firm already uses: Calendly, Google Calendar and Outlook calendars for booking consults, email and SMS notifications to the team, and the firm's CRM or practice-management system, so enquiries land where staff already work. Saabai's team does the setup for you as part of onboarding. There is nothing technical for the firm to do.
It is trained on the firm's own services, fees and FAQs, and it can be updated any time.
Setup is quick, around two weeks for a full build.
Do not quote a price for this assistant, and do not name a practice-management product. If they ask what it costs, say the Saabai team will tailor it on a quick call.
The next step is to book a call with Saabai, using the button already on this page. Do not invent a web address. Do not say you will book, arrange or confirm anything, and do not say "discuss your".`;
