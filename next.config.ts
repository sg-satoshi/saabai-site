import type { NextConfig } from "next";

// City-page redirects are for saabai.ai only; client sites on their own domains must not inherit them.
const CLIENT_HOST = [{ type: "host" as const, value: "(www\\.)?(stuscyclerepairs\\.com|boconsulting\\.com\\.au|wholesalehomes\\.com\\.au|lifestylemoneymanagement\\.com\\.au|tributumlaw\\.com)" }];

// Lex routes that run the open-source name model.
const LEX_NER_ROUTES = ["/api/lex-chat", "/api/lex-research", "/api/lex-draft", "/api/lex-review", "/api/lex-compare", "/api/lex-extract", "/api/lex-threads", "/api/lex-settings", "/api/lex-ner-health"];

const nextConfig: NextConfig = {
  serverExternalPackages: ["mammoth", "pdf-parse", "@huggingface/transformers", "onnxruntime-node", "sharp"],
  // Members-only Wholesale files live outside public/ and are read from disk
  // by this route, so make sure they're bundled with it.
  outputFileTracingIncludes: {
    "/api/wholesale-files/[file]": ["./private/wholesale-homes/**/*"],
    // Lex privacy name model (open source, runs inside these functions; fetched at build time).
    // The ONNX runtime loads libonnxruntime.so.1 natively, which file tracing cannot see.
    ...Object.fromEntries(LEX_NER_ROUTES.map((r) => [r, [
      "./models/**/*",
      "./node_modules/onnxruntime-node/bin/napi-v3/linux/x64/libonnxruntime.so.1",
      "./node_modules/onnxruntime-node/bin/napi-v3/linux/x64/libonnxruntime_providers_shared.so",
    ]])),
  },
  // The name model runs on CPU: keep GPU builds and the browser runtime out of the functions.
  outputFileTracingExcludes: Object.fromEntries(LEX_NER_ROUTES.map((r) => [r, [
    "./node_modules/onnxruntime-node/bin/**/libonnxruntime_providers_cuda.so",
    "./node_modules/onnxruntime-node/bin/**/libonnxruntime_providers_tensorrt.so",
    "./node_modules/onnxruntime-node/bin/napi-v3/linux/x64/libonnxruntime.so.1.21.0",
    "./node_modules/onnxruntime-node/bin/napi-v3/darwin/**",
    "./node_modules/onnxruntime-node/bin/napi-v3/win32/**",
    "./node_modules/onnxruntime-node/bin/napi-v3/linux/arm64/**",
    "./node_modules/onnxruntime-web/**",
    "./node_modules/@img/sharp-libvips-linuxmusl-x64/**",
    "./node_modules/@img/sharp-linuxmusl-x64/**",
  ]])),
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    const embed = [{ source: "/embed/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=300, s-maxage=300, stale-while-revalidate=86400" }] }];
    return embed.concat(["/saabai-admin", "/saabai-admin/:path*", "/admin/:path*", "/login", "/login/:path*", "/dashboard/:path*", "/dashboard", "/client-portal", "/forgot-password", "/insights", "/ai-news"].map(
      (source) => ({ source, headers: noindex })
    ));
  },
  async redirects() {
    return [
      // Bare apex only. The host check is anchored, so www and client domains do not match.
      // /api and /api/* stay on the apex (MCP clients and webhooks). Other paths 308 to www.
      {
        source: "/:path((?!api(?:/|$)).*)",
        has: [{ type: "host", value: "saabai.ai" }],
        destination: "https://www.saabai.ai/:path*",
        permanent: true,
      },
      { source: "/counsel", destination: "/blueprint", statusCode: 301 },
      // Retired Oct 2026: advisory + law/accounting pages -> Blueprint; non-QLD city pages -> /websites
      { source: "/advisory", destination: "/blueprint", statusCode: 301 },
      { source: "/advisory/:path*", destination: "/blueprint", statusCode: 301 },
      { source: "/for-law-firms", destination: "/blueprint", statusCode: 301 },
      { source: "/for-law-firms/:path*", destination: "/blueprint", statusCode: 301 },
      { source: "/for-accounting-firms", destination: "/blueprint", statusCode: 301 },
      { source: "/for-accounting-firms/:path*", destination: "/blueprint", statusCode: 301 },
      { source: "/sydney", destination: "/websites", statusCode: 301, missing: CLIENT_HOST },
      { source: "/melbourne", destination: "/websites", statusCode: 301, missing: CLIENT_HOST },
      { source: "/perth", destination: "/websites", statusCode: 301, missing: CLIENT_HOST },
      { source: "/adelaide", destination: "/websites", statusCode: 301, missing: CLIENT_HOST },
      { source: "/canberra", destination: "/websites", statusCode: 301, missing: CLIENT_HOST },
      { source: "/hobart", destination: "/websites", statusCode: 301, missing: CLIENT_HOST },
      { source: "/darwin", destination: "/websites", statusCode: 301, missing: CLIENT_HOST },
      { source: "/for-real-estate", destination: "/blueprint", statusCode: 301 },
      { source: "/for-real-estate/:path*", destination: "/blueprint", statusCode: 301 },
      { source: "/insights/law-firm-intake-automation", destination: "/blueprint", statusCode: 301 },
      { source: "/counsel-backup", destination: "/blueprint", statusCode: 301 },
      { source: "/counsel-backup/:path*", destination: "/blueprint", statusCode: 301 },
      // Saabai Blueprint replaces the old audit offers
      { source: "/audit", destination: "/blueprint", statusCode: 301 },
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
