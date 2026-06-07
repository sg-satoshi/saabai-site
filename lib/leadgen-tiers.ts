/**
 * LeadGen Tier Configuration
 *
 * Defines what each plan tier includes for notifications,
 * plus overage pricing for when clients exceed their monthly limits.
 * These limits reset monthly per client.
 */
export interface NotificationLimits {
  email: "unlimited";
  sms: number;
  whatsapp: number;
}

export type PlanTier = "starter" | "pro" | "enterprise";

export const TIER_LIMITS: Record<PlanTier, NotificationLimits> = {
  starter: {
    email: "unlimited",
    sms: 10,
    whatsapp: 10,
  },
  pro: {
    email: "unlimited",
    sms: 50,
    whatsapp: 50,
  },
  enterprise: {
    email: "unlimited",
    sms: 500,
    whatsapp: 500,
  },
};

/**
 * Overage pricing — clients can buy extra message blocks
 * when they exceed their monthly limit.
 */
export const OVERAGE = {
  /** Number of messages per top-up block */
  blockSize: 100,
  /** Price in AUD per block */
  pricePerBlock: 15,
  /** Label for the checkout */
  blockLabel: "100 messages",
  /** Stripe price ID for the top-up product (set after creating in Stripe dashboard) */
  stripePriceId: process.env.STRIPE_TOPUP_PRICE_ID || "",
};

/**
 * Usage counters stored per-client in Redis.
 * Key format: leadgen:usage:{clientId}:{period}
 * Period format: YYYY-MM (e.g. "2026-07")
 *
 * Fields in the hash:
 *   sms           — count of SMS sent within plan limit
 *   whatsapp      — count of WhatsApp sent within plan limit
 *   smsOverage    — count of SMS sent over the plan limit
 *   whatsappOverage — count of WhatsApp sent over the plan limit
 *   smsTopup      — extra SMS purchased via top-up this period
 *   whatsappTopup — extra WhatsApp purchased via top-up this period
 */
export function getUsageKey(clientId: string): string {
  const now = new Date();
  const bne = new Date(now.getTime() + 10 * 60 * 60 * 1000);
  const period = bne.toISOString().slice(0, 7);
  return `leadgen:usage:${clientId}:${period}`;
}

/**
 * Stripe price IDs per tier (for checkout metadata).
 */
export const TIER_METADATA: Record<PlanTier, {
  label: string;
  monthlyPrice: number;
  sms: number;
  whatsapp: number;
}> = {
  starter: {
    label: "Starter",
    monthlyPrice: 29,
    sms: 10,
    whatsapp: 10,
  },
  pro: {
    label: "Pro",
    monthlyPrice: 79,
    sms: 50,
    whatsapp: 50,
  },
  enterprise: {
    label: "Enterprise",
    monthlyPrice: 199,
    sms: 500,
    whatsapp: 500,
  },
};
