import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/saabai-admin", "/admin", "/dashboard"],
    },
    sitemap: "https://www.saabai.ai/sitemap.xml",
  };
}
