import { createRequire } from "node:module";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";

import createNextIntlPlugin from "next-intl/plugin";

import { buildContentSecurityPolicy, buildSecurityHeaders } from "./src/lib/security-headers.mjs";

const require = createRequire(import.meta.url);
const here = fileURLToPath(new URL(".", import.meta.url));

/**
 * A project-relative `./…` path for Turbopack's resolveAlias.
 *
 * An absolute path is not portable here: on Linux it starts with `/`, which
 * Turbopack reads as *server-relative* and then fails to find —
 * `Can't resolve './home/runner/work/…'`. It only worked locally because a
 * Windows path starts with `C:\`.
 */
const projectRelative = (specifier) =>
  `./${relative(here, require.resolve(specifier)).split("\\").join("/")}`;

const withNextIntl = createNextIntlPlugin("./src/i18n.ts");

export { buildContentSecurityPolicy, buildSecurityHeaders };

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@baydar/shared", "@baydar/ui-tokens", "@baydar/ui-web"],
  turbopack: {
    // One React Query module, not two.
    //
    // `@baydar/shared/react` is transpiled from source, and Turbopack resolved
    // its `@tanstack/react-query` import into a second module instance — with
    // its own React context. `QueryClientProvider` set a client on one
    // instance and the shared hooks read from the other, so every page using
    // them died server-side with "No QueryClient set, use QueryClientProvider
    // to set one" while pages importing react-query directly were fine.
    // Webpack deduped this on Next 15; Turbopack does not.
    resolveAlias: {
      "@tanstack/react-query": projectRelative("@tanstack/react-query"),
    },
  },
  typedRoutes: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.baydar.ps" },
      { protocol: "https", hostname: "*.r2.dev" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:locale(ar-PS|ar|en)/terms",
        destination: "/:locale/legal/tos",
        permanent: true,
      },
      {
        source: "/:locale(ar-PS|ar|en)/privacy",
        destination: "/:locale/legal/privacy",
        permanent: true,
      },
      {
        source: "/:locale(ar-PS|ar|en)/community-guidelines",
        destination: "/:locale/legal/community",
        permanent: true,
      },
    ];
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
