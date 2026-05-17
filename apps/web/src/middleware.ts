import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";

import { defaultLocale, locales } from "./i18n";
import { buildContentSecurityPolicy } from "./lib/security-headers.mjs";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

// This middleware is the SINGLE source of truth for the Content-Security-Policy
// response header. `next.config.mjs` deliberately passes
// `{ includeContentSecurityPolicy: false }` to `buildSecurityHeaders` so the
// static `headers()` block never sets CSP — that way the nonce minted here
// never gets clobbered by a stale value.
export default function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildContentSecurityPolicy(process.env, nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // `x-csp` is the value Server Components can read via `headers()` for
  // inline-script nonces. The response header is set below.
  requestHeaders.set("x-csp", csp);

  const response = intlMiddleware(new NextRequest(request, { headers: requestHeaders }));
  response.headers.set(
    process.env.NODE_ENV === "production"
      ? "Content-Security-Policy"
      : "Content-Security-Policy-Report-Only",
    csp,
  );
  return response;
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
