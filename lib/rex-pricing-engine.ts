/**
 * Rex Pricing Engine — PlasticOnline (PLON)
 *
 * Deterministic pricing for all stocked materials.
 * Rex calls getPricing() as a tool — no LLM arithmetic, no hallucinated prices.
 *
 * To update pricing: find the relevant data array below and edit the number.
 * Data last updated: April 2026.
 */

import { getProductUrl } from "./url-generator";

// ── Constants ─────────────────────────────────────────────────────────────────

const MIN_ORDER    = 50;   // $50 Ex GST minimum; below this a $30 fee applies
const CUTTING_FEE  = 30;   // added when CTS price > sheet price cap, or order < $50
const BULK_QTY     = 5;    // 5+ sheets of same product = 5% off
const BULK_RATE    = 0.05;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PricingInput {
  type: "sheet" | "rod" | "tube";
  material: string;
  colour?: string;
  thicknessMm?: number;
  diameterMm?: number;
  widthMm?: number;
  heightMm?: number;
  lengthMm?: number;
  quantity?: number;
}

export interface PriceResult {
  found: boolean;
  price: number;
  priceFormatted: string;
  note: string;
  productUrl: string;
  bulkDiscountApplied: boolean;
  minimumFeeApplied: boolean;
}

interface SheetRow {
  colour: string;
  thicknessMm: number;
  sheetW: number;
  sheetH: number;
  ctsRate: number | null;   // $/m² — null means full sheet only
  fullSheetPrice: number;
}

interface AcetalRow {
  colour: string;
  thicknessMm: number;
  ctsLow: number;          // area < 1m²
  ctsMid: number | null;   // 1m² ≤ area < 2m²
  fullSheetPrice: number;  // standard sheet: 2000×1000mm
}

interface PtfeRow {
  thicknessMm: number;
  ctsLow: number;   // area < 0.5m²
  ctsMid: number;   // 0.5m² ≤ area < 1.44m²
  fullSheetPrice: number;  // standard sheet: 1200×1200mm
}

interface OversizedRow {
  thicknessMm: number;
  sheetW: number;
  sheetH: number;
  clear?: number;
  opal?: number;
  black_white?: number;
  black?: number;
  white?: number;
  tint?: number;
  grey_tint?: number;
}

interface CorflutRow {
  colour: string;
  thicknessMm: number;
  priceEach: number;
  priceQty10: number;
}

interface RodRow {
  diameterMm: number;
  colour: string;
  standardLengthM: number;
  fullLengthPrice: number;    // total price for one standard-length piece
  ctsRatePerM: number | null; // per-metre rate for cuts < standard length
}

interface TubeRow {
  od: number;
  id?: number;
  shape: "round" | "square";
  material: string;
  lengthM: number;
  pricePerLength: number;
}

// ── Acrylic Sheet Data ─────────────────────────────────────────────────────────

const ACRYLIC: SheetRow[] = [
  // 1.5mm
  { colour: "clear", thicknessMm: 1.5, sheetW: 1830, sheetH: 1270, ctsRate: 54.21, fullSheetPrice: 60 },
  // 2mm
  { colour: "clear",       thicknessMm: 2, sheetW: 2440, sheetH: 1220, ctsRate: 63.49,  fullSheetPrice: 90 },
  { colour: "opal",        thicknessMm: 2, sheetW: 2440, sheetH: 1220, ctsRate: 70.55,  fullSheetPrice: 100 },
  { colour: "clear satin", thicknessMm: 2, sheetW: 2440, sheetH: 1220, ctsRate: 102.79, fullSheetPrice: 136 },
  { colour: "white",       thicknessMm: 2, sheetW: 2440, sheetH: 1220, ctsRate: 73.37,  fullSheetPrice: 104 },
  { colour: "black",       thicknessMm: 2, sheetW: 2440, sheetH: 1220, ctsRate: 73.37,  fullSheetPrice: 104 },
  // 3mm
  { colour: "clear",          thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 88.89,  fullSheetPrice: 126 },
  { colour: "clear satin",    thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 126.98, fullSheetPrice: 168 },
  { colour: "opal",           thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 95.94,  fullSheetPrice: 136 },
  { colour: "opal satin",     thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 128.49, fullSheetPrice: 170 },
  { colour: "fluoro",         thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 119.93, fullSheetPrice: 170 },
  { colour: "tint",           thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 110.05, fullSheetPrice: 156 },
  { colour: "black",          thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 100.17, fullSheetPrice: 142 },
  { colour: "white",          thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 100.17, fullSheetPrice: 142 },
  { colour: "black satin",    thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 133.03, fullSheetPrice: 176 },
  { colour: "white satin",    thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 128.49, fullSheetPrice: 170 },
  { colour: "colour",         thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 111.46, fullSheetPrice: 158 },
  // 4.5mm
  { colour: "clear",            thicknessMm: 4.5, sheetW: 2440, sheetH: 1220, ctsRate: 134.04, fullSheetPrice: 190 },
  { colour: "clear satin",      thicknessMm: 4.5, sheetW: 2440, sheetH: 1220, ctsRate: 179.89, fullSheetPrice: 238 },
  { colour: "opal",             thicknessMm: 4.5, sheetW: 2440, sheetH: 1220, ctsRate: 143.91, fullSheetPrice: 204 },
  { colour: "opal satin",       thicknessMm: 4.5, sheetW: 2440, sheetH: 1220, ctsRate: 191.98, fullSheetPrice: 254 },
  { colour: "black",            thicknessMm: 4.5, sheetW: 2440, sheetH: 1220, ctsRate: 150.97, fullSheetPrice: 214 },
  { colour: "white",            thicknessMm: 4.5, sheetW: 2440, sheetH: 1220, ctsRate: 150.97, fullSheetPrice: 214 },
  { colour: "black satin",      thicknessMm: 4.5, sheetW: 2440, sheetH: 1220, ctsRate: 199.54, fullSheetPrice: 264 },
  { colour: "tint",             thicknessMm: 4.5, sheetW: 2440, sheetH: 1220, ctsRate: 165.08, fullSheetPrice: 234 },
  { colour: "marine green tint",thicknessMm: 4.5, sheetW: 2440, sheetH: 1220, ctsRate: 162.25, fullSheetPrice: 230 },
  // 6mm
  { colour: "clear",            thicknessMm: 6, sheetW: 2440, sheetH: 1220, ctsRate: 177.77, fullSheetPrice: 252 },
  { colour: "opal",             thicknessMm: 6, sheetW: 2440, sheetH: 1220, ctsRate: 191.88, fullSheetPrice: 272 },
  { colour: "opal satin",       thicknessMm: 6, sheetW: 2440, sheetH: 1220, ctsRate: 256.99, fullSheetPrice: 340 },
  { colour: "marine green tint",thicknessMm: 6, sheetW: 2440, sheetH: 1220, ctsRate: 227.16, fullSheetPrice: 322 },
  { colour: "tint",             thicknessMm: 6, sheetW: 2440, sheetH: 1220, ctsRate: 220.10, fullSheetPrice: 312 },
  { colour: "black",            thicknessMm: 6, sheetW: 2440, sheetH: 1220, ctsRate: 200.35, fullSheetPrice: 284 },
  { colour: "white",            thicknessMm: 6, sheetW: 2440, sheetH: 1220, ctsRate: 200.35, fullSheetPrice: 284 },
  { colour: "white satin",      thicknessMm: 6, sheetW: 2440, sheetH: 1220, ctsRate: 256.99, fullSheetPrice: 340 },
  { colour: "black satin",      thicknessMm: 6, sheetW: 2440, sheetH: 1220, ctsRate: 266.06, fullSheetPrice: 352 },
  // 8mm
  { colour: "clear", thicknessMm: 8, sheetW: 2440, sheetH: 1220, ctsRate: 197.53, fullSheetPrice: 319.20 },
  // 10mm
  { colour: "clear",      thicknessMm: 10, sheetW: 2440, sheetH: 1220, ctsRate: 246.91, fullSheetPrice: 399 },
  { colour: "opal",       thicknessMm: 10, sheetW: 2440, sheetH: 1220, ctsRate: 265.72, fullSheetPrice: 429.40 },
  { colour: "white",      thicknessMm: 10, sheetW: 2440, sheetH: 1220, ctsRate: 292.76, fullSheetPrice: 473.10 },
  { colour: "black",      thicknessMm: 10, sheetW: 2440, sheetH: 1220, ctsRate: 292.76, fullSheetPrice: 473.10 },
  { colour: "tint",       thicknessMm: 10, sheetW: 2440, sheetH: 1220, ctsRate: 305.70, fullSheetPrice: 494 },
  { colour: "opal satin", thicknessMm: 10, sheetW: 2440, sheetH: 1220, ctsRate: 427.81, fullSheetPrice: 537.70 },
  { colour: "white satin",thicknessMm: 10, sheetW: 2440, sheetH: 1220, ctsRate: 461.07, fullSheetPrice: 579.50 },
  // 12mm
  { colour: "clear", thicknessMm: 12, sheetW: 2440, sheetH: 1220, ctsRate: 296.29, fullSheetPrice: 478.80 },
  { colour: "opal",  thicknessMm: 12, sheetW: 2440, sheetH: 1220, ctsRate: 319.81, fullSheetPrice: 516.80 },
  { colour: "white", thicknessMm: 12, sheetW: 2440, sheetH: 1220, ctsRate: 350.38, fullSheetPrice: 566.20 },
  // 15mm
  { colour: "clear", thicknessMm: 15, sheetW: 2440, sheetH: 1220, ctsRate: 407.99, fullSheetPrice: 659.30 },
  { colour: "opal",  thicknessMm: 15, sheetW: 2440, sheetH: 1220, ctsRate: 440.91, fullSheetPrice: 712.50 },
  { colour: "black", thicknessMm: 15, sheetW: 2440, sheetH: 1220, ctsRate: 438.56, fullSheetPrice: 708.70 },
  { colour: "white", thicknessMm: 15, sheetW: 2440, sheetH: 1220, ctsRate: 438.56, fullSheetPrice: 708.70 },
  // 20mm
  { colour: "clear", thicknessMm: 20, sheetW: 2440, sheetH: 1220, ctsRate: 593.76, fullSheetPrice: 833.25 },
  { colour: "opal",  thicknessMm: 20, sheetW: 2440, sheetH: 1220, ctsRate: 594.93, fullSheetPrice: 834.90 },
  { colour: "white", thicknessMm: 20, sheetW: 2440, sheetH: 1220, ctsRate: 611.39, fullSheetPrice: 858 },
  { colour: "black", thicknessMm: 20, sheetW: 2440, sheetH: 1220, ctsRate: 611.39, fullSheetPrice: 858 },
  // 25mm
  { colour: "clear", thicknessMm: 25, sheetW: 2440, sheetH: 1220, ctsRate: 738.38,  fullSheetPrice: 1036.20 },
  { colour: "opal",  thicknessMm: 25, sheetW: 2440, sheetH: 1220, ctsRate: 750.13,  fullSheetPrice: 1052.70 },
  { colour: "black", thicknessMm: 25, sheetW: 2440, sheetH: 1220, ctsRate: 1054.66, fullSheetPrice: 1480.05 },
  // 30mm
  { colour: "clear", thicknessMm: 30, sheetW: 2440, sheetH: 1220, ctsRate: 912.39,  fullSheetPrice: 1164 },
  { colour: "opal",  thicknessMm: 30, sheetW: 2440, sheetH: 1220, ctsRate: 1033.49, fullSheetPrice: 1318.50 },
  // 40mm
  { colour: "clear", thicknessMm: 40, sheetW: 2440, sheetH: 1220, ctsRate: 1521.43, fullSheetPrice: 1941 },
  // 50mm
  { colour: "clear", thicknessMm: 50, sheetW: 2440, sheetH: 1220, ctsRate: 1848.29, fullSheetPrice: 2358 },
];

