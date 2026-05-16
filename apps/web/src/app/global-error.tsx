"use client";

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
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          margin: 0,
          background: "#faf9f5",
          color: "#1a1a17",
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ color: "#5c5a52", fontSize: 14, margin: "0 0 16px" }}>
            We hit an unexpected error. Try again or return home.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#526030",
              color: "#fff",
              border: "1px solid #526030",
              borderRadius: 10,
              padding: "8px 16px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p
              style={{
                marginTop: 16,
                fontFamily: "ui-monospace, monospace",
                fontSize: 11,
                color: "#8a8880",
              }}
            >
              {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
