"use client";

import { tokens } from "@baydar/ui-tokens";
import Link from "next/link";

// Root error boundary — catches errors thrown in the root layout itself.
// Must include <html> and <body>. Token-bound inline styles only since this
// renders without the locale layout's CSS shell.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  return (
    <html lang="en" dir="ltr">
      <style>{`
        :root {
          --surface: ${tokens.color.surface.DEFAULT};
          --focus-ring-color: ${tokens.color.brand[600]};
          --focus-ring-width: ${tokens.focus.width}px;
          --focus-ring-offset: ${tokens.focus.offset}px;
          --focus-ring: ${tokens.focus.ring};
        }
        .global-error-action:focus-visible {
          outline: none;
          box-shadow: var(--focus-ring);
        }
      `}</style>
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          margin: 0,
          background: tokens.color.surface.muted,
          color: tokens.color.ink.DEFAULT,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 style={{ fontSize: tokens.type.scale.h1.size, margin: "0 0 8px" }}>
            Something went wrong
          </h1>
          <p
            style={{
              color: tokens.color.ink.muted,
              fontSize: tokens.type.scale.body.size,
              margin: "0 0 16px",
            }}
          >
            We hit an unexpected error. Try again or return home.
          </p>
          <button
            type="button"
            onClick={reset}
            className="global-error-action"
            style={{
              background: tokens.color.brand[600],
              color: tokens.color.ink.inverse,
              border: `1px solid ${tokens.color.brand[600]}`,
              borderRadius: 10,
              padding: "8px 16px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <Link
            href="/"
            className="global-error-action"
            style={{
              display: "inline-block",
              marginInlineStart: 8,
              background: tokens.color.surface.DEFAULT,
              color: tokens.color.ink.DEFAULT,
              border: `1px solid ${tokens.color.line.hard}`,
              borderRadius: tokens.radius.md,
              padding: "8px 16px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Go home
          </Link>
          {error.digest ? (
            <p
              style={{
                marginTop: 16,
                fontFamily: "ui-monospace, monospace",
                fontSize: tokens.type.scale.micro.size,
                color: tokens.color.ink.subtle,
              }}
              dir="ltr"
            >
              Error ID: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