// Acrylic oversized — piece doesn't fit standard 2440×1220 sheet
// CTS rate is same as standard sheet; only the cap price changes
// Sorted smallest sheet first — code picks the smallest that fits
const ACRYLIC_OVERSIZED: OversizedRow[] = [
  { thicknessMm: 3,  sheetW: 2490, sheetH: 1880, clear: 194,    opal: 222,    black_white: 254 },
  { thicknessMm: 3,  sheetW: 3050, sheetH: 2030, clear: 266,    opal: 294,    black_white: 306 },
  { thicknessMm: 4.5,sheetW: 2490, sheetH: 1880, clear: 332,    opal: 334,    black_white: 320, tint: 364 },
  { thicknessMm: 4.5,sheetW: 3050, sheetH: 2030, clear: 400,    opal: 442,    black_white: 506, tint: 504 },
  { thicknessMm: 6,  sheetW: 2490, sheetH: 1880, clear: 402,    opal: 444,    white: 460 },
  { thicknessMm: 6,  sheetW: 3050, sheetH: 2030, clear: 532,    opal: 588,    white: 674 },
  { thicknessMm: 8,  sheetW: 2490, sheetH: 1880, clear: 454.10 },
  { thicknessMm: 8,  sheetW: 3050, sheetH: 2030, clear: 674.50 },
  { thicknessMm: 10, sheetW: 2490, sheetH: 1830, clear: 676.40, white: 729.60 },
  { thicknessMm: 10, sheetW: 3050, sheetH: 2030, clear: 841.70 },
  { thicknessMm: 12, sheetW: 2490, sheetH: 1880, clear: 784.70 },
  { thicknessMm: 12, sheetW: 3050, sheetH: 2030, clear: 1010.80 },
  { thicknessMm: 15, sheetW: 3000, sheetH: 2000, clear: 1390.80 },
];

// ── Polycarbonate Sheet Data ───────────────────────────────────────────────────

const PC: SheetRow[] = [
  { colour: "clear",    thicknessMm: 1,    sheetW: 2440, sheetH: 1220, ctsRate: 64.90,   fullSheetPrice: 101.20 },
  { colour: "clear",    thicknessMm: 1.5,  sheetW: 2440, sheetH: 1220, ctsRate: 77.60,   fullSheetPrice: 121.00 },
  { colour: "clear",    thicknessMm: 2,    sheetW: 2440, sheetH: 1220, ctsRate: 91.71,   fullSheetPrice: 143.00 },
  { colour: "clear",    thicknessMm: 3,    sheetW: 2440, sheetH: 1220, ctsRate: 115.69,  fullSheetPrice: 180.40 },
  { colour: "opal",     thicknessMm: 3,    sheetW: 2440, sheetH: 1220, ctsRate: 132.63,  fullSheetPrice: 206.80 },
  { colour: "grey tint",thicknessMm: 3,    sheetW: 2440, sheetH: 1220, ctsRate: 132.63,  fullSheetPrice: 206.80 },
  { colour: "clear",    thicknessMm: 4.5,  sheetW: 2440, sheetH: 1220, ctsRate: 157.01,  fullSheetPrice: 233.70 },
  { colour: "opal",     thicknessMm: 4.5,  sheetW: 2440, sheetH: 1220, ctsRate: 179.99,  fullSheetPrice: 267.90 },
  { colour: "grey tint",thicknessMm: 4.5,  sheetW: 2440, sheetH: 1220, ctsRate: 179.99,  fullSheetPrice: 267.90 },
  { colour: "clear",    thicknessMm: 6,    sheetW: 2440, sheetH: 1220, ctsRate: 209.35,  fullSheetPrice: 311.60 },
  { colour: "opal",     thicknessMm: 6,    sheetW: 2440, sheetH: 1220, ctsRate: 239.99,  fullSheetPrice: 357.20 },
  { colour: "grey tint",thicknessMm: 6,    sheetW: 2440, sheetH: 1220, ctsRate: 229.78,  fullSheetPrice: 342.00 },
  { colour: "clear",    thicknessMm: 8,    sheetW: 2440, sheetH: 1220, ctsRate: 280.84,  fullSheetPrice: 418.00 },
  { colour: "clear",    thicknessMm: 9.5,  sheetW: 2440, sheetH: 1220, ctsRate: 331.90,  fullSheetPrice: 494.00 },
  { colour: "grey tint",thicknessMm: 9.5,  sheetW: 2440, sheetH: 1220, ctsRate: 380.41,  fullSheetPrice: 566.20 },
  { colour: "clear",    thicknessMm: 12,   sheetW: 2440, sheetH: 1220, ctsRate: 418.70,  fullSheetPrice: 623.20 },
  // AR grades
  { colour: "clear ar", thicknessMm: 6,    sheetW: 2440, sheetH: 1220, ctsRate: 887.46,  fullSheetPrice: 1069.30 },
  { colour: "clear ar", thicknessMm: 9.5,  sheetW: 2440, sheetH: 1220, ctsRate: 1406.68, fullSheetPrice: 1694.90 },
  { colour: "clear ar", thicknessMm: 12.7, sheetW: 2440, sheetH: 1220, ctsRate: 1879.33, fullSheetPrice: 2264.40 },
];

// PC oversized — NOTE: PC oversized first option is 2440×1830 (NOT 2490×1880 like acrylic)
const PC_OVERSIZED: OversizedRow[] = [
  { thicknessMm: 3,   sheetW: 2440, sheetH: 1830, clear: 279.40, opal: 319.00, grey_tint: 319.00 },
  { thicknessMm: 3,   sheetW: 3050, sheetH: 2030, clear: 385.70, opal: 383.80 },
  { thicknessMm: 4.5, sheetW: 2440, sheetH: 1830, clear: 362.90, grey_tint: 414.20 },
  { thicknessMm: 4.5, sheetW: 3050, sheetH: 2030, clear: 579.50 },
  { thicknessMm: 6,   sheetW: 2440, sheetH: 1830, clear: 482.60, opal: 551.00, grey_tint: 551.00 },
  { thicknessMm: 6,   sheetW: 3050, sheetH: 2030, clear: 771.40 },
  { thicknessMm: 9.5, sheetW: 2440, sheetH: 1830, clear: 763.80, grey_tint: 872.10 },
  { thicknessMm: 9.5, sheetW: 3050, sheetH: 2030, clear: 1221.70 },
  // AR oversized
  { thicknessMm: 6,   sheetW: 2440, sheetH: 1830, clear: 1604.80 },
  { thicknessMm: 9.5, sheetW: 2440, sheetH: 1830, clear: 2541.50 },
  { thicknessMm: 12.7,sheetW: 2440, sheetH: 1830, clear: 3396.60 },
];

// ── Acetal Sheet Data (POM-C) — two-tier CTS pricing ──────────────────────────
// Standard sheet: 2000×1000mm. area < 1m²: ctsLow; 1–2m²: ctsMid; ≥ 2m²: fullSheetPrice

const ACETAL: AcetalRow[] = [
  { colour: "natural", thicknessMm: 1,   ctsLow: 165.12,  ctsMid: 137.60,  fullSheetPrice: 220.16 },
  { colour: "natural", thicknessMm: 1.5, ctsLow: 248.25,  ctsMid: 206.88,  fullSheetPrice: 331.00 },
  { colour: "natural", thicknessMm: 2,   ctsLow: 331.38,  ctsMid: 276.15,  fullSheetPrice: 397.66 },
  { colour: "natural", thicknessMm: 3,   ctsLow: 496.50,  ctsMid: 413.75,  fullSheetPrice: 595.80 },
  { colour: "natural", thicknessMm: 5,   ctsLow: 486.18,  ctsMid: 405.15,  fullSheetPrice: 583.42 },
  { colour: "natural", thicknessMm: 6,   ctsLow: 411.68,  ctsMid: 343.06,  fullSheetPrice: 521.45 },
  { colour: "natural", thicknessMm: 8,   ctsLow: 529.29,  ctsMid: 441.08,  fullSheetPrice: 670.43 },
  { colour: "natural", thicknessMm: 10,  ctsLow: 661.61,  ctsMid: 551.34,  fullSheetPrice: 838.03 },
  { colour: "natural", thicknessMm: 12,  ctsLow: 793.94,  ctsMid: 661.61,  fullSheetPrice: 1005.65 },
  { colour: "natural", thicknessMm: 15,  ctsLow: 992.42,  ctsMid: 827.01,  fullSheetPrice: 1257.06 },
  { colour: "natural", thicknessMm: 20,  ctsLow: 1323.23, ctsMid: 1102.69, fullSheetPrice: 1676.08 },
  { colour: "natural", thicknessMm: 25,  ctsLow: 1654.02, ctsMid: 1212.95, fullSheetPrice: 1984.82 },
  { colour: "natural", thicknessMm: 30,  ctsLow: 1984.83, ctsMid: 1455.54, fullSheetPrice: 2381.80 },
  { colour: "natural", thicknessMm: 40,  ctsLow: 2646.00, ctsMid: 1940.40, fullSheetPrice: 3175.20 },
  { colour: "natural", thicknessMm: 50,  ctsLow: 2756.71, ctsMid: 2425.91, fullSheetPrice: 3638.86 },
  { colour: "natural", thicknessMm: 60,  ctsLow: 3307.50, ctsMid: null,    fullSheetPrice: 4365.90 },
  { colour: "natural", thicknessMm: 70,  ctsLow: 3859.40, ctsMid: null,    fullSheetPrice: 5094.41 },
  { colour: "natural", thicknessMm: 80,  ctsLow: 4410.00, ctsMid: null,    fullSheetPrice: 5821.20 },
  { colour: "natural", thicknessMm: 90,  ctsLow: 4961.25, ctsMid: null,    fullSheetPrice: 6548.85 },
  { colour: "natural", thicknessMm: 100, ctsLow: 5512.50, ctsMid: null,    fullSheetPrice: 7276.50 },
  // Black
  { colour: "black",   thicknessMm: 2,   ctsLow: 390.71,  ctsMid: 325.59,  fullSheetPrice: 468.85 },
  { colour: "black",   thicknessMm: 3,   ctsLow: 563.72,  ctsMid: 469.76,  fullSheetPrice: 676.46 },
  { colour: "black",   thicknessMm: 6,   ctsLow: 411.68,  ctsMid: 343.06,  fullSheetPrice: 521.45 },
  { colour: "black",   thicknessMm: 8,   ctsLow: 529.29,  ctsMid: 441.08,  fullSheetPrice: 670.43 },
  { colour: "black",   thicknessMm: 10,  ctsLow: 661.61,  ctsMid: 551.34,  fullSheetPrice: 838.03 },
  { colour: "black",   thicknessMm: 12,  ctsLow: 793.94,  ctsMid: 661.61,  fullSheetPrice: 1005.65 },
  { colour: "black",   thicknessMm: 15,  ctsLow: 992.42,  ctsMid: 827.01,  fullSheetPrice: 1257.06 },
  { colour: "black",   thicknessMm: 20,  ctsLow: 1323.23, ctsMid: 1102.69, fullSheetPrice: 1676.08 },
  { colour: "black",   thicknessMm: 25,  ctsLow: 1654.02, ctsMid: 1212.95, fullSheetPrice: 1984.82 },
  { colour: "black",   thicknessMm: 30,  ctsLow: 1984.83, ctsMid: 1455.54, fullSheetPrice: 2381.80 },
  { colour: "black",   thicknessMm: 40,  ctsLow: 2646.00, ctsMid: 1940.40, fullSheetPrice: 3175.20 },
  { colour: "black",   thicknessMm: 45,  ctsLow: 2480.00, ctsMid: null,    fullSheetPrice: 3571.20 },
  { colour: "black",   thicknessMm: 50,  ctsLow: 2756.71, ctsMid: 2425.91, fullSheetPrice: 3638.86 },
  { colour: "black",   thicknessMm: 60,  ctsLow: 3307.50, ctsMid: null,    fullSheetPrice: 4365.90 },
  { colour: "black",   thicknessMm: 70,  ctsLow: 3859.40, ctsMid: null,    fullSheetPrice: 5094.41 },
  { colour: "black",   thicknessMm: 80,  ctsLow: 4410.00, ctsMid: null,    fullSheetPrice: 5821.20 },
  { colour: "black",   thicknessMm: 90,  ctsLow: 4961.25, ctsMid: null,    fullSheetPrice: 6548.85 },
  { colour: "black",   thicknessMm: 100, ctsLow: 5512.50, ctsMid: null,    fullSheetPrice: 7276.50 },
];

// ── Other Sheet Data ───────────────────────────────────────────────────────────

