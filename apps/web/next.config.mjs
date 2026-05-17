import createNextIntlPlugin from "next-intl/plugin";

import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
} from "./src/lib/security-headers.mjs";

const withNextIntl = createNextIntlPlugin("./src/i18n.ts");

export { buildContentSecurityPolicy, buildSecurityHeaders };

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@baydar/shared", "@baydar/ui-tokens", "@baydar/ui-web"],
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.baydar.ps" },
      { protocol: "https", hostname: "*.r2.dev" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        // CSP is intentionally omitted here — the per-request middleware
        // (src/middleware.ts) is the single source of truth so each request
        // can carry a fresh `nonce`. Setting CSP here too would race with
        // the middleware header and the last-write-wins semantics in
        // Next.js can flip between deploys.
        headers: buildSecurityHeaders(process.env, { includeContentSecurityPolicy: false }),
      },
    ];
  },
};

export default withNextIntl(nextConfig);
