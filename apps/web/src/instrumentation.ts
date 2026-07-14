import * as Sentry from "@sentry/nextjs";

// Server-side Sentry. No-op without NEXT_PUBLIC_SENTRY_DSN.
// ponytail: nodejs runtime only — edge (middleware) errors go unreported;
// add a sentry.edge.config if middleware failures ever matter.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