const UHMWPE: SheetRow[] = [
  { colour: "black", thicknessMm: 3,  sheetW: 3000, sheetH: 1220, ctsRate: 271.57,  fullSheetPrice: 629.51 },
  { colour: "black", thicknessMm: 6,  sheetW: 3000, sheetH: 1220, ctsRate: 309.16,  fullSheetPrice: 716.62 },
  { colour: "black", thicknessMm: 8,  sheetW: 3000, sheetH: 1220, ctsRate: 351.50,  fullSheetPrice: 814.78 },
  { colour: "black", thicknessMm: 10, sheetW: 3000, sheetH: 1220, ctsRate: 393.85,  fullSheetPrice: 912.95 },
  { colour: "black", thicknessMm: 12, sheetW: 3000, sheetH: 1220, ctsRate: 453.14,  fullSheetPrice: 1050.38 },
  { colour: "black", thicknessMm: 15, sheetW: 3000, sheetH: 1220, ctsRate: 544.20,  fullSheetPrice: 1261.45 },
  { colour: "black", thicknessMm: 20, sheetW: 3000, sheetH: 1220, ctsRate: 690.30,  fullSheetPrice: 1600.12 },
  { colour: "black", thicknessMm: 25, sheetW: 3000, sheetH: 1220, ctsRate: 861.82,  fullSheetPrice: 1997.70 },
  { colour: "black", thicknessMm: 30, sheetW: 3000, sheetH: 1220, ctsRate: 1033.34, fullSheetPrice: 2206.17 },
  { colour: "black", thicknessMm: 40, sheetW: 3000, sheetH: 1220, ctsRate: 1378.48, fullSheetPrice: 2943.06 },
  { colour: "black", thicknessMm: 50, sheetW: 3000, sheetH: 1220, ctsRate: null,     fullSheetPrice: 3465.41 },
  { colour: "black", thicknessMm: 60, sheetW: 2000, sheetH: 1000, ctsRate: null,     fullSheetPrice: 2225.03 },
];

const POLYPROPYLENE: SheetRow[] = [
  { colour: "grey",    thicknessMm: 2,   sheetW: 3000, sheetH: 1500, ctsRate: 47.91,   fullSheetPrice: 112.42 },
  { colour: "natural", thicknessMm: 2,   sheetW: 2000, sheetH: 1000, ctsRate: 63.53,   fullSheetPrice: 66.25 },
  { colour: "grey",    thicknessMm: 3,   sheetW: 3000, sheetH: 1500, ctsRate: 70.16,   fullSheetPrice: 164.62 },
  { colour: "natural", thicknessMm: 3,   sheetW: 2000, sheetH: 1000, ctsRate: 96.25,   fullSheetPrice: 100.38 },
  { colour: "natural", thicknessMm: 4,   sheetW: 2000, sheetH: 1000, ctsRate: 127.05,  fullSheetPrice: 132.50 },
  { colour: "grey",    thicknessMm: 4.5, sheetW: 3000, sheetH: 1500, ctsRate: 105.23,  fullSheetPrice: 246.92 },
  { colour: "natural", thicknessMm: 5,   sheetW: 2000, sheetH: 1000, ctsRate: 159.78,  fullSheetPrice: 166.62 },
  { colour: "grey",    thicknessMm: 6,   sheetW: 3000, sheetH: 1500, ctsRate: 143.73,  fullSheetPrice: 337.26 },
  { colour: "natural", thicknessMm: 6,   sheetW: 2000, sheetH: 1000, ctsRate: 221.38,  fullSheetPrice: 230.86 },
  { colour: "grey",    thicknessMm: 10,  sheetW: 3000, sheetH: 1500, ctsRate: 229.29,  fullSheetPrice: 538.01 },
  { colour: "grey",    thicknessMm: 12,  sheetW: 3000, sheetH: 1500, ctsRate: 280.62,  fullSheetPrice: 658.46 },
  { colour: "grey",    thicknessMm: 15,  sheetW: 3000, sheetH: 1500, ctsRate: 359.33,  fullSheetPrice: 843.15 },
  { colour: "grey",    thicknessMm: 20,  sheetW: 3000, sheetH: 1500, ctsRate: 467.99,  fullSheetPrice: 1098.10 },
  { colour: "grey",    thicknessMm: 25,  sheetW: 3000, sheetH: 1500, ctsRate: 585.20,  fullSheetPrice: 1373.13 },
  { colour: "grey",    thicknessMm: 30,  sheetW: 3000, sheetH: 1500, ctsRate: 767.43,  fullSheetPrice: 1603.39 },
  { colour: "grey",    thicknessMm: 40,  sheetW: 3000, sheetH: 1500, ctsRate: 1004.42, fullSheetPrice: 2098.53 },
];

const HDPE: SheetRow[] = [
  // Thin (full sheet only)
  { colour: "black",   thicknessMm: 1,   sheetW: 2000, sheetH: 1000, ctsRate: null,   fullSheetPrice: 46 },
  { colour: "black",   thicknessMm: 1.5, sheetW: 2000, sheetH: 1000, ctsRate: null,   fullSheetPrice: 60 },
  { colour: "natural", thicknessMm: 1.5, sheetW: 2000, sheetH: 1000, ctsRate: null,   fullSheetPrice: 60 },
  { colour: "natural", thicknessMm: 2,   sheetW: 2000, sheetH: 1000, ctsRate: null,   fullSheetPrice: 76 },
  // CTS available
  { colour: "black",   thicknessMm: 3,   sheetW: 3000, sheetH: 1500, ctsRate: 66.67,  fullSheetPrice: 158 },
  { colour: "natural", thicknessMm: 3,   sheetW: 3000, sheetH: 1500, ctsRate: 64.87,  fullSheetPrice: 153 },
  { colour: "black",   thicknessMm: 4.5, sheetW: 3000, sheetH: 1500, ctsRate: 118.04, fullSheetPrice: 279 },
  { colour: "natural", thicknessMm: 4.5, sheetW: 3000, sheetH: 1500, ctsRate: 108.15, fullSheetPrice: 256 },
  { colour: "black",   thicknessMm: 6,   sheetW: 3000, sheetH: 1500, ctsRate: 137.78, fullSheetPrice: 326 },
  { colour: "natural", thicknessMm: 6,   sheetW: 3000, sheetH: 1500, ctsRate: 129.80, fullSheetPrice: 307 },
  { colour: "black",   thicknessMm: 8,   sheetW: 3000, sheetH: 1500, ctsRate: 182.22, fullSheetPrice: 369 },
  { colour: "natural", thicknessMm: 8,   sheetW: 3000, sheetH: 1500, ctsRate: 173.02, fullSheetPrice: 350 },
  { colour: "black",   thicknessMm: 10,  sheetW: 3000, sheetH: 1500, ctsRate: 217.78, fullSheetPrice: 441 },
  { colour: "natural", thicknessMm: 10,  sheetW: 3000, sheetH: 1500, ctsRate: 216.30, fullSheetPrice: 438 },
  { colour: "natural", thicknessMm: 12,  sheetW: 3000, sheetH: 1500, ctsRate: 227.10, fullSheetPrice: 526 },
  { colour: "black",   thicknessMm: 15,  sheetW: 3000, sheetH: 1500, ctsRate: 291.67, fullSheetPrice: 675 },
  { colour: "natural", thicknessMm: 15,  sheetW: 3000, sheetH: 1500, ctsRate: 283.90, fullSheetPrice: 657 },
  { colour: "black",   thicknessMm: 20,  sheetW: 3000, sheetH: 1500, ctsRate: 385.00, fullSheetPrice: 891 },
  { colour: "natural", thicknessMm: 20,  sheetW: 3000, sheetH: 1500, ctsRate: 378.53, fullSheetPrice: 876 },
  { colour: "black",   thicknessMm: 25,  sheetW: 3000, sheetH: 1500, ctsRate: 501.67, fullSheetPrice: 1161 },
  { colour: "natural", thicknessMm: 25,  sheetW: 3000, sheetH: 1500, ctsRate: 473.12, fullSheetPrice: 1095 },
  { colour: "black",   thicknessMm: 30,  sheetW: 3000, sheetH: 1500, ctsRate: 629.00, fullSheetPrice: 1243 },
  { colour: "natural", thicknessMm: 30,  sheetW: 3000, sheetH: 1500, ctsRate: 600.20, fullSheetPrice: 1186 },
  { colour: "black",   thicknessMm: 40,  sheetW: 3000, sheetH: 1500, ctsRate: 970.22, fullSheetPrice: 1918 },
  // Full sheet only (heavy)
  { colour: "black",   thicknessMm: 50,  sheetW: 2000, sheetH: 1000, ctsRate: null,   fullSheetPrice: 1203 },
  { colour: "black",   thicknessMm: 60,  sheetW: 2000, sheetH: 1000, ctsRate: null,   fullSheetPrice: 2288 },
  { colour: "black",   thicknessMm: 100, sheetW: 2000, sheetH: 1000, ctsRate: null,   fullSheetPrice: 4570 },
  { colour: "black",   thicknessMm: 140, sheetW: 2000, sheetH: 1000, ctsRate: null,   fullSheetPrice: 4313 },
  { colour: "black",   thicknessMm: 150, sheetW: 2000, sheetH: 1000, ctsRate: null,   fullSheetPrice: 6076 },
  // Yellow UV
  { colour: "yellow",  thicknessMm: 6,   sheetW: 3000, sheetH: 1500, ctsRate: null,   fullSheetPrice: 390 },
  { colour: "yellow",  thicknessMm: 10,  sheetW: 3000, sheetH: 1500, ctsRate: null,   fullSheetPrice: 557 },
  { colour: "yellow",  thicknessMm: 20,  sheetW: 3000, sheetH: 1500, ctsRate: null,   fullSheetPrice: 1142 },
];

const SEABOARD: SheetRow[] = [
  // WHITE — 2440×1220 (AST) — March 2026
  { colour: "white", thicknessMm: 6,    sheetW: 2440, sheetH: 1220, ctsRate: 170.63, fullSheetPrice: 290 },
  { colour: "white", thicknessMm: 10,   sheetW: 2440, sheetH: 1220, ctsRate: 270.66, fullSheetPrice: 437 },
  { colour: "white", thicknessMm: 12,   sheetW: 2440, sheetH: 1220, ctsRate: 341.26, fullSheetPrice: 551 },
  { colour: "white", thicknessMm: 12.7, sheetW: 2440, sheetH: 1220, ctsRate: 368.01, fullSheetPrice: 595 },
  { colour: "white", thicknessMm: 15,   sheetW: 2440, sheetH: 1220, ctsRate: 426.58, fullSheetPrice: 689 },
  { colour: "white", thicknessMm: 19,   sheetW: 2440, sheetH: 1220, ctsRate: 540.32, fullSheetPrice: 827 },
  { colour: "white", thicknessMm: 25,   sheetW: 2440, sheetH: 1220, ctsRate: 710.95, fullSheetPrice: 1088 },
  // WHITE — 2440×1370 (Plastral) — imperial thicknesses / larger format
  { colour: "white", thicknessMm: 6.35, sheetW: 2440, sheetH: 1370, ctsRate: 189.51, fullSheetPrice: 344 },
  { colour: "white", thicknessMm: 9.5,  sheetW: 2440, sheetH: 1370, ctsRate: 288.98, fullSheetPrice: 524 },
  { colour: "white", thicknessMm: 14.28,sheetW: 2440, sheetH: 1380, ctsRate: 464.55, fullSheetPrice: 849 },
  { colour: "white", thicknessMm: 15.8, sheetW: 2440, sheetH: 1370, ctsRate: 487.91, fullSheetPrice: 839 },
  { colour: "white", thicknessMm: 25.4, sheetW: 2440, sheetH: 1370, ctsRate: 768.52, fullSheetPrice: 1211 },
  // BLACK — 2440×1220
  { colour: "black", thicknessMm: 6,    sheetW: 2440, sheetH: 1220, ctsRate: 141.09, fullSheetPrice: 240 },
  { colour: "black", thicknessMm: 9.5,  sheetW: 2440, sheetH: 1220, ctsRate: 319.09, fullSheetPrice: 516 },
  { colour: "black", thicknessMm: 12.7, sheetW: 2440, sheetH: 1220, ctsRate: 349.98, fullSheetPrice: 566 },
  { colour: "black", thicknessMm: 15,   sheetW: 2440, sheetH: 1220, ctsRate: 420.92, fullSheetPrice: 680 },
  { colour: "black", thicknessMm: 19,   sheetW: 2440, sheetH: 1220, ctsRate: 525.56, fullSheetPrice: 805 },
];

