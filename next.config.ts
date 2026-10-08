import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mammoth", "pdf-parse"],
  // Members-only Wholesale files live outside public/ and are read from disk
  // by this route, so make sure they're bundled with it.
  outputFileTracingIncludes: {
    "/api/wholesale-files/[file]": ["./private/wholesale-homes/**/*"],
  },
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
