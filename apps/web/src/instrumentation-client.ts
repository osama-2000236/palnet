import * as Sentry from "@sentry/nextjs";

// Browser-side Sentry. No-op without NEXT_PUBLIC_SENTRY_DSN; CSP already
// whitelists *.ingest.sentry.io in security-headers.mjs.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
