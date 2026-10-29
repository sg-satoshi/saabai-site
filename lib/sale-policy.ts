/**
 * Sale policy: Shane's 7 open questions from the Sale Price design (30 Oct 2026),
 * set to the safe defaults. Change a value here (one PR) to change the rule.
 */
export interface SalePolicy {
  blueprintCreditBasis: "price_paid" | "regular_price";
  countdownFixedDateAboveHours: number;
  recurringDiscountMonths: number;
  allowCouponStacking: boolean;
  priceStableDays: number;
  openSaleReviewDays: number;
  openSaleMaxDays: number;
  blueprintDiscountAllowed: boolean;
}

export const SALE_POLICY: Readonly<SalePolicy> = {
  /** Q1: the Blueprint build credit equals the price actually paid, not the regular price. */
  blueprintCreditBasis: "price_paid",
  /** Q2: more than this many hours left shows the fixed end date; under it shows "Ends in hh mm". */
  countdownFixedDateAboveHours: 24,
  /** Q3: monthly fees may be discounted for the first N months only. 0 = setup and one-off fees only. */
  recurringDiscountMonths: 0,
  /** Q4: a sale price can't be combined with a coupon. */
  allowCouponStacking: false,
  /** Q5: the regular price must be unchanged for this many days before a sale starts (blocks, not warns). PLACEHOLDER pending Shane: 28 is a working figure. */
  priceStableDays: 28,
  /** Q6: an until-further-notice sale shows a review warning after this many days. PLACEHOLDER pending Shane... */
  openSaleReviewDays: 30,
  /** ...and stops applying (reverts to the regular price) after this many days. PLACEHOLDER pending Shane. */
  openSaleMaxDays: 90,
  /** Q7: Blueprint discounting is allowed in principle but switched off by default. */
  blueprintDiscountAllowed: false,
};
