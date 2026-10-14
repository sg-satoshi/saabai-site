import type { MetadataRoute } from "next";
import { ALL_LOCATIONS } from "../lib/location-data";

const BASE_URL = "https://www.saabai.ai";

type Freq = MetadataRoute.Sitemap[number]["changeFrequency"];

const PAGES: Array<{ path: string; priority: number; changeFrequency: Freq; updated: string }> = [
  { path: "", updated: "2026-10-14", priority: 1, changeFrequency: "weekly" },
  { path: "/blueprint", updated: "2026-10-14", priority: 0.95, changeFrequency: "monthly" },
  { path: "/websites", updated: "2026-10-14", priority: 0.95, changeFrequency: "monthly" },
  { path: "/score", updated: "2026-10-14", priority: 0.9, changeFrequency: "monthly" },
  { path: "/services", updated: "2026-10-13", priority: 0.9, changeFrequency: "monthly" },
  { path: "/use-cases", updated: "2026-05-15", priority: 0.9, changeFrequency: "monthly" },
  { path: "/case-studies", updated: "2026-10-14", priority: 0.9, changeFrequency: "monthly" },
  { path: "/case-studies/rex-plastics-online", updated: "2026-10-13", priority: 0.8, changeFrequency: "monthly" },
  { path: "/for-real-estate", updated: "2026-10-14", priority: 0.9, changeFrequency: "monthly" },
  { path: "/process", updated: "2026-10-13", priority: 0.8, changeFrequency: "monthly" },
  { path: "/calculator", updated: "2026-05-15", priority: 0.8, changeFrequency: "monthly" },
  { path: "/faq", updated: "2026-10-13", priority: 0.8, changeFrequency: "monthly" },
  { path: "/insights", updated: "2026-10-14", priority: 0.8, changeFrequency: "weekly" },
  { path: "/insights/law-firm-intake-automation", updated: "2026-10-14", priority: 0.8, changeFrequency: "monthly" },
  { path: "/legal", updated: "2026-05-15", priority: 0.7, changeFrequency: "monthly" },
  { path: "/about", updated: "2026-10-14", priority: 0.7, changeFrequency: "monthly" },
  { path: "/privacy", updated: "2026-10-14", priority: 0.3, changeFrequency: "yearly" },
  { path: "/ai-news", updated: "2026-05-15", priority: 0.5, changeFrequency: "daily" },
];

export default function sitemap(): MetadataRoute.Sitemap {
// Update `updated` when a page's content meaningfully changes.
  const CITY_UPDATED = new Date("2026-10-13");
  const pages = PAGES.map((p) => ({
    url: `${BASE_URL}${p.path}`,
    lastModified: new Date(p.updated),
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
  const cities = ALL_LOCATIONS.map((loc) => ({
    url: `${BASE_URL}/${loc.slug}`,
    lastModified: CITY_UPDATED,
    changeFrequency: "monthly" as Freq,
    priority: loc.slug === "gold-coast" ? 0.9 : 0.8,
  }));
  return [...pages, ...cities];
}
