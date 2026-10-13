import type { MetadataRoute } from "next";
import { ALL_LOCATIONS } from "../lib/location-data";

const BASE_URL = "https://www.saabai.ai";

type Freq = MetadataRoute.Sitemap[number]["changeFrequency"];

const PAGES: Array<{ path: string; priority: number; changeFrequency: Freq }> = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/blueprint", priority: 0.95, changeFrequency: "monthly" },
  { path: "/websites", priority: 0.95, changeFrequency: "monthly" },
  { path: "/score", priority: 0.9, changeFrequency: "monthly" },
  { path: "/services", priority: 0.9, changeFrequency: "monthly" },
  { path: "/use-cases", priority: 0.9, changeFrequency: "monthly" },
  { path: "/case-studies", priority: 0.9, changeFrequency: "monthly" },
  { path: "/case-studies/rex-plastics-online", priority: 0.8, changeFrequency: "monthly" },
  { path: "/for-law-firms", priority: 0.9, changeFrequency: "monthly" },
  { path: "/for-accounting-firms", priority: 0.9, changeFrequency: "monthly" },
  { path: "/for-real-estate", priority: 0.9, changeFrequency: "monthly" },
  { path: "/process", priority: 0.8, changeFrequency: "monthly" },
  { path: "/calculator", priority: 0.8, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.8, changeFrequency: "monthly" },
  { path: "/insights", priority: 0.8, changeFrequency: "weekly" },
  { path: "/insights/law-firm-intake-automation", priority: 0.8, changeFrequency: "monthly" },
  { path: "/legal", priority: 0.7, changeFrequency: "monthly" },
  { path: "/advisory", priority: 0.6, changeFrequency: "monthly" },
  { path: "/about", priority: 0.7, changeFrequency: "monthly" },
  { path: "/ai-news", priority: 0.5, changeFrequency: "daily" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const pages = PAGES.map((p) => ({
    url: `${BASE_URL}${p.path}`,
    lastModified,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
  const cities = ALL_LOCATIONS.map((loc) => ({
    url: `${BASE_URL}/${loc.slug}`,
    lastModified,
    changeFrequency: "monthly" as Freq,
    priority: loc.slug === "gold-coast" ? 0.9 : 0.8,
  }));
  return [...pages, ...cities];
}
