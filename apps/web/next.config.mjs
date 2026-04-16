import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@palnet/shared", "@palnet/ui-tokens"],
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.palnet.ps" },
      { protocol: "https", hostname: "*.r2.dev" },
    ],
  },
};

export default withNextIntl(nextConfig);