const PETG: SheetRow[] = [
  { colour: "clear", thicknessMm: 0.5,  sheetW: 1220, sheetH: 2440, ctsRate: 27.04,  fullSheetPrice: 57.50 },
  { colour: "clear", thicknessMm: 0.75, sheetW: 1220, sheetH: 2440, ctsRate: 27.51,  fullSheetPrice: 58.50 },
  { colour: "clear", thicknessMm: 1,    sheetW: 1220, sheetH: 2440, ctsRate: 36.30,  fullSheetPrice: 61.74 },
  { colour: "clear", thicknessMm: 1.5,  sheetW: 1220, sheetH: 2440, ctsRate: 51.91,  fullSheetPrice: 88.30 },
  { colour: "clear", thicknessMm: 2,    sheetW: 1220, sheetH: 2440, ctsRate: 69.15,  fullSheetPrice: 117.62 },
  { colour: "clear", thicknessMm: 3,    sheetW: 1220, sheetH: 2440, ctsRate: 99.36,  fullSheetPrice: 169.02 },
];

// HIPS — full sheet only
const HIPS: SheetRow[] = [
  { colour: "black", thicknessMm: 1,   sheetW: 1220, sheetH: 2440, ctsRate: null, fullSheetPrice: 47.80 },
  { colour: "black", thicknessMm: 1.5, sheetW: 1220, sheetH: 2440, ctsRate: null, fullSheetPrice: 72.92 },
  { colour: "black", thicknessMm: 2,   sheetW: 1220, sheetH: 2440, ctsRate: null, fullSheetPrice: 95.60 },
  { colour: "black", thicknessMm: 3,   sheetW: 1220, sheetH: 2440, ctsRate: null, fullSheetPrice: 141.42 },
  { colour: "white", thicknessMm: 1,   sheetW: 1220, sheetH: 2440, ctsRate: null, fullSheetPrice: 47.80 },
  { colour: "white", thicknessMm: 1.5, sheetW: 1220, sheetH: 2440, ctsRate: null, fullSheetPrice: 71.64 },
  { colour: "white", thicknessMm: 2,   sheetW: 1220, sheetH: 2440, ctsRate: null, fullSheetPrice: 94.60 },
  { colour: "white", thicknessMm: 3,   sheetW: 1220, sheetH: 2440, ctsRate: null, fullSheetPrice: 142.68 },
];

// PTFE — three-tier pricing. Standard sheet: 1200×1200mm (1.44m²)
const PTFE_SHEETS: PtfeRow[] = [
  { thicknessMm: 1,  ctsLow: 172.54,  ctsMid: 223.66,  fullSheetPrice: 161.04 },
  { thicknessMm: 3,  ctsLow: 518.14,  ctsMid: 671.66,  fullSheetPrice: 483.59 },
  { thicknessMm: 6,  ctsLow: 900.73,  ctsMid: 1167.61, fullSheetPrice: 840.68 },
  { thicknessMm: 10, ctsLow: 1441.28, ctsMid: 1601.42, fullSheetPrice: 1345.19 },
  { thicknessMm: 12, ctsLow: 1801.46, ctsMid: 2001.63, fullSheetPrice: 1681.37 },
  { thicknessMm: 15, ctsLow: 2161.65, ctsMid: 2401.83, fullSheetPrice: 2017.54 },
  { thicknessMm: 20, ctsLow: 3302.68, ctsMid: 3669.65, fullSheetPrice: 3082.50 },
  { thicknessMm: 25, ctsLow: 3602.93, ctsMid: 4003.25, fullSheetPrice: 3362.73 },
  { thicknessMm: 30, ctsLow: 4503.66, ctsMid: 5004.06, fullSheetPrice: 4203.41 },
];

const MIRROR_ACRYLIC: SheetRow[] = [
  { colour: "silver",   thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 223.73, fullSheetPrice: 296 },
  { colour: "rose gold",thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 267.57, fullSheetPrice: 354 },
  { colour: "gold",     thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 267.57, fullSheetPrice: 354 },
];

const EUOMIR: SheetRow[] = [
  { colour: "silver",    thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 180.18, fullSheetPrice: 400.01 },
  { colour: "silver",    thicknessMm: 3, sheetW: 3050, sheetH: 2030, ctsRate: null,   fullSheetPrice: 866.50 },
  { colour: "silver",    thicknessMm: 6, sheetW: 2440, sheetH: 1220, ctsRate: 467.20, fullSheetPrice: 1037.18 },
  { colour: "green",     thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 277.44, fullSheetPrice: 615.92 },
  { colour: "night blue",thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 277.44, fullSheetPrice: 615.92 },
  { colour: "sky blue",  thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 277.44, fullSheetPrice: 615.92 },
  { colour: "purple",    thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 277.44, fullSheetPrice: 615.92 },
  { colour: "orange",    thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 277.44, fullSheetPrice: 615.92 },
  { colour: "rose pink", thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 277.44, fullSheetPrice: 615.92 },
];

const ACP: SheetRow[] = [
  { colour: "white gloss",       thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 91.88,  fullSheetPrice: 93.85 },
  { colour: "white satin",       thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 89.52,  fullSheetPrice: 91.44 },
  { colour: "white satin gloss", thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 100.23, fullSheetPrice: 102.38 },
  { colour: "black satin gloss", thicknessMm: 3, sheetW: 2440, sheetH: 1220, ctsRate: 97.59,  fullSheetPrice: 99.68 },
  { colour: "white satin gloss", thicknessMm: 4, sheetW: 2440, sheetH: 1220, ctsRate: 134.46, fullSheetPrice: 137.34 },
  { colour: "white satin gloss", thicknessMm: 4, sheetW: 3050, sheetH: 1500, ctsRate: 144.17, fullSheetPrice: 226.33 },
  { colour: "black satin gloss", thicknessMm: 4, sheetW: 4000, sheetH: 1500, ctsRate: 181.62, fullSheetPrice: 373.92 },
];

const CORFLUTE: CorflutRow[] = [
  { colour: "white", thicknessMm: 3, priceEach: 13.96, priceQty10: 13.61 },
  { colour: "black", thicknessMm: 3, priceEach: 28.00, priceQty10: 27.30 },
  { colour: "white", thicknessMm: 5, priceEach: 25.92, priceQty10: 25.27 },
  { colour: "black", thicknessMm: 5, priceEach: 44.68, priceQty10: 43.56 },
  { colour: "white", thicknessMm: 8, priceEach: 90.00, priceQty10: 87.75 },
];

const PRISMATIC: SheetRow[] = [
  { colour: "clear", thicknessMm: 3,   sheetW: 2440, sheetH: 1220, ctsRate: 128.49, fullSheetPrice: 170 },
  { colour: "clear", thicknessMm: 4.5, sheetW: 2440, sheetH: 1220, ctsRate: 179.07, fullSheetPrice: 236.92 },
];

// PEEK — full sheet only, 1000×610mm
const PEEK_SHEETS: SheetRow[] = [
  { colour: "natural", thicknessMm: 5,  sheetW: 1000, sheetH: 610, ctsRate: null, fullSheetPrice: 2410.36 },
  { colour: "natural", thicknessMm: 6,  sheetW: 1000, sheetH: 610, ctsRate: null, fullSheetPrice: 2754.25 },
  { colour: "natural", thicknessMm: 8,  sheetW: 1000, sheetH: 610, ctsRate: null, fullSheetPrice: 3489.06 },
  { colour: "natural", thicknessMm: 10, sheetW: 1000, sheetH: 610, ctsRate: null, fullSheetPrice: 3902.02 },
  { colour: "natural", thicknessMm: 12, sheetW: 1000, sheetH: 610, ctsRate: null, fullSheetPrice: 4682.24 },
  { colour: "natural", thicknessMm: 16, sheetW: 1000, sheetH: 610, ctsRate: null, fullSheetPrice: 6243.13 },
  { colour: "natural", thicknessMm: 20, sheetW: 1000, sheetH: 610, ctsRate: null, fullSheetPrice: 7804.03 },
  { colour: "natural", thicknessMm: 25, sheetW: 1000, sheetH: 610, ctsRate: null, fullSheetPrice: 9755.27 },
  { colour: "natural", thicknessMm: 30, sheetW: 1000, sheetH: 610, ctsRate: null, fullSheetPrice: 11706.05 },
];

// ── Rod Data ───────────────────────────────────────────────────────────────────

const ACETAL_RODS: RodRow[] = [
  // < 25mm: full length only (1m standard)
  { diameterMm: 6,  colour: "any", standardLengthM: 1, fullLengthPrice: 4.00,   ctsRatePerM: null },
  { diameterMm: 8,  colour: "any", standardLengthM: 1, fullLengthPrice: 4.32,   ctsRatePerM: null },
  { diameterMm: 10, colour: "any", standardLengthM: 1, fullLengthPrice: 7.16,   ctsRatePerM: null },
  { diameterMm: 12, colour: "any", standardLengthM: 1, fullLengthPrice: 10.12,  ctsRatePerM: null },
  { diameterMm: 15, colour: "any", standardLengthM: 1, fullLengthPrice: 13.55,  ctsRatePerM: null },
  { diameterMm: 20, colour: "any", standardLengthM: 1, fullLengthPrice: 23.97,  ctsRatePerM: null },
  // ≥ 25mm: CTS available
  { diameterMm: 25, colour: "any", standardLengthM: 1, fullLengthPrice: 21.76,  ctsRatePerM: 27.20 },
  { diameterMm: 30, colour: "any", standardLengthM: 1, fullLengthPrice: 31.30,  ctsRatePerM: 39.13 },
  { diameterMm: 35, colour: "any", standardLengthM: 1, fullLengthPrice: 42.32,  ctsRatePerM: 52.90 },
  { diameterMm: 40, colour: "any", standardLengthM: 1, fullLengthPrice: 55.44,  ctsRatePerM: 69.30 },
  { diameterMm: 45, colour: "any", standardLengthM: 1, fullLengthPrice: 70.04,  ctsRatePerM: 87.55 },
  { diameterMm: 50, colour: "any", standardLengthM: 1, fullLengthPrice: 86.42,  ctsRatePerM: 108.03 },
  { diameterMm: 60, colour: "any", standardLengthM: 1, fullLengthPrice: 124.58, ctsRatePerM: 155.73 },
  { diameterMm: 70, colour: "any", standardLengthM: 1, fullLengthPrice: 169.58, ctsRatePerM: 211.98 },
  { diameterMm: 80, colour: "any", standardLengthM: 1, fullLengthPrice: 221.72, ctsRatePerM: 277.15 },
];

const UHMWPE_RODS: RodRow[] = [
  { diameterMm: 20,  colour: "natural", standardLengthM: 1, fullLengthPrice: 13.86,  ctsRatePerM: null },
  { diameterMm: 30,  colour: "natural", standardLengthM: 1, fullLengthPrice: 30.36,  ctsRatePerM: 38.71 },
  { diameterMm: 40,  colour: "natural", standardLengthM: 1, fullLengthPrice: 53.46,  ctsRatePerM: 68.16 },
  { diameterMm: 50,  colour: "natural", standardLengthM: 1, fullLengthPrice: 76.56,  ctsRatePerM: 97.61 },
  { diameterMm: 60,  colour: "natural", standardLengthM: 1, fullLengthPrice: 109.56, ctsRatePerM: 139.69 },
  { diameterMm: 70,  colour: "natural", standardLengthM: 1, fullLengthPrice: 148.50, ctsRatePerM: 189.34 },
  { diameterMm: 80,  colour: "natural", standardLengthM: 1, fullLengthPrice: 193.38, ctsRatePerM: 246.56 },
  { diameterMm: 90,  colour: "natural", standardLengthM: 1, fullLengthPrice: 244.20, ctsRatePerM: 311.36 },
  { diameterMm: 100, colour: "natural", standardLengthM: 1, fullLengthPrice: 348.48, ctsRatePerM: 444.31 },
  { diameterMm: 120, colour: "natural", standardLengthM: 1, fullLengthPrice: 354.89, ctsRatePerM: 492.90 },
  { diameterMm: 130, colour: "natural", standardLengthM: 1, fullLengthPrice: 414.59, ctsRatePerM: 575.83 },
];

