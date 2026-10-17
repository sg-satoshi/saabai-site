export type Status = "pass" | "partial" | "fail" | "unknown";
export type Area = "seo" | "ai" | "local";
export type Rating = "critical" | "important" | "nice";
export type OfferId = "build" | "chatbot" | "reviews" | "blueprint";

export type Input = { name?: string; industry?: string; suburb?: string; goal?: string; gbp?: { rating?: number; reviews?: number; newestDaysAgo?: number } };

export type Snapshot = {
  input: Input;
  finalUrl: string;
  host: string;
  home: { status: number; html: string; ms: number; bytes: number } | null;
  httpsOk: boolean | null;
  httpRedirects: boolean | null;
  robots: string | null; // null = not found
  robotsBlocksUs: boolean;
  sitemap: boolean | null;
  llms: { found: boolean; empty: boolean } | null;
  extra: string; // html of up to 2 linked pages (about/contact)
  jsHeavy: boolean;
};

export type CheckResult = { status: Status; found: string };
export type CheckDef = { id: string; area: Area; weight: number; label: string; run: (s: Snapshot) => CheckResult };

export type Fix = {
  id: string; label: string; area: Area; status: Exclude<Status, "pass" | "unknown">; rating: Rating; quickWin: boolean;
  found: string; meaning: string; fix: string; time: string; offer: OfferId; pointsLost: number;
};

export type ScanReport = {
  id: string; domain: string; url: string; scannedAt: string; mode: "scan" | "no_website" | "blocked";
  overall: number | null; areas: Record<Area, number | null>;
  checksUsed: number; checksTotal: number;
  fixes: Fix[]; quickWins: Fix[]; unverified: { id: string; label: string; why: string }[];
  passed: { id: string; label: string }[];
  offer: OfferId; offerReason: string; message?: string;
  input: Input;
};
