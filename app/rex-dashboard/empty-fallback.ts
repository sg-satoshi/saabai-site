import type { RexStats } from "../../lib/rex-stats";

export function buildEmptyRexStats(): RexStats {
  return {
    total: 0,
    withEmail: 0,
    withPrice: 0,
    avgPrice: 0,
    totalQuotedRevenue: 0,
    emailHashes: [],
    leadNames: [],
    materials: {},
    despatch: {},
    sources: {},
    dailyCounts: buildEmptyDays(),
    dailyConvCounts: buildEmptyDays(),
    dailyEngagedCounts: buildEmptyDays(),
    convTotal: 0,
    recentLeads: [],
    trackingSince: null,
  };
}

function brisbaneDateString(offset: number): string {
  const d = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
  return new Date(d.getTime() + 10 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00+10:00");
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function buildEmptyDays() {
  return Array.from({ length: 30 }, (_, i) => {
    const date = brisbaneDateString(-(29 - i));
    return { date, label: formatDayLabel(date), count: 0 };
  });
}
