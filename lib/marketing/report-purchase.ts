import { sendCapiEvent } from "./capi";
import { purchaseEventFromSession, type CheckoutLike } from "./purchase";

/**
 * Server Purchase for a Stripe Checkout session. Safe to call from webhooks:
 * missing env vars and Meta errors do not throw, and Stripe config is untouched.
 */
export async function reportCheckoutPurchase(session: CheckoutLike | null | undefined): Promise<{ sent: boolean }> {
  const purchase = purchaseEventFromSession(session);
  if (!purchase) return { sent: false };
  const result = await sendCapiEvent({
    eventName: "Purchase",
    eventId: purchase.eventId,
    email: purchase.email,
    phone: purchase.phone,
    value: purchase.value,
    currency: "AUD",
    contentName: purchase.contentName,
    contentCategory: purchase.contentCategory,
    contentIds: purchase.contentIds,
    contentType: "product",
  });
  return { sent: result.sent };
}