const NYLON_RODS: RodRow[] = [
  { diameterMm: 30,  colour: "natural", standardLengthM: 1,   fullLengthPrice: 27.40,   ctsRatePerM: 31.97 },
  { diameterMm: 40,  colour: "natural", standardLengthM: 1,   fullLengthPrice: 38.40,   ctsRatePerM: 51.53 },
  { diameterMm: 50,  colour: "natural", standardLengthM: 1,   fullLengthPrice: 60.02,   ctsRatePerM: 80.56 },
  { diameterMm: 60,  colour: "natural", standardLengthM: 1,   fullLengthPrice: 86.21,   ctsRatePerM: 115.71 },
  { diameterMm: 70,  colour: "natural", standardLengthM: 1,   fullLengthPrice: 117.51,  ctsRatePerM: 157.70 },
  { diameterMm: 80,  colour: "natural", standardLengthM: 1,   fullLengthPrice: 153.36,  ctsRatePerM: 205.82 },
  { diameterMm: 90,  colour: "natural", standardLengthM: 1,   fullLengthPrice: 194.05,  ctsRatePerM: 260.44 },
  { diameterMm: 100, colour: "natural", standardLengthM: 1,   fullLengthPrice: 239.59,  ctsRatePerM: 321.55 },
  { diameterMm: 110, colour: "natural", standardLengthM: 1,   fullLengthPrice: 259.43,  ctsRatePerM: 312.84 },
  { diameterMm: 120, colour: "natural", standardLengthM: 1,   fullLengthPrice: 308.58,  ctsRatePerM: 372.11 },
  { diameterMm: 125, colour: "natural", standardLengthM: 1,   fullLengthPrice: 334.98,  ctsRatePerM: 403.95 },
  { diameterMm: 130, colour: "natural", standardLengthM: 1,   fullLengthPrice: 404.91,  ctsRatePerM: 543.43 },
  { diameterMm: 140, colour: "natural", standardLengthM: 1,   fullLengthPrice: 469.51,  ctsRatePerM: 630.13 },
  { diameterMm: 150, colour: "natural", standardLengthM: 1,   fullLengthPrice: 482.44,  ctsRatePerM: 581.77 },
  { diameterMm: 160, colour: "natural", standardLengthM: 1,   fullLengthPrice: 548.89,  ctsRatePerM: 661.90 },
  { diameterMm: 170, colour: "natural", standardLengthM: 1,   fullLengthPrice: 692.31,  ctsRatePerM: 929.15 },
  { diameterMm: 180, colour: "natural", standardLengthM: 1,   fullLengthPrice: 694.53,  ctsRatePerM: 837.53 },
  { diameterMm: 200, colour: "natural", standardLengthM: 1,   fullLengthPrice: 857.47,  ctsRatePerM: 1034.01 },
  // 230-300mm: 0.6m standard length
  { diameterMm: 230, colour: "natural", standardLengthM: 0.6, fullLengthPrice: 759.43,  ctsRatePerM: 820.50 },
  { diameterMm: 250, colour: "natural", standardLengthM: 0.6, fullLengthPrice: 897.35,  ctsRatePerM: 969.51 },
  { diameterMm: 280, colour: "natural", standardLengthM: 0.6, fullLengthPrice: 1125.44, ctsRatePerM: 1215.95 },
  { diameterMm: 300, colour: "natural", standardLengthM: 0.6, fullLengthPrice: 1292.06, ctsRatePerM: 1395.96 },
];

const HDPE_RODS: RodRow[] = [
  // Per-metre rate applies for any length (no separate CTS rate listed)
  { diameterMm: 10,  colour: "natural", standardLengthM: 1, fullLengthPrice: 5.32,    ctsRatePerM: 5.32 },
  { diameterMm: 10,  colour: "black",   standardLengthM: 1, fullLengthPrice: 5.84,    ctsRatePerM: 5.84 },
  { diameterMm: 12,  colour: "natural", standardLengthM: 1, fullLengthPrice: 6.36,    ctsRatePerM: 6.36 },
  { diameterMm: 12,  colour: "black",   standardLengthM: 1, fullLengthPrice: 7.04,    ctsRatePerM: 7.04 },
  { diameterMm: 15,  colour: "natural", standardLengthM: 1, fullLengthPrice: 7.92,    ctsRatePerM: 7.92 },
  { diameterMm: 15,  colour: "black",   standardLengthM: 1, fullLengthPrice: 8.76,    ctsRatePerM: 8.76 },
  { diameterMm: 20,  colour: "natural", standardLengthM: 1, fullLengthPrice: 10.60,   ctsRatePerM: 10.60 },
  { diameterMm: 20,  colour: "black",   standardLengthM: 1, fullLengthPrice: 11.64,   ctsRatePerM: 11.64 },
  { diameterMm: 25,  colour: "natural", standardLengthM: 1, fullLengthPrice: 10.45,   ctsRatePerM: 10.45 },
  { diameterMm: 25,  colour: "black",   standardLengthM: 1, fullLengthPrice: 11.50,   ctsRatePerM: 11.50 },
  { diameterMm: 30,  colour: "natural", standardLengthM: 1, fullLengthPrice: 15.13,   ctsRatePerM: 15.13 },
  { diameterMm: 30,  colour: "black",   standardLengthM: 1, fullLengthPrice: 16.65,   ctsRatePerM: 16.65 },
  { diameterMm: 35,  colour: "natural", standardLengthM: 1, fullLengthPrice: 23.50,   ctsRatePerM: 23.50 },
  { diameterMm: 35,  colour: "black",   standardLengthM: 1, fullLengthPrice: 22.48,   ctsRatePerM: 22.48 },
  { diameterMm: 40,  colour: "natural", standardLengthM: 1, fullLengthPrice: 26.85,   ctsRatePerM: 26.85 },
  { diameterMm: 40,  colour: "black",   standardLengthM: 1, fullLengthPrice: 29.53,   ctsRatePerM: 29.53 },
  { diameterMm: 50,  colour: "natural", standardLengthM: 1, fullLengthPrice: 41.75,   ctsRatePerM: 41.75 },
  { diameterMm: 50,  colour: "black",   standardLengthM: 1, fullLengthPrice: 45.93,   ctsRatePerM: 45.93 },
  { diameterMm: 60,  colour: "natural", standardLengthM: 1, fullLengthPrice: 55.45,   ctsRatePerM: 55.45 },
  { diameterMm: 60,  colour: "black",   standardLengthM: 1, fullLengthPrice: 61.00,   ctsRatePerM: 61.00 },
  { diameterMm: 70,  colour: "natural", standardLengthM: 1, fullLengthPrice: 75.46,   ctsRatePerM: 75.46 },
  { diameterMm: 70,  colour: "black",   standardLengthM: 1, fullLengthPrice: 82.98,   ctsRatePerM: 82.98 },
  { diameterMm: 80,  colour: "natural", standardLengthM: 1, fullLengthPrice: 98.37,   ctsRatePerM: 98.37 },
  { diameterMm: 80,  colour: "black",   standardLengthM: 1, fullLengthPrice: 108.19,  ctsRatePerM: 108.19 },
  { diameterMm: 90,  colour: "natural", standardLengthM: 1, fullLengthPrice: 124.61,  ctsRatePerM: 124.61 },
  { diameterMm: 90,  colour: "black",   standardLengthM: 1, fullLengthPrice: 137.08,  ctsRatePerM: 137.08 },
  { diameterMm: 100, colour: "natural", standardLengthM: 1, fullLengthPrice: 153.82,  ctsRatePerM: 153.82 },
  { diameterMm: 100, colour: "black",   standardLengthM: 1, fullLengthPrice: 169.19,  ctsRatePerM: 169.19 },
  { diameterMm: 120, colour: "natural", standardLengthM: 1, fullLengthPrice: 182.91,  ctsRatePerM: 182.91 },
  { diameterMm: 120, colour: "black",   standardLengthM: 1, fullLengthPrice: 201.19,  ctsRatePerM: 201.19 },
  { diameterMm: 150, colour: "natural", standardLengthM: 1, fullLengthPrice: 285.86,  ctsRatePerM: 285.86 },
  { diameterMm: 150, colour: "black",   standardLengthM: 1, fullLengthPrice: 314.43,  ctsRatePerM: 314.43 },
  { diameterMm: 200, colour: "natural", standardLengthM: 1, fullLengthPrice: 597.24,  ctsRatePerM: 597.24 },
  { diameterMm: 200, colour: "black",   standardLengthM: 1, fullLengthPrice: 656.97,  ctsRatePerM: 656.97 },
];

const PP_RODS: RodRow[] = [
  { diameterMm: 10,  colour: "beige", standardLengthM: 1, fullLengthPrice: 5.62,    ctsRatePerM: 5.62 },
  { diameterMm: 12,  colour: "beige", standardLengthM: 1, fullLengthPrice: 5.64,    ctsRatePerM: 5.64 },
  { diameterMm: 20,  colour: "beige", standardLengthM: 1, fullLengthPrice: 13.22,   ctsRatePerM: 13.22 },
  { diameterMm: 30,  colour: "beige", standardLengthM: 1, fullLengthPrice: 29.34,   ctsRatePerM: 29.34 },
  { diameterMm: 40,  colour: "beige", standardLengthM: 1, fullLengthPrice: 50.40,   ctsRatePerM: 50.40 },
  { diameterMm: 50,  colour: "beige", standardLengthM: 1, fullLengthPrice: 81.94,   ctsRatePerM: 81.94 },
  { diameterMm: 60,  colour: "beige", standardLengthM: 1, fullLengthPrice: 113.62,  ctsRatePerM: 113.62 },
  { diameterMm: 70,  colour: "beige", standardLengthM: 1, fullLengthPrice: 154.52,  ctsRatePerM: 154.52 },
  { diameterMm: 80,  colour: "beige", standardLengthM: 1, fullLengthPrice: 204.10,  ctsRatePerM: 204.10 },
  { diameterMm: 90,  colour: "beige", standardLengthM: 1, fullLengthPrice: 256.14,  ctsRatePerM: 256.14 },
  { diameterMm: 110, colour: "beige", standardLengthM: 1, fullLengthPrice: 456.12,  ctsRatePerM: 456.12 },
  { diameterMm: 120, colour: "beige", standardLengthM: 1, fullLengthPrice: 376.30,  ctsRatePerM: 376.30 },
  { diameterMm: 150, colour: "beige", standardLengthM: 1, fullLengthPrice: 594.10,  ctsRatePerM: 594.10 },
  { diameterMm: 200, colour: "beige", standardLengthM: 1, fullLengthPrice: 1052.87, ctsRatePerM: 1052.87 },
];

