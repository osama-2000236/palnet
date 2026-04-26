import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@baydar/shared", "@baydar/ui-tokens"],
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.baydar.ps" },
      { protocol: "https", hostname: "*.r2.dev" },
    ],
  },
};

export default withNextIntl(nextConfig);
