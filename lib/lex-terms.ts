/**
 * Lex subscription terms copy. Approved by Shane 30 Oct 2026 (issue #388); price clause updated 30 Oct 2026, 2:00 PM (#430): no figure on public terms.
 * Bump LEX_TERMS_VERSION in lib/lex-subscription.ts whenever this copy changes.
 */
/** Lex Firm price shown only to signed-in firms before checkout. Shane, 30 Oct 2026: $299 a month including GST. Not for public pages. */
export const LEX_FIRM_PRICE_LABEL = "$299 a month (AUD, includes GST)";

export const LEX_TERMS_SUMMARY =
  "Billed monthly. Cancel anytime. When you cancel, Lex stays on until the end of the month you've paid for, and we don't refund part months. Prices in AUD and include GST.";

export const LEX_TERMS: { heading: string; body: string }[] = [
  { heading: "Billing", body: "Lex is a monthly subscription. The Firm plan includes 3 lawyer seats. The subscription price is shown before checkout and includes GST. You can review the full price, GST and these terms before you pay. We charge the card you give us at checkout on the day you sign up, then on the same day each month." },
  { heading: "Price changes", body: "If we change the price, we'll email you at least 30 days before the new price applies. You can cancel before then." },
  { heading: "Cancelling", body: "You can cancel anytime using the Manage billing link in your Lex account, which opens your secure billing page. There's no lock-in and no cancellation fee." },
  { heading: "What happens when you cancel", body: "Your access continues until the end of the month you've already paid for. After that you won't be charged again." },
  { heading: "Refunds", body: "We don't refund part months when you cancel. If we charge you in error, or Lex doesn't work as it should, contact us and we'll put it right." },
  { heading: "Failed payments", body: "If a payment fails, we'll let you know and try again. If it still can't be paid after 7 days, we may pause access until it is." },
  { heading: "Your data after cancelling", body: "After your plan ends, we keep your firm's matters (including any reviews and drafts saved to them) and research chats for 30 days, then delete them. Before then you can ask for a copy, or ask us to delete it sooner, by emailing hello@saabai.ai. If you subscribe again within the 30 days, your data is still there. Drafts you haven't saved to a matter are stored only in your browser, not on our servers. Documents sent for supervisor review, answers you flagged, and our masking logs are handled as set out in our Privacy Policy; email us if you'd like them removed too." },
  { heading: "Your rights", body: "Nothing in these terms limits any rights you have under the Australian Consumer Law." },
  { heading: "Lex is a drafting tool", body: "Lex helps prepare drafts and research. It doesn't give legal advice. Your firm reviews and is responsible for anything it sends to a client." },
];