// ── Rigid PVC Sheets ─────────────────────────────────────────────────────────
// Pricing: March 2026. ctsRate = <cutoff rate (smaller pieces).
// Nanya = standard grade (Plastral). Simona = premium grade (Plastral).
// Dotmar Trovidur = premium German grade.
// Simona Dark Grey 30/40/50mm: full sheet only (ctsRate: null).
const RIGID_PVC: SheetRow[] = [
  // Nanya — Clear (2440×1220)
  { colour: "clear",      thicknessMm: 1,    sheetW: 2440, sheetH: 1220, ctsRate: 53.61,  fullSheetPrice: 81.90 },
  { colour: "clear",      thicknessMm: 3,    sheetW: 2440, sheetH: 1220, ctsRate: 126.38, fullSheetPrice: 193.05 },
  { colour: "clear",      thicknessMm: 4.5,  sheetW: 2440, sheetH: 1220, ctsRate: 190.20, fullSheetPrice: 290.55 },
  { colour: "clear",      thicknessMm: 6,    sheetW: 2440, sheetH: 1220, ctsRate: 252.75, fullSheetPrice: 386.10 },
  // Nanya — Light Grey (2440×1220)
  { colour: "light grey", thicknessMm: 1.5,  sheetW: 2440, sheetH: 1220, ctsRate: 53.61,  fullSheetPrice: 81.90 },
  { colour: "light grey", thicknessMm: 3,    sheetW: 2440, sheetH: 1220, ctsRate: 102.12, fullSheetPrice: 156.00 },
  { colour: "light grey", thicknessMm: 4.5,  sheetW: 2440, sheetH: 1220, ctsRate: 153.18, fullSheetPrice: 234.00 },
  { colour: "light grey", thicknessMm: 6,    sheetW: 2440, sheetH: 1220, ctsRate: 204.25, fullSheetPrice: 312.00 },
  { colour: "light grey", thicknessMm: 8,    sheetW: 2440, sheetH: 1220, ctsRate: 237.23, fullSheetPrice: 374.50 },
  { colour: "light grey", thicknessMm: 10,   sheetW: 2440, sheetH: 1220, ctsRate: 295.99, fullSheetPrice: 467.25 },
  { colour: "light grey", thicknessMm: 12,   sheetW: 2440, sheetH: 1220, ctsRate: 354.74, fullSheetPrice: 560.00 },
  { colour: "light grey", thicknessMm: 15,   sheetW: 2440, sheetH: 1220, ctsRate: 443.43, fullSheetPrice: 700.00 },
  { colour: "light grey", thicknessMm: 20,   sheetW: 2440, sheetH: 1220, ctsRate: 537.15, fullSheetPrice: 906.10 },
  // grey = alias for light grey (Nanya)
  { colour: "grey",       thicknessMm: 1.5,  sheetW: 2440, sheetH: 1220, ctsRate: 53.61,  fullSheetPrice: 81.90 },
  { colour: "grey",       thicknessMm: 3,    sheetW: 2440, sheetH: 1220, ctsRate: 102.12, fullSheetPrice: 156.00 },
  { colour: "grey",       thicknessMm: 4.5,  sheetW: 2440, sheetH: 1220, ctsRate: 153.18, fullSheetPrice: 234.00 },
  { colour: "grey",       thicknessMm: 6,    sheetW: 2440, sheetH: 1220, ctsRate: 204.25, fullSheetPrice: 312.00 },
  { colour: "grey",       thicknessMm: 8,    sheetW: 2440, sheetH: 1220, ctsRate: 237.23, fullSheetPrice: 374.50 },
  { colour: "grey",       thicknessMm: 10,   sheetW: 2440, sheetH: 1220, ctsRate: 295.99, fullSheetPrice: 467.25 },
  { colour: "grey",       thicknessMm: 12,   sheetW: 2440, sheetH: 1220, ctsRate: 354.74, fullSheetPrice: 560.00 },
  { colour: "grey",       thicknessMm: 15,   sheetW: 2440, sheetH: 1220, ctsRate: 443.43, fullSheetPrice: 700.00 },
  { colour: "grey",       thicknessMm: 20,   sheetW: 2440, sheetH: 1220, ctsRate: 537.15, fullSheetPrice: 906.10 },
  // Nanya — White (2440×1220)
  { colour: "white",      thicknessMm: 1.5,  sheetW: 2440, sheetH: 1220, ctsRate: 76.59,  fullSheetPrice: 117.00 },
  { colour: "white",      thicknessMm: 3,    sheetW: 2440, sheetH: 1220, ctsRate: 114.89, fullSheetPrice: 175.50 },
  { colour: "white",      thicknessMm: 4.5,  sheetW: 2440, sheetH: 1220, ctsRate: 172.33, fullSheetPrice: 263.25 },
  { colour: "white",      thicknessMm: 6,    sheetW: 2440, sheetH: 1220, ctsRate: 229.78, fullSheetPrice: 351.00 },
  { colour: "white",      thicknessMm: 10,   sheetW: 2440, sheetH: 1220, ctsRate: 332.57, fullSheetPrice: 525.00 },
  // Simona — Swiss Grey (2440×1220 and 3000×1500)
  { colour: "swiss grey", thicknessMm: 3,    sheetW: 2440, sheetH: 1220, ctsRate: 95.74,  fullSheetPrice: 146.25 },
  { colour: "swiss grey", thicknessMm: 4.5,  sheetW: 2440, sheetH: 1220, ctsRate: 144.25, fullSheetPrice: 220.35 },
  { colour: "swiss grey", thicknessMm: 6,    sheetW: 2440, sheetH: 1220, ctsRate: 191.48, fullSheetPrice: 292.50 },
  { colour: "swiss grey", thicknessMm: 6,    sheetW: 3000, sheetH: 1500, ctsRate: 190.84, fullSheetPrice: 440.70 },
  { colour: "swiss grey", thicknessMm: 8,    sheetW: 2440, sheetH: 1220, ctsRate: 221.71, fullSheetPrice: 350.00 },
  { colour: "swiss grey", thicknessMm: 10,   sheetW: 2440, sheetH: 1220, ctsRate: 277.14, fullSheetPrice: 437.50 },
  { colour: "swiss grey", thicknessMm: 12,   sheetW: 2440, sheetH: 1220, ctsRate: 332.57, fullSheetPrice: 525.00 },
  { colour: "swiss grey", thicknessMm: 15,   sheetW: 2440, sheetH: 1220, ctsRate: 415.71, fullSheetPrice: 656.25 },
  { colour: "swiss grey", thicknessMm: 20,   sheetW: 2440, sheetH: 1220, ctsRate: 503.90, fullSheetPrice: 850.00 },
  { colour: "swiss grey", thicknessMm: 25,   sheetW: 2440, sheetH: 1220, ctsRate: 629.87, fullSheetPrice: 1062.50 },
  // Simona — Dark Grey thick slabs (2000×1000 — full sheet only)
  { colour: "dark grey",  thicknessMm: 30,   sheetW: 2000, sheetH: 1000, ctsRate: null,   fullSheetPrice: 1104.00 },
  { colour: "dark grey",  thicknessMm: 40,   sheetW: 2000, sheetH: 1000, ctsRate: null,   fullSheetPrice: 1572.80 },
  { colour: "dark grey",  thicknessMm: 50,   sheetW: 2000, sheetH: 1000, ctsRate: null,   fullSheetPrice: 2177.60 },
  // Simona — White (2440×1220)
  { colour: "white",      thicknessMm: 3,    sheetW: 2440, sheetH: 1220, ctsRate: 114.89, fullSheetPrice: 175.50 },
  { colour: "white",      thicknessMm: 4.5,  sheetW: 2440, sheetH: 1220, ctsRate: 172.33, fullSheetPrice: 263.25 },
  { colour: "white",      thicknessMm: 6,    sheetW: 2440, sheetH: 1220, ctsRate: 229.78, fullSheetPrice: 351.00 },
  { colour: "white",      thicknessMm: 10,   sheetW: 2440, sheetH: 1220, ctsRate: 280.47, fullSheetPrice: 442.75 },
  // Simona — Clear (2440×1220)
  { colour: "clear",      thicknessMm: 6,    sheetW: 2440, sheetH: 1220, ctsRate: 299.99, fullSheetPrice: 458.25 },
];

const PVC_RODS: RodRow[] = [
  // Sold in 2m lengths; < 25mm: full length only
  { diameterMm: 10, colour: "grey", standardLengthM: 2, fullLengthPrice: 11.10,  ctsRatePerM: null },
  { diameterMm: 12, colour: "grey", standardLengthM: 2, fullLengthPrice: 18.50,  ctsRatePerM: null },
  { diameterMm: 15, colour: "grey", standardLengthM: 2, fullLengthPrice: 18.50,  ctsRatePerM: null },
  { diameterMm: 20, colour: "grey", standardLengthM: 2, fullLengthPrice: 29.60,  ctsRatePerM: null },
  { diameterMm: 25, colour: "grey", standardLengthM: 2, fullLengthPrice: 33.30,  ctsRatePerM: 27.00 },
  { diameterMm: 30, colour: "grey", standardLengthM: 2, fullLengthPrice: 40.70,  ctsRatePerM: 33.00 },
  { diameterMm: 35, colour: "grey", standardLengthM: 2, fullLengthPrice: 51.80,  ctsRatePerM: 42.00 },
  { diameterMm: 40, colour: "grey", standardLengthM: 2, fullLengthPrice: 66.60,  ctsRatePerM: 54.00 },
  { diameterMm: 45, colour: "grey", standardLengthM: 2, fullLengthPrice: 88.80,  ctsRatePerM: 72.00 },
  { diameterMm: 50, colour: "grey", standardLengthM: 2, fullLengthPrice: 122.10, ctsRatePerM: 99.00 },
  { diameterMm: 60, colour: "grey", standardLengthM: 2, fullLengthPrice: 166.50, ctsRatePerM: 135.00 },
];

const PTFE_RODS: RodRow[] = [
  { diameterMm: 6,   colour: "natural", standardLengthM: 1, fullLengthPrice: 6.25,    ctsRatePerM: null },
  { diameterMm: 8,   colour: "natural", standardLengthM: 1, fullLengthPrice: 12.50,   ctsRatePerM: null },
  { diameterMm: 10,  colour: "natural", standardLengthM: 1, fullLengthPrice: 15.33,   ctsRatePerM: null },
  { diameterMm: 12,  colour: "natural", standardLengthM: 1, fullLengthPrice: 22.15,   ctsRatePerM: null },
  { diameterMm: 15,  colour: "natural", standardLengthM: 1, fullLengthPrice: 25.15,   ctsRatePerM: null },
  { diameterMm: 20,  colour: "natural", standardLengthM: 1, fullLengthPrice: 42.62,   ctsRatePerM: null },
  { diameterMm: 25,  colour: "natural", standardLengthM: 1, fullLengthPrice: 63.92,   ctsRatePerM: 127.84 },
  { diameterMm: 30,  colour: "natural", standardLengthM: 1, fullLengthPrice: 95.89,   ctsRatePerM: 191.77 },
  { diameterMm: 40,  colour: "natural", standardLengthM: 1, fullLengthPrice: 170.46,  ctsRatePerM: 340.92 },
  { diameterMm: 50,  colour: "natural", standardLengthM: 1, fullLengthPrice: 266.35,  ctsRatePerM: 532.69 },
  { diameterMm: 60,  colour: "natural", standardLengthM: 1, fullLengthPrice: 378.22,  ctsRatePerM: 756.43 },
  { diameterMm: 70,  colour: "natural", standardLengthM: 1, fullLengthPrice: 516.71,  ctsRatePerM: 1033.42 },
  { diameterMm: 80,  colour: "natural", standardLengthM: 1, fullLengthPrice: 676.51,  ctsRatePerM: 1353.02 },
  { diameterMm: 90,  colour: "natural", standardLengthM: 1, fullLengthPrice: 857.63,  ctsRatePerM: 1715.26 },
  { diameterMm: 100, colour: "natural", standardLengthM: 1, fullLengthPrice: 1060.06, ctsRatePerM: 2120.11 },
  { diameterMm: 150, colour: "natural", standardLengthM: 1, fullLengthPrice: 2163.80, ctsRatePerM: 4327.60 },
  { diameterMm: 200, colour: "natural", standardLengthM: 1, fullLengthPrice: 3847.09, ctsRatePerM: 7694.17 },
];

const ACRYLIC_RODS: RodRow[] = [
  // < 16mm: full length only (1.83m standard)
  { diameterMm: 3,  colour: "clear", standardLengthM: 1.83, fullLengthPrice: 3.84,   ctsRatePerM: null },
  { diameterMm: 5,  colour: "clear", standardLengthM: 1.83, fullLengthPrice: 6.52,   ctsRatePerM: null },
  { diameterMm: 6,  colour: "clear", standardLengthM: 1.83, fullLengthPrice: 23.79,  ctsRatePerM: null },
  { diameterMm: 8,  colour: "clear", standardLengthM: 1.83, fullLengthPrice: 34.04,  ctsRatePerM: null },
  { diameterMm: 10, colour: "clear", standardLengthM: 1.83, fullLengthPrice: 52.34,  ctsRatePerM: null },
  { diameterMm: 12, colour: "clear", standardLengthM: 1.83, fullLengthPrice: 55.52,  ctsRatePerM: null },
  { diameterMm: 15, colour: "clear", standardLengthM: 1.83, fullLengthPrice: 110.53, ctsRatePerM: null },
  // ≥ 16mm: CTS available
  { diameterMm: 16, colour: "clear", standardLengthM: 1.83, fullLengthPrice: 100.47, ctsRatePerM: 101.57 },
  { diameterMm: 20, colour: "clear", standardLengthM: 1.83, fullLengthPrice: 194.35, ctsRatePerM: 196.47 },
  { diameterMm: 25, colour: "clear", standardLengthM: 1.83, fullLengthPrice: 301.95, ctsRatePerM: 305.25 },
  { diameterMm: 30, colour: "clear", standardLengthM: 1.83, fullLengthPrice: 426.76, ctsRatePerM: 431.42 },
];

