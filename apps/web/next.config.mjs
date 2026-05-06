import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n.ts");

const STATIC_R2_ORIGINS = ["https://media.baydar.ps", "https://*.r2.dev"];
const SENTRY_ORIGINS = ["https://*.ingest.sentry.io", "https://*.sentry.io"];
const DEFAULT_POSTHOG_ORIGINS = ["https://us.i.posthog.com", "https://us-assets.i.posthog.com"];

export function buildSecurityHeaders(env = process.env) {
  const production = env.NODE_ENV === "production";
  const apiOrigin = originFrom(env.NEXT_PUBLIC_API_URL);
  const r2Origin = originFrom(env.NEXT_PUBLIC_R2_PUBLIC_URL ?? env.R2_PUBLIC_URL);
  const posthogOrigin = originFrom(env.NEXT_PUBLIC_POSTHOG_HOST);
  const connectOrigins = unique([
    "'self'",
    apiOrigin,
    posthogOrigin,
    ...DEFAULT_POSTHOG_ORIGINS,
    ...SENTRY_ORIGINS,
    r2Origin,
    ...STATIC_R2_ORIGINS,
  ]);
  const mediaOrigins = unique(["'self'", "blob:", r2Origin, ...STATIC_R2_ORIGINS]);
  const imageOrigins = unique(["'self'", "data:", "blob:", r2Origin, ...STATIC_R2_ORIGINS]);
  const scriptOrigins = unique(["'self'", posthogOrigin, "https://us-assets.i.posthog.com"]);
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    `script-src ${scriptOrigins.join(" ")}`,
    "style-src 'self'",
    `img-src ${imageOrigins.join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${connectOrigins.join(" ")}`,
    `media-src ${mediaOrigins.join(" ")}`,
    "frame-src 'none'",
    "form-action 'self'",
    production ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; ");

  const headers = [
    {
      key: production ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only",
      value: csp,
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
    { key: "X-Frame-Options", value: "DENY" },
  ];

  if (production) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}

function originFrom(value) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

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
        headers: buildSecurityHeaders(),
      },
    ];
  },
};

export default withNextIntl(nextConfig);
