import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mammoth", "pdf-parse"],
  // Members-only Wholesale files live outside public/ and are read from disk
  // by this route, so make sure they're bundled with it.
  outputFileTracingIncludes: {
    "/api/wholesale-files/[file]": ["./private/wholesale-homes/**/*"],
  },
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return ["/saabai-admin", "/saabai-admin/:path*", "/admin/:path*", "/login", "/login/:path*", "/dashboard/:path*", "/dashboard", "/client-portal"].map(
      (source) => ({ source, headers: noindex })
    );
  },
  async redirects() {
    return [
      { source: "/counsel", destination: "/for-law-firms", permanent: true },
      // Saabai Blueprint replaces the old audit offers
      { source: "/audit", destination: "/blueprint", permanent: true },
      { source: "/ai-audit", destination: "/blueprint", permanent: true },
      { source: "/ai-audit/:path*", destination: "/blueprint", permanent: true },
      { source: "/offers", destination: "/blueprint", permanent: true },
    ];
  },
  async rewrites() {
    return [
      // Tributum Law (Mathew): friendly URL for the Site Factory site "tributum-law".
      { source: "/sites/tributumlaw", destination: "/sites/tributum-law" },
      { source: "/sites/tributumlaw/:path*", destination: "/sites/tributum-law/:path*" },
      { source: "/clients/lmm-site", destination: "/clients/lmm-site/index.html" },
    ];
  },
};

export default nextConfig;
