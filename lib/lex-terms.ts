/**
 * Lex subscription terms copy. DRAFT pending Shane's approval (issue #388).
 * Bump LEX_TERMS_VERSION in lib/lex-subscription.ts whenever this copy changes.
 */
export const LEX_TERMS_SUMMARY =
  "Billed monthly. Cancel anytime. When you cancel, Lex stays on until the end of the month you've paid for, and we don't refund part months. Prices in AUD. GST not applicable.";

export const LEX_TERMS: { heading: string; body: string }[] = [
  { heading: "Billing", body: "Lex is a monthly subscription. The Firm plan is $299 a month (AUD, GST not applicable) and includes 3 lawyer seats. We charge the card you give us at checkout on the day you sign up, then on the same day each month." },
  { heading: "Price changes", body: "If we change the price, we'll email you at least 30 days before the new price applies. You can cancel before then." },
  { heading: "Cancelling", body: "You can cancel anytime using the Manage billing link in your Lex account, which opens your secure billing page. There's no lock-in and no cancellation fee." },
  { heading: "What happens when you cancel", body: "Your access continues until the end of the month you've already paid for. After that you won't be charged again." },
  { heading: "Refunds", body: "We don't refund part months when you cancel. If we charge you in error, or Lex doesn't work as it should, contact us and we'll put it right." },
  { heading: "Failed payments", body: "If a payment fails, we'll let you know and try again. If it still can't be paid after 7 days, we may pause access until it is." },
  { heading: "Your data after cancelling", body: "[To be confirmed before Lex checkout opens.]" },
  { heading: "Your rights", body: "Nothing in these terms limits any rights you have under the Australian Consumer Law." },
  { heading: "Lex is a drafting tool", body: "Lex helps prepare drafts and research. It doesn't give legal advice. Your firm reviews and is responsible for anything it sends to a client." },
];