const PEEK_RODS: RodRow[] = [
  { diameterMm: 10, colour: "natural", standardLengthM: 1, fullLengthPrice: 64.57,   ctsRatePerM: 64.57 },
  { diameterMm: 12, colour: "natural", standardLengthM: 1, fullLengthPrice: 88.05,   ctsRatePerM: 88.05 },
  { diameterMm: 16, colour: "natural", standardLengthM: 1, fullLengthPrice: 139.72,  ctsRatePerM: 139.72 },
  { diameterMm: 20, colour: "natural", standardLengthM: 1, fullLengthPrice: 218.50,  ctsRatePerM: 218.50 },
  { diameterMm: 25, colour: "natural", standardLengthM: 1, fullLengthPrice: 341.45,  ctsRatePerM: 341.45 },
  { diameterMm: 30, colour: "natural", standardLengthM: 1, fullLengthPrice: 491.86,  ctsRatePerM: 491.86 },
  { diameterMm: 35, colour: "natural", standardLengthM: 1, fullLengthPrice: 668.17,  ctsRatePerM: 668.17 },
  { diameterMm: 40, colour: "natural", standardLengthM: 1, fullLengthPrice: 874.46,  ctsRatePerM: 874.46 },
  { diameterMm: 50, colour: "natural", standardLengthM: 1, fullLengthPrice: 1218.61, ctsRatePerM: 1218.61 },
];

// ── Tube Data ──────────────────────────────────────────────────────────────────

