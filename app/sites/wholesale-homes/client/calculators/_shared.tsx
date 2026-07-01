// Shared building blocks for the Wholesale Homes client calculators.
// Consolidates the stamp-duty engine, AU state constants, number formatters,
// and the small presentational components that were previously copy-pasted
// across every calculator page.

// ── Australian states ─────────────────────────────────────────────────────────
export type State = "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT";

export const STATES: State[] = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

export const STATE_NAMES: Record<State, string> = {
  NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland",
  WA: "Western Australia", SA: "South Australia", TAS: "Tasmania",
  ACT: "ACT", NT: "Northern Territory",
};

export const STATE_COLORS: Record<State, string> = {
  NSW: "#0891b2", VIC: "#16a34a", QLD: "#f59e0b", WA: "#7c3aed",
  SA: "#dc2626", TAS: "#d4a84b", ACT: "#1A2B3C", NT: "#6b7280",
};

// ── Stamp duty ────────────────────────────────────────────────────────────────
// Progressive transfer-duty brackets per state. Investor/standard rates.
export function calcStampDuty(price: number, state: State): number {
  if (price <= 0) return 0;
  switch (state) {
    case "NSW": {
      if (price <= 16000) return price * 0.0125;
      if (price <= 35000) return 200 + (price - 16000) * 0.015;
      if (price <= 93000) return 485 + (price - 35000) * 0.0175;
      if (price <= 351000) return 1500 + (price - 93000) * 0.035;
      if (price <= 1168000) return 10530 + (price - 351000) * 0.045;
      return 47295 + (price - 1168000) * 0.055;
    }
    case "VIC": {
      if (price <= 25000) return price * 0.014;
      if (price <= 130000) return 350 + (price - 25000) * 0.024;
      if (price <= 960000) return 2870 + (price - 130000) * 0.05;
      if (price <= 2000000) return 44370 + (price - 960000) * 0.055;
      return 110000 + (price - 2000000) * 0.065;
    }
    case "QLD": {
      if (price <= 5000) return 0;
      if (price <= 75000) return (price - 5000) * 0.015;
      if (price <= 540000) return 1050 + (price - 75000) * 0.035;
      if (price <= 1000000) return 17325 + (price - 540000) * 0.045;
      return 38025 + (price - 1000000) * 0.0575;
    }
    case "WA": {
      let duty: number;
      if (price <= 120000) duty = price * 0.019;
      else if (price <= 150000) duty = 2280 + (price - 120000) * 0.0285;
      else if (price <= 360000) duty = 3135 + (price - 150000) * 0.038;
      else if (price <= 725000) duty = 11115 + (price - 360000) * 0.0475;
      else duty = 28453 + (price - 725000) * 0.0515;
      return duty;
    }
    case "SA": {
      if (price <= 12000) return price * 0.01;
      if (price <= 30000) return 120 + (price - 12000) * 0.02;
      if (price <= 50000) return 480 + (price - 30000) * 0.03;
      if (price <= 100000) return 1080 + (price - 50000) * 0.035;
      if (price <= 200000) return 2830 + (price - 100000) * 0.04;
      if (price <= 250000) return 6830 + (price - 200000) * 0.0425;
      if (price <= 300000) return 8955 + (price - 250000) * 0.0475;
      if (price <= 500000) return 11330 + (price - 300000) * 0.05;
      return 21330 + (price - 500000) * 0.055;
    }
    case "TAS": {
      if (price <= 3000) return 50;
      if (price <= 25000) return 50 + (price - 3000) * 0.0175;
      if (price <= 75000) return 435 + (price - 25000) * 0.0225;
      if (price <= 200000) return 1560 + (price - 75000) * 0.035;
      if (price <= 375000) return 5935 + (price - 200000) * 0.04;
      if (price <= 725000) return 12935 + (price - 375000) * 0.0425;
      return 27810 + (price - 725000) * 0.045;
    }
    case "ACT": {
      if (price <= 260000) return price * 0.0028;
      if (price <= 300000) return 728 + (price - 260000) * 0.022;
      if (price <= 500000) return 1608 + (price - 300000) * 0.034;
      if (price <= 750000) return 8408 + (price - 500000) * 0.0432;
      if (price <= 1000000) return 19208 + (price - 750000) * 0.059;
      if (price <= 1455000) return 33958 + (price - 1000000) * 0.064;
      return price * 0.0454;
    }
    case "NT": {
      if (price <= 525000) { const V = price / 1000; return 0.06571441 * V * V + 15 * V; }
      if (price <= 3000000) return price * 0.0495;
      if (price <= 5000000) return price * 0.0575;
      return price * 0.0595;
    }
  }
}

// ── Number formatters ─────────────────────────────────────────────────────────
/** Whole-dollar number with AU thousands separators, e.g. 729000 -> "729,000". */
export function fmtNum(n: number): string {
  return Math.round(n).toLocaleString("en-AU");
}
/** Currency, e.g. 729000 -> "$729,000". */
export function fmtAUD(n: number): string {
  return "$" + fmtNum(n);
}
/** Compact axis label, e.g. 1_250_000 -> "1.3M", 12_500 -> "12.5K". */
export function fmtCompact(n: number): string {
  return n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : fmtNum(n);
}

// ── Math helper ───────────────────────────────────────────────────────────────
/** Division guarded against zero / non-finite / non-positive numerators. */
export function safeDiv(a: number, b: number): number {
  return b === 0 || !isFinite(b) || a <= 0 ? 0 : a / b;
}

// ── Presentational components ─────────────────────────────────────────────────
export function MetricMini({ label, val, color, sub }: { label: string; val: string; color: string; sub: string }) {
  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-[8px] font-semibold uppercase tracking-wider text-[#5C6670] truncate">{label}</p>
      <p className="mt-0.5 text-sm font-bold" style={{ color }}>{val}</p>
      <p className="text-[8px] text-[#9CA3AF] truncate">{sub}</p>
    </div>
  );
}

export function Row({ label, val, color, bold }: { label: string; val: string; color?: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-xs ${bold ? "font-semibold text-[#1A2B3C]" : "text-[#5C6670]"}`}>{label}</span>
      <span className={`text-xs ${bold ? "font-semibold" : ""}`} style={{ color: color ?? "#1A2B3C" }}>{val}</span>
    </div>
  );
}
