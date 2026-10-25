/**
 * Maps a paid Stripe Checkout session to a Purchase event.
 * Blueprint orders and website care-plan / add-on payments only.
 * Lex subscriptions and anything unpaid are ignored.
 */

export type CheckoutLike = {
  id?: string | null;
  payment_status?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  customer_email?: string | null;
  customer_details?: { email?: string | null; phone?: string | null } | null;
  metadata?: Record<string, string | null | undefined> | null;
};

export type PurchaseEvent = {
  eventId: string;
  transactionId: string;
  value: number;
  currency: "AUD";
  email?: string;
  phone?: string;
  contentName: string;
  contentIds: string[];
  contentCategory: "blueprint" | "website";
};

export function purchaseEventFromSession(session: CheckoutLike | null | undefined): PurchaseEvent | null {
  if (!session?.id) return null;
  const status = session.payment_status;
  if (status && status !== "paid" && status !== "no_payment_required") return null;
  const currency = (session.currency || "aud").toLowerCase();
  if (currency !== "aud") return null;
  if (typeof session.amount_total !== "number" || !Number.isFinite(session.amount_total)) return null;

  const meta = session.metadata || {};
  const blueprint = meta.product === "blueprint";
  const website = meta.source === "saabai-billing" && (meta.kind === "setup" || meta.kind === "addon");
  if (!blueprint && !website) return null;

  const email = session.customer_details?.email || session.customer_email || undefined;
  const phone = session.customer_details?.phone || meta.phone || undefined;
  const value = Math.round(session.amount_total) / 100;
  const base = {
    eventId: `purchase_${session.id}`,
    transactionId: session.id,
    value,
    currency: "AUD" as const,
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
  };

  if (blueprint) {
    const tier = meta.tier || "blueprint";
    const label = tier === "blueprint" ? "Saabai Blueprint" : `Saabai Blueprint ${tier}`;
    return { ...base, contentName: label, contentIds: [`blueprint_${tier}`], contentCategory: "blueprint" };
  }

  const addon = meta.kind === "addon";
  return {
    ...base,
    contentName: addon ? "Website add-on" : "Website care plan",
    contentIds: [addon ? meta.addonId || "addon" : meta.planId || "care_plan"],
    contentCategory: "website",
  };
}
