"use client";

import { useEffect, useState } from "react";
import { formatInstant } from "../../../lib/coupons/time";
import type { PickerItem } from "../../../lib/coupons/picker";

/**
 * Dropdown of coupon codes above the manual code box. Choosing one fills the code; Apply still validates on the server.
 * Scheduled codes are greyed out with their start date and time in the admin's own timezone.
 * Hides itself when the list can't be loaded (no coupons access, Stripe down), so the text box keeps working.
 */
export default function CouponPicker({ value, onPick, border, bg, text }: { value: string; onPick: (code: string) => void; border: string; bg: string; text: string }) {
  const [items, setItems] = useState<PickerItem[] | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/admin/payments/coupons")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (live) setItems(Array.isArray(d?.items) ? d.items : null); })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  if (!items || items.length === 0) return null;
  const known = items.some((i) => i.code === value);
  return (
    <select
      aria-label="Choose a coupon"
      value={known ? value : ""}
      onChange={(e) => onPick(e.target.value)}
      style={{ width: "100%", marginBottom: 8, padding: "9px 12px", borderRadius: 8, border: `1px solid ${border}`, background: bg, fontSize: 13, color: text, boxSizing: "border-box" }}
    >
      <option value="">Choose a coupon…</option>
      {items.map((i) => (
        <option key={i.id} value={i.code} disabled={i.state !== "selectable"} style={i.state === "selectable" ? undefined : { color: "#9ca3af" }}>
          {i.state === "scheduled" && i.startsAt
            ? `${i.label} (starts ${formatInstant(i.startsAt)})`
            : i.state === "product"
              ? `${i.label} (only via Sell on its product)`
              : i.label}
        </option>
      ))}
    </select>
  );
}
