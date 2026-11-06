/**
 * Read coupon uses already saved on checkout events, Blueprint orders and care plan records.
 * No Stripe client and no writes.
 */
import { listEngagements } from "../audit-store";
import { listSiteBilling } from "../billing/store";
import { listEventsSince, type ContactEvent, type ContactEventType } from "../growth/events";
import { collectStoredRedemptions, couponReport, type CouponReportRow } from "./report";

const EVENT_TYPES: ContactEventType[] = ["blueprint_purchased", "purchase", "care_plan_started"];

async function read<T>(label: string, load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch (err) {
    console.error(`[coupon report] ${label}`, err instanceof Error ? err.message : err);
    return fallback;
  }
}

export async function loadCouponReportRows(): Promise<CouponReportRow[]> {
  const [events, engagements, billing] = await Promise.all([
    read("events", () => listEventsSince(0, EVENT_TYPES, 5000), [] as ContactEvent[]),
    read("orders", () => listEngagements(), []),
    read("care plans", () => listSiteBilling(), []),
  ]);
  return couponReport(collectStoredRedemptions({
    events: events.map((e) => ({ refId: e.refId, contactId: e.contactId, meta: e.meta })),
    engagements: engagements.map((e) => ({
      stripeRef: e.stripeRef,
      contactEmail: e.contactEmail,
      couponCode: e.couponCode,
      discountCents: e.discountCents,
    })),
    billing: billing.map((b) => ({
      contactEmail: b.contact?.email,
      couponCode: b.couponCode,
      discountCents: b.discountCents,
      checkoutSessionId: b.checkoutSessionId,
    })),
  }));
}
