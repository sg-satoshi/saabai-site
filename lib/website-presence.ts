/** "Presence, buy now": fixed-price website build sold online (Shane, 15 Oct 2026). */
export const PRESENCE = {
  id: "presence",
  name: "Presence, buy now",
  build: 2000,
  deposit: 1000,
  balance: 1000,
  care: 100,
  revisions: 2,
  priceEnv: "STRIPE_PRICE_WEBSITE_PRESENCE_DEPOSIT",
  terms:
    "Fixed Presence scope with 2 rounds of revisions. The $1,000 deposit is refundable only before work starts. The $1,000 balance is invoiced before go-live, and $100/mo care starts at go-live. GST not applicable.",
} as const;

export const PRESENCE_ITEM = {
  item_id: "website_presence_deposit",
  item_name: "Presence website deposit",
  item_category: "website",
  price: PRESENCE.deposit,
  quantity: 1,
};

export function presencePriceId(): string | undefined {
  const v = process.env[PRESENCE.priceEnv];
  return v && v.trim() ? v.trim() : undefined;
}

export function presenceCheckoutEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim() && presencePriceId());
}

export function orderRef(sessionId: string): string {
  return "WH-" + sessionId.slice(-6).toUpperCase();
}
