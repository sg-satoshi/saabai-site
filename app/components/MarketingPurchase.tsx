"use client";

import { useEffect } from "react";
import { trackMarketingPurchase } from "../../lib/marketing/browser";

/** Browser Purchase, paired with the webhook event id purchase_<session id>. */
export default function MarketingPurchase({
  eventId,
  transactionId,
  value,
  contentName,
  contentId,
  contentCategory,
}: {
  eventId: string;
  transactionId: string;
  value: number;
  contentName: string;
  contentId: string;
  contentCategory: "blueprint" | "website";
}) {
  useEffect(() => {
    trackMarketingPurchase({ eventId, transactionId, value, contentName, contentId, contentCategory });
  }, [eventId, transactionId, value, contentName, contentId, contentCategory]);
  return null;
}
