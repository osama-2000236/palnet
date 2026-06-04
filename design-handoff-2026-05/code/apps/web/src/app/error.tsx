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
          color: "#1a1a17",
          backgroundColor: "#faf9f5",
          display: "grid",
          placeItems: "center",
          padding: "32px",
        }}
      >
        <main
          style={{
            maxWidth: 440,
            width: "100%",
            background: "#ffffff",
            border: "1px solid rgba(26,26,23,0.08)",
            borderRadius: 14,
            padding: "32px",
            boxShadow: "0 1px 2px rgba(26,26,23,0.04), 0 1px 3px rgba(26,26,23,0.05)",
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
              borderRadius: 12,
              background: "#526030",
              display: "grid",
              placeItems: "center",
              color: "#fff",
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
              color: "#5c5a52",
              fontSize: 14,
              lineHeight: 1.55,
              margin: "0 0 24px",
            }}
          >
            We hit an unexpected error while loading Baydar. The team has been notified.
            Try again, or head back to your feed.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                background: "#526030",
                color: "#fff",
                border: "1px solid #526030",
                borderRadius: 10,
                padding: "9px 18px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                background: "#ffffff",
                color: "#1a1a17",
                border: "1px solid rgba(26,26,23,0.16)",
                borderRadius: 10,
                padding: "9px 18px",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                fontFamily: "inherit",
              }}
            >
              Go home
            </a>
          </div>
          {error.digest ? (
            <p
              style={{
                marginTop: 24,
                marginBottom: 0,
                fontSize: 11,
                color: "#8a8880",
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
