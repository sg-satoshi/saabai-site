import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mammoth", "pdf-parse"],
  async redirects() {
    return [
      { source: "/counsel", destination: "/for-law-firms", permanent: true },
    ];
  },
  async rewrites() {
    return [
      { source: "/clients/lmm-site", destination: "/clients/lmm-site/index.html" },
    ];
  },
};

export default nextConfig;
