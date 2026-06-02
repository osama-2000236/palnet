"use client";

// Root error boundary. Triggered when ANY unhandled error escapes a
// rendering tree above the (app)/error.tsx segment boundary — including
// errors thrown by /(auth)/* routes, /(public)/* routes, the locale shell
// itself, or non-localized leaves like /not-found.
//
// Next.js App Router contract:
//   • Must be a Client Component.
//   • Receives { error, reset } — `reset()` re-renders the segment.
//   • Sits at `app/error.tsx`, sibling to `app/layout.tsx`.
//
// Keep this dependency-light: it loads BEFORE next-intl + the design system
// can be relied upon (a token-rendering crash would re-trigger this file).
// So we hand-roll the chrome with raw tokens.

import { useEffect } from "react";
import Link from "next/link";
import { tokens } from "@baydar/ui-tokens";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[RootError]", error);
  }, [error]);

  return (
    <html lang="en" dir="ltr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
          color: tokens.color.ink.DEFAULT,
          backgroundColor: tokens.color.surface.muted,
          display: "grid",
          placeItems: "center",
          padding: "32px",
        }}
      >
        <main
          style={{
            maxWidth: 440,
            width: "100%",
            background: tokens.color.surface.DEFAULT,
            border: `1px solid ${tokens.color.line.soft}`,
            borderRadius: tokens.radius.lg,
            padding: "32px",
            boxShadow: tokens.shadow.card,
            textAlign: "center",
          }}
        >
          {/* Inline logo so a font/CSS regression can't break this screen. */}
          <div
            aria-hidden="true"
            style={{
              width: 48,
              height: 48,
              margin: "0 auto 20px",
              borderRadius: tokens.radius.md,
              background: tokens.color.brand[600],
              display: "grid",
              placeItems: "center",
              color: tokens.color.ink.inverse,
              fontWeight: 700,
              fontSize: 24,
              fontFamily: '"IBM Plex Sans Arabic", system-ui, sans-serif',
            }}
          >
            ب
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 600,
              margin: "0 0 8px",
              letterSpacing: "-0.01em",
            }}
          >
            Something broke on our end
          </h1>
          <p
            style={{
              color: tokens.color.ink.muted,
              fontSize: 14,
              lineHeight: 1.55,
              margin: "0 0 24px",
            }}
          >
            We hit an unexpected error while loading Baydar. The team has been notified. Try again,
            or head back to your feed.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                background: tokens.color.brand[600],
                color: tokens.color.ink.inverse,
                border: `1px solid ${tokens.color.brand[600]}`,
                borderRadius: tokens.radius.md,
                padding: "9px 18px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Try again
            </button>
            <Link
              href="/"
              style={{
                background: tokens.color.surface.DEFAULT,
                color: tokens.color.ink.DEFAULT,
                border: `1px solid ${tokens.color.line.hard}`,
                borderRadius: tokens.radius.md,
                padding: "9px 18px",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                fontFamily: "inherit",
              }}
            >
              Go home
            </Link>
          </div>
          {error.digest ? (
            <p
              style={{
                marginTop: 24,
                marginBottom: 0,
                fontSize: 11,
                color: tokens.color.ink.subtle,
                fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
              }}
            >
              Error ID: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
