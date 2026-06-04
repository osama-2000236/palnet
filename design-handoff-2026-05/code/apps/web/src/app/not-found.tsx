// Root 404 — caught by Next.js when no segment matches. Locale-agnostic
// (the locale router lives one level deeper); the "Go home" CTA hits "/"
// and the middleware redirects to the user's preferred locale.
//
// Next.js App Router contract:
//   • Server Component is OK — no client interactivity needed.
//   • Sits at `app/not-found.tsx`, sibling to `app/layout.tsx`.
//
// Kept dependency-light for the same reason as `app/error.tsx`: this page
// may render when locale resources are themselves the cause of the miss.

import Link from "next/link";
import type { JSX } from "react";

export default function NotFound(): JSX.Element {
  return (
    <main
      style={{
        minHeight: "100vh",
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
        color: "#1a1a17",
        backgroundColor: "#faf9f5",
        display: "grid",
        placeItems: "center",
        padding: "32px",
      }}
    >
      <section
        style={{
          maxWidth: 480,
          width: "100%",
          background: "#ffffff",
          border: "1px solid rgba(26,26,23,0.08)",
          borderRadius: 14,
          padding: "40px 32px",
          boxShadow: "0 1px 2px rgba(26,26,23,0.04), 0 1px 3px rgba(26,26,23,0.05)",
          textAlign: "center",
        }}
      >
        {/* "404" rendered as a large, brand-coloured numeral — no illustration
         * dependency, no font dependency beyond the body stack. */}
        <div
          style={{
            fontFamily: '"IBM Plex Sans Arabic", "IBM Plex Sans", system-ui, sans-serif',
            fontSize: 88,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            color: "#526030",
            margin: "0 0 16px",
          }}
        >
          404
        </div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            margin: "0 0 8px",
            letterSpacing: "-0.01em",
          }}
        >
          That page slipped away
        </h1>
        <p
          style={{
            color: "#5c5a52",
            fontSize: 14,
            lineHeight: 1.55,
            margin: "0 0 24px",
            maxWidth: "44ch",
            marginInline: "auto",
          }}
        >
          The link might be wrong, the post might be deleted, or the handle might not exist. Try a
          search, or head back to your feed.
        </p>
        <nav style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/feed"
            style={{
              background: "#526030",
              color: "#fff",
              border: "1px solid #526030",
              borderRadius: 10,
              padding: "9px 18px",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Go to feed
          </Link>
          <Link
            href="/search"
            style={{
              background: "#ffffff",
              color: "#1a1a17",
              border: "1px solid rgba(26,26,23,0.16)",
              borderRadius: 10,
              padding: "9px 18px",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Search
          </Link>
        </nav>
      </section>
    </main>
  );
}
