import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mammoth", "pdf-parse"],
  async redirects() {
    return [
      { source: "/counsel", destination: "/for-law-firms", permanent: true },
    ];
  },
};

export default nextConfig;
