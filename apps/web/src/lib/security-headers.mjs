const STATIC_R2_ORIGINS = ["https://media.baydar.ps", "https://*.r2.dev"];
const SENTRY_ORIGINS = ["https://*.ingest.sentry.io", "https://*.sentry.io"];
const DEFAULT_POSTHOG_ORIGINS = ["https://us.i.posthog.com", "https://us-assets.i.posthog.com"];

export function buildContentSecurityPolicy(env = process.env, nonce) {
  const production = env.NODE_ENV === "production";
  const apiOrigin = originFrom(env.NEXT_PUBLIC_API_URL);
  const r2Origin = originFrom(env.NEXT_PUBLIC_R2_PUBLIC_URL ?? env.R2_PUBLIC_URL);
  const posthogOrigin = originFrom(env.NEXT_PUBLIC_POSTHOG_HOST);
  const nonceSource = nonce ? `'nonce-${nonce}'` : null;
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
  const scriptOrigins = unique([
    "'self'",
    nonceSource,
    nonceSource ? "'strict-dynamic'" : null,
    posthogOrigin,
    "https://us-assets.i.posthog.com",
  ]);
  const styleOrigins = unique(["'self'", nonceSource]);

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    `script-src ${scriptOrigins.join(" ")}`,
    `style-src ${styleOrigins.join(" ")}`,
    `style-src-elem ${styleOrigins.join(" ")}`,
    "style-src-attr 'unsafe-inline'",
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
}

export function buildSecurityHeaders(env = process.env, options = {}) {
  const production = env.NODE_ENV === "production";
  const includeContentSecurityPolicy = options.includeContentSecurityPolicy ?? true;
  const headers = [];

  if (includeContentSecurityPolicy) {
    headers.push({
      key: production ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only",
      value: buildContentSecurityPolicy(env, options.nonce),
    });
  }

  headers.push(
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
    { key: "X-Frame-Options", value: "DENY" },
  );

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