const TUBES: TubeRow[] = [
  // Opal acrylic round tubes — 2m lengths
  { od: 20,  id: 16,  shape: "round",  material: "acrylic_opal", lengthM: 2, pricePerLength: 26.47 },
  { od: 25,  id: 21,  shape: "round",  material: "acrylic_opal", lengthM: 2, pricePerLength: 33.48 },
  { od: 30,  id: 26,  shape: "round",  material: "acrylic_opal", lengthM: 2, pricePerLength: 40.77 },
  { od: 40,  id: 36,  shape: "round",  material: "acrylic_opal", lengthM: 2, pricePerLength: 55.34 },
  { od: 50,  id: 46,  shape: "round",  material: "acrylic_opal", lengthM: 2, pricePerLength: 69.89 },
  { od: 60,  id: 56,  shape: "round",  material: "acrylic_opal", lengthM: 2, pricePerLength: 84.47 },
  { od: 70,  id: 66,  shape: "round",  material: "acrylic_opal", lengthM: 2, pricePerLength: 99.00 },
  { od: 80,  id: 76,  shape: "round",  material: "acrylic_opal", lengthM: 2, pricePerLength: 113.57 },
  { od: 90,  id: 86,  shape: "round",  material: "acrylic_opal", lengthM: 2, pricePerLength: 128.13 },
  { od: 100, id: 96,  shape: "round",  material: "acrylic_opal", lengthM: 2, pricePerLength: 144.46 },
  // Clear square acrylic tubes — 1.83m lengths
  { od: 9.5,  shape: "square", material: "acrylic_sq", lengthM: 1.83, pricePerLength: 21.78 },
  { od: 12.7, shape: "square", material: "acrylic_sq", lengthM: 1.83, pricePerLength: 27.72 },
  { od: 15.8, shape: "square", material: "acrylic_sq", lengthM: 1.83, pricePerLength: 36.63 },
  { od: 19.05,shape: "square", material: "acrylic_sq", lengthM: 1.83, pricePerLength: 95.44 },
  { od: 25.4, shape: "square", material: "acrylic_sq", lengthM: 1.83, pricePerLength: 81.18 },
  { od: 50.4, shape: "square", material: "acrylic_sq", lengthM: 1.83, pricePerLength: 264.33 },
  // Polycarbonate tubes — 2.44m lengths
  { od: 9.5,   id: 6.4,   shape: "round", material: "polycarbonate", lengthM: 2.44, pricePerLength: 34.94 },
  { od: 12.7,  id: 6.35,  shape: "round", material: "polycarbonate", lengthM: 2.44, pricePerLength: 54.84 },
  { od: 12.7,  id: 9.5,   shape: "round", material: "polycarbonate", lengthM: 2.44, pricePerLength: 50.45 },
  { od: 15.9,  id: 12.7,  shape: "round", material: "polycarbonate", lengthM: 2.44, pricePerLength: 63.26 },
  { od: 19.05, id: 15.8,  shape: "round", material: "polycarbonate", lengthM: 2.44, pricePerLength: 76.48 },
  { od: 25.4,  id: 19.05, shape: "round", material: "polycarbonate", lengthM: 2.44, pricePerLength: 200.16 },
  { od: 25.4,  id: 22.2,  shape: "round", material: "polycarbonate", lengthM: 2.44, pricePerLength: 189.18 },
  { od: 31.7,  id: 25.4,  shape: "round", material: "polycarbonate", lengthM: 2.44, pricePerLength: 217.40 },
  { od: 38,    id: 31.7,  shape: "round", material: "polycarbonate", lengthM: 2.44, pricePerLength: 291.75 },
  { od: 50.08, id: 44.45, shape: "round", material: "polycarbonate", lengthM: 2.44, pricePerLength: 397.49 },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function fits(pw: number, ph: number, sw: number, sh: number): boolean {
  return (pw <= sw && ph <= sh) || (ph <= sw && pw <= sh);
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmt(n: number): string {
  return `$${r2(n).toFixed(2)} Ex GST`;
}

function normMaterial(raw: string): string {
  const s = raw.toLowerCase().trim();
  if (s.includes("euomir") || s.includes("euromir")) return "euomir";
  if (s.includes("mirror") && s.includes("acrylic")) return "mirror_acrylic";
  if (s.includes("mirror")) return "mirror_acrylic";
  if (s.includes("seaboard")) return "seaboard";
  if (s.includes("playground")) return "playground_hdpe";
  if (s.includes("acrylic")) return "acrylic";
  if (s.includes("polycarbonate") || s === "pc") return "polycarbonate";
  if (s.includes("acetal") || s.includes("pom") || s.includes("delrin")) return "acetal";
  if (s.includes("uhmwpe") || s.includes("uhmw")) return "uhmwpe";
  if (s.includes("hdpe") || s.includes("polyethylene") || s.includes("cutting board")) return "hdpe";
  if (s.includes("polypropylene") || s === "pp") return "polypropylene";
  if (s.includes("petg")) return "petg";
  if (s.includes("hips")) return "hips";
  if (s.includes("ptfe") || s.includes("teflon")) return "ptfe";
  if (s.includes("nylon") || s.includes("polyamide")) return "nylon";
  if (s.includes("pvc")) return "pvc";
  if (s.includes("acp") || s.includes("acm") || s.includes("aluminium composite")) return "acp";
  if (s.includes("corflute") || s.includes("coreflute")) return "corflute";
  if (s.includes("prismatic") || s.includes("diffuser")) return "prismatic";
  if (s.includes("peek")) return "peek";
  return s;
}

function normColour(raw: string): string {
  const s = (raw ?? "").toLowerCase().trim();
  if (s.includes("opal satin") || s.includes("422s")) return "opal satin";
  if (s.includes("white satin") || s.includes("401s")) return "white satin";
  if (s.includes("black satin") || s.includes("502s")) return "black satin";
  if (s.includes("clear satin")) return "clear satin";
  if (s.includes("clear ar") || s.includes("ar2")) return "clear ar";
  if (s.includes("clear")) return "clear";
  if (s.includes("opal") || s.includes("433") || s.includes("445") || s.includes("422")) return "opal";
  if (s.includes("grey tint") || s.includes("gray tint")) return "grey tint";
  if (s.includes("marine green") || s.includes("304")) return "marine green tint";
  if (s.includes("tint") || s.includes("332") || s.includes("512")) return "tint";
  if (s.includes("fluoro") || s.includes("fluorescent")) return "fluoro";
  if (s.includes("rose pink")) return "rose pink";
  if (s.includes("rose gold")) return "rose gold";
  if (s.includes("night blue")) return "night blue";
  if (s.includes("sky blue")) return "sky blue";
  if (s.includes("white gloss")) return "white gloss";
  if (s.includes("white satin gloss")) return "white satin gloss";
  if (s.includes("black satin gloss")) return "black satin gloss";
  if (s.includes("white")) return "white";
  if (s.includes("black")) return "black";
  if (s.includes("silver")) return "silver";
  if (s.includes("gold")) return "gold";
  if (s.includes("grey") || s.includes("gray")) return "grey";
  if (s.includes("natural") || s === "") return "natural";
  if (s.includes("yellow")) return "yellow";
  if (s.includes("beige")) return "beige";
  if (s.includes("green")) return "green";
  if (s.includes("purple")) return "purple";
  if (s.includes("orange")) return "orange";
  if (s.includes("colour") || s.includes("color")) return "colour";
  // HDPE special: "white" means natural
  return s;
}

function oversizedColourPrice(row: OversizedRow, col: string): number | null {
  if (col === "clear" || col === "clear ar") return row.clear ?? null;
  if (col.includes("opal")) return row.opal ?? null;
  if (col === "white") return row.white ?? row.black_white ?? null;
  if (col === "black") return row.black ?? row.black_white ?? null;
  if (col === "grey tint") return row.grey_tint ?? null;
  if (col.includes("tint")) return row.tint ?? null;
  return null;
}

function notFound(url = ""): PriceResult {
  return { found: false, price: 0, priceFormatted: "", note: "not found", productUrl: url, bulkDiscountApplied: false, minimumFeeApplied: false };
}

function buildResult(unitPrice: number, qty: number, note: string, url: string): PriceResult {
  let total = unitPrice * qty;
  let bulkDiscount = false;
  if (qty >= BULK_QTY) {
    total *= (1 - BULK_RATE);
    bulkDiscount = true;
    note += ", 5% bulk discount applied";
  }
  let minFee = false;
  if (total < CUTTING_FEE) {
    // Minimum cutting fee: you pay at least $30 (not CTS + $30)
    total = CUTTING_FEE;
    minFee = true;
    note += ", $30 minimum cutting fee";
  }
  total = r2(total);
  return { found: true, price: total, priceFormatted: fmt(total), note, productUrl: url, bulkDiscountApplied: bulkDiscount, minimumFeeApplied: minFee };
}

// ── Sheet Pricing ──────────────────────────────────────────────────────────────

function calcStandardSheet(row: SheetRow, width: number, height: number): { unitPrice: number; note: string } | null {
  if (!fits(width, height, row.sheetW, row.sheetH)) return null; // doesn't fit
  if (!row.ctsRate) return { unitPrice: row.fullSheetPrice, note: "full sheet only" };
  // If dimensions exactly match the full sheet (either orientation) — no cutting, no fee
  const isFullSheet = (width === row.sheetW && height === row.sheetH) || (width === row.sheetH && height === row.sheetW);
  if (isFullSheet) return { unitPrice: row.fullSheetPrice, note: "full sheet" };
  const area = (width / 1000) * (height / 1000);
  const ctsPrice = r2(row.ctsRate * area);
  if (ctsPrice >= row.fullSheetPrice) {
    return { unitPrice: r2(row.fullSheetPrice + CUTTING_FEE), note: "full sheet + $30 cutting fee" };
  }
  return { unitPrice: ctsPrice, note: "cut to size" };
}

function priceWithOversized(
  stdRow: SheetRow, oversizedRows: OversizedRow[], col: string,
  width: number, height: number, qty: number, url: string
): PriceResult {
  // Try oversized sheets (smallest first)
  const options = oversizedRows
    .filter(o => o.thicknessMm === stdRow.thicknessMm)
    .sort((a, b) => a.sheetW * a.sheetH - b.sheetW * b.sheetH);

  for (const os of options) {
    if (!fits(width, height, os.sheetW, os.sheetH)) continue;
    const osPrice = oversizedColourPrice(os, col);
    if (osPrice === null) continue;
    // If dimensions exactly match the oversized sheet — no cutting, no fee
    const isFullSheet = (width === os.sheetW && height === os.sheetH) || (width === os.sheetH && height === os.sheetW);
    if (isFullSheet) return buildResult(osPrice, qty, "oversized full sheet", url);
    // Oversized variations carry a 20% CTS rate premium (matches WooCommerce oversized variation pricing)
    const area = (width / 1000) * (height / 1000);
    const ctsPrice = r2((stdRow.ctsRate ?? 0) * 1.2 * area);
    if (ctsPrice >= osPrice) {
      return buildResult(r2(osPrice + CUTTING_FEE), qty, "oversized sheet + $30 cutting fee", url);
    }
    return buildResult(ctsPrice, qty, "cut to size (oversized sheet)", url);
  }
  return { found: true, price: 0, priceFormatted: "", note: "piece too large for all available sheets — contact us", productUrl: url, bulkDiscountApplied: false, minimumFeeApplied: false };
}

function priceGenericSheet(sheets: SheetRow[], col: string, thickness: number, width: number, height: number, qty: number, url: string): PriceResult {
  // Exact colour match first, then fallback to "any"
  const row = sheets.find(r => r.thicknessMm === thickness && r.colour === col)
           ?? sheets.find(r => r.thicknessMm === thickness && r.colour === "any");
  if (!row) return notFound(url);
  const result = calcStandardSheet(row, width, height);
  if (!result) return { found: true, price: 0, priceFormatted: "", note: "piece too large for this sheet — contact us", productUrl: url, bulkDiscountApplied: false, minimumFeeApplied: false };
  return buildResult(result.unitPrice, qty, result.note, url);
}

function priceAcrylicSheet(col: string, thickness: number, width: number, height: number, qty: number): PriceResult {
  const url = getProductUrl("acrylic");
  const row = ACRYLIC.find(r => r.thicknessMm === thickness && r.colour === col);
  if (!row) return notFound(url);
  // Use fits() to check both orientations — piece fits standard sheet if either rotation works
  const std = calcStandardSheet(row, width, height);
  if (std) return buildResult(std.unitPrice, qty, std.note, url);
  return priceWithOversized(row, ACRYLIC_OVERSIZED, col, width, height, qty, url);
}

function pricePCSheet(col: string, thickness: number, width: number, height: number, qty: number): PriceResult {
  const url = getProductUrl("polycarbonate");
  const row = PC.find(r => r.thicknessMm === thickness && r.colour === col);
  if (!row) return notFound(url);
  if (!calcStandardSheet(row, width, height)) {
    return priceWithOversized(row, PC_OVERSIZED, col, width, height, qty, url);
  }
  const std = calcStandardSheet(row, width, height);
  if (std) return buildResult(std.unitPrice, qty, std.note, url);
  return priceWithOversized(row, PC_OVERSIZED, col, width, height, qty, url);
}

function priceAcetalSheet(col: string, thickness: number, width: number, height: number, qty: number): PriceResult {
  const url = getProductUrl("acetal");
  const SHEET_W = 2000, SHEET_H = 1000;
  const row = ACETAL.find(r => r.thicknessMm === thickness && r.colour === col);
  if (!row) return notFound(url);
  if (!fits(width, height, SHEET_W, SHEET_H)) {
    return { found: true, price: 0, priceFormatted: "", note: "piece exceeds 2000×1000mm acetal sheet — contact us", productUrl: url, bulkDiscountApplied: false, minimumFeeApplied: false };
  }
  const area = (width / 1000) * (height / 1000);
  let unitPrice: number;
  let note: string;
  if (area >= 2) {
    unitPrice = row.fullSheetPrice;
    note = "full sheet";
  } else if (area >= 1) {
    if (!row.ctsMid) {
      unitPrice = row.fullSheetPrice;
      note = "full sheet (no mid-range CTS for this thickness)";
    } else {
      const ctsPrice = r2(row.ctsMid * area);
      unitPrice = Math.min(ctsPrice, row.fullSheetPrice);
      note = unitPrice === row.fullSheetPrice ? "full sheet cap" : "cut to size";
    }
  } else {
    const ctsPrice = r2(row.ctsLow * area);
    unitPrice = Math.min(ctsPrice, row.fullSheetPrice);
    note = unitPrice === row.fullSheetPrice ? "full sheet cap" : "cut to size";
  }
  return buildResult(unitPrice, qty, note, url);
}

function pricePTFESheet(thickness: number, width: number, height: number, qty: number): PriceResult {
  const url = getProductUrl("ptfe");
  const SHEET_W = 1200, SHEET_H = 1200, FULL_AREA = 1.44;
  const row = PTFE_SHEETS.find(r => r.thicknessMm === thickness);
  if (!row) return notFound(url);
  if (!fits(width, height, SHEET_W, SHEET_H)) {
    return { found: true, price: 0, priceFormatted: "", note: "piece exceeds 1200×1200mm PTFE sheet — contact us", productUrl: url, bulkDiscountApplied: false, minimumFeeApplied: false };
  }
  const area = (width / 1000) * (height / 1000);
  let unitPrice: number;
  let note: string;
  if (area >= FULL_AREA) {
    unitPrice = row.fullSheetPrice;
    note = "full sheet";
  } else if (area >= 0.5) {
    const p = r2(row.ctsMid * area);
    unitPrice = Math.min(p, row.fullSheetPrice);
    note = unitPrice === row.fullSheetPrice ? "full sheet cap" : "cut to size";
  } else {
    const p = r2(row.ctsLow * area);
    unitPrice = Math.min(p, row.fullSheetPrice);
    note = unitPrice === row.fullSheetPrice ? "full sheet cap" : "cut to size";
  }
  return buildResult(unitPrice, qty, note, url);
}

function priceCorflute(col: string, thickness: number, qty: number): PriceResult {
  const url = getProductUrl("corflute");
  const row = CORFLUTE.find(r => r.thicknessMm === thickness && r.colour === col);
  if (!row) return notFound(url);
  const priceEach = qty >= 10 ? row.priceQty10 : row.priceEach;
  const total = r2(priceEach * qty);
  const note = qty >= 10 ? "10+ sheet price applied" : "per sheet price";
  // No min-order fee for corflute (full sheets, reasonable price)
  return { found: true, price: total, priceFormatted: fmt(total), note, productUrl: url, bulkDiscountApplied: qty >= 10, minimumFeeApplied: false };
}

// ── Rod Pricing ────────────────────────────────────────────────────────────────

function priceRod(rows: RodRow[], col: string, diameterMm: number, lengthMm: number, qty: number, url: string): PriceResult {
  const row = rows.find(r => r.diameterMm === diameterMm && (r.colour === col || r.colour === "any" || r.colour === "natural" || r.colour === "beige" || r.colour === "grey"))
           ?? rows.find(r => r.diameterMm === diameterMm);
  if (!row) return notFound(url);

  const requestedM = lengthMm / 1000;
  let unitPrice: number;
  let note: string;

  if (requestedM <= 0 || requestedM >= row.standardLengthM) {
    // Full standard length (or not specified — default to full)
    const lengths = requestedM > row.standardLengthM
      ? Math.ceil(requestedM / row.standardLengthM)
      : 1;
    unitPrice = r2(row.fullLengthPrice * lengths);
    note = lengths > 1 ? `${lengths} × ${row.standardLengthM}m lengths` : `${row.standardLengthM}m length`;
  } else if (row.ctsRatePerM) {
    unitPrice = r2(row.ctsRatePerM * requestedM);
    note = `${lengthMm}mm cut to size`;
  } else {
    // No CTS — sell full length
    unitPrice = row.fullLengthPrice;
    note = `full ${row.standardLengthM}m length (no CTS for this size)`;
  }

  return buildResult(unitPrice, qty, note, url);
}

// ── Tube Pricing ───────────────────────────────────────────────────────────────

function priceTube(mat: string, od: number, lengthMm: number, qty: number): PriceResult {
  const isAcrylicSq = mat === "acrylic" && od <= 51; // rough heuristic; square tubes have small ODs
  const tubeMat = mat === "polycarbonate" ? "polycarbonate"
    : mat === "acrylic" ? "acrylic_opal"
    : mat;

  const row = TUBES.find(r => r.material === tubeMat && r.od === od)
           ?? TUBES.find(r => r.material === "acrylic_sq" && r.od === od);
  if (!row) return notFound(mat === "polycarbonate" ? getProductUrl("polycarbonate tube") : getProductUrl("acrylic opal tube"));

  const url = row.material === "polycarbonate" ? getProductUrl("polycarbonate tube")
    : row.material === "acrylic_sq" ? getProductUrl("acrylic square tube")
    : getProductUrl("acrylic opal tube");

  // Tubes are full length only
  const lengths = lengthMm > 0 ? Math.ceil(lengthMm / (row.lengthM * 1000)) : 1;
  const unitPrice = r2(row.pricePerLength * lengths);
  const note = `${row.lengthM}m full length${lengths > 1 ? ` × ${lengths}` : ""}`;
  return buildResult(unitPrice, qty, note, url);

  void isAcrylicSq; // suppress unused warning
}

// ── Main Export ────────────────────────────────────────────────────────────────

export function getPricing(input: PricingInput): PriceResult {
  const mat   = normMaterial(input.material ?? "");
  const col   = normColour(input.colour ?? "");
  const thick = input.thicknessMm ?? 0;
  const w     = input.widthMm ?? 0;
  const h     = input.heightMm ?? 0;
  const diam  = input.diameterMm ?? 0;
  const len   = input.lengthMm ?? 0;
  const qty   = Math.max(1, Math.floor(input.quantity ?? 1));

  // HDPE: "white" → "natural"
  const hdpeCol = col === "white" ? "natural" : col;

  if (input.type === "sheet") {
    switch (mat) {
      case "acrylic":         return priceAcrylicSheet(col, thick, w, h, qty);
      case "polycarbonate":   return pricePCSheet(col, thick, w, h, qty);
      case "acetal":          return priceAcetalSheet(col, thick, w, h, qty);
      case "ptfe":            return pricePTFESheet(thick, w, h, qty);
      case "corflute":        return priceCorflute(col, thick, qty);
      case "uhmwpe":          return priceGenericSheet(UHMWPE, col, thick, w, h, qty, getProductUrl("uhmwpe"));
      case "polypropylene":   return priceGenericSheet(POLYPROPYLENE, col, thick, w, h, qty, getProductUrl("polypropylene"));
      case "hdpe":            return priceGenericSheet(HDPE, hdpeCol, thick, w, h, qty, getProductUrl("hdpe"));
      case "seaboard":        return priceGenericSheet(SEABOARD, col, thick, w, h, qty, getProductUrl("seaboard"));
      case "petg":            return priceGenericSheet(PETG, "clear", thick, w, h, qty, getProductUrl("petg"));
      case "hips":            return priceGenericSheet(HIPS, col, thick, w, h, qty, getProductUrl("hips"));
      case "mirror_acrylic":  return priceGenericSheet(MIRROR_ACRYLIC, col, thick, w, h, qty, getProductUrl("acrylic mirror"));
      case "euomir":          return priceGenericSheet(EUOMIR, col, thick, w, h, qty, getProductUrl("euromir"));
      case "acp":             return priceGenericSheet(ACP, col, thick, w, h, qty, getProductUrl("acp"));
      case "prismatic":       return priceGenericSheet(PRISMATIC, "clear", thick, w, h, qty, getProductUrl("acrylic"));
      case "peek":            return priceGenericSheet(PEEK_SHEETS, "natural", thick, w, h, qty, getProductUrl("peek"));
      case "pvc":             return priceGenericSheet(RIGID_PVC, col, thick, w, h, qty, getProductUrl("rigid pvc"));
      default:                return notFound();
    }
  }

  if (input.type === "rod") {
    switch (mat) {
      case "acetal":        return priceRod(ACETAL_RODS, col, diam, len, qty, getProductUrl("acetal rod"));
      case "uhmwpe":        return priceRod(UHMWPE_RODS, "natural", diam, len, qty, getProductUrl("uhmwpe rod"));
      case "nylon":         return priceRod(NYLON_RODS, "natural", diam, len, qty, getProductUrl("nylon rod"));
      case "hdpe":          return priceRod(HDPE_RODS, hdpeCol, diam, len, qty, getProductUrl("hdpe rod"));
      case "polypropylene": return priceRod(PP_RODS, "beige", diam, len, qty, getProductUrl("pp rod"));
      case "pvc":           return priceRod(PVC_RODS, "grey", diam, len, qty, getProductUrl("pvc rod"));
      case "ptfe":          return priceRod(PTFE_RODS, "natural", diam, len, qty, getProductUrl("ptfe rod"));
      case "acrylic":       return priceRod(ACRYLIC_RODS, "clear", diam, len, qty, getProductUrl("acrylic rod"));
      case "peek":          return priceRod(PEEK_RODS, "natural", diam, len, qty, getProductUrl("peek rod"));
      default:              return notFound();
    }
  }

  if (input.type === "tube") {
    return priceTube(mat, diam, len, qty);
  }

  return notFound();
}
