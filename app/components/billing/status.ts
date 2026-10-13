export type BillingRecordSummary = {
  siteId: string; status: string; planName: string; monthlyCents: number; contact: { name: string; email: string };
  linkSentAt?: string; linkExpiresAt?: string; failedAt?: string; dunningSent: number; currentPeriodEnd?: string; stripeCustomerId?: string;
};

export const STATUS_UI: Record<string, { label: string; tone: string }> = {
  none: { label: "No billing", tone: "n" },
  pending: { label: "Pending payment", tone: "warn" },
  link_expired: { label: "Link expired", tone: "n" },
  active: { label: "Active", tone: "ok" },
  payment_failed: { label: "Payment failed", tone: "bad" },
  past_due: { label: "Past due", tone: "bad" },
  paused: { label: "Paused", tone: "bad" },
  cancelling: { label: "Cancels at cycle end", tone: "warn" },
  cancelled: { label: "Cancelled", tone: "n" },
};

export const aud = (c: number) => `$${(c / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const shortDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Brisbane" }) : "");
export const daysSince = (iso?: string) => (iso ? Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86400000)) : 0);

export function statusDetail(r: BillingRecordSummary): string {
  switch (r.status) {
    case "pending": return `Expires ${shortDate(r.linkExpiresAt)}`;
    case "link_expired": return `Link expired ${shortDate(r.linkExpiresAt)}`;
    case "payment_failed": return `Card declined ${shortDate(r.failedAt)}`;
    case "past_due": return `${aud(r.monthlyCents)} overdue ${daysSince(r.failedAt)} days`;
    case "paused": return `Paused after 30 days unpaid`;
    case "cancelling": return `Ends ${shortDate(r.currentPeriodEnd)}`;
    default: return `${r.planName} · ${aud(r.monthlyCents)}/mo`;
  }
}
