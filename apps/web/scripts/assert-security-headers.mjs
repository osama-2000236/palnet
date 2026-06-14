import assert from "node:assert/strict";

import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
} from "../src/lib/security-headers.mjs";

function asMap(headers) {
  return new Map(headers.map((header) => [header.key, header.value]));
}

const devHeaders = asMap(buildSecurityHeaders({ NODE_ENV: "development" }));
assert(devHeaders.has("Content-Security-Policy-Report-Only"));
assert(!devHeaders.has("Content-Security-Policy"));
assert(!devHeaders.has("Strict-Transport-Security"));

const prodHeaders = asMap(buildSecurityHeaders({ NODE_ENV: "production" }));
assert(prodHeaders.has("Content-Security-Policy"));
const prodCsp = prodHeaders.get("Content-Security-Policy");
assert(!directive(prodCsp, "script-src").includes("'unsafe-inline'"));
assert(!directive(prodCsp, "style-src").includes("'unsafe-inline'"));
const nonceCsp = buildContentSecurityPolicy({ NODE_ENV: "production" }, "test-nonce");
assert(nonceCsp.includes("'nonce-test-nonce'"));
assert(!directive(nonceCsp, "script-src").includes("'unsafe-inline'"));
assert(!directive(nonceCsp, "style-src").includes("'unsafe-inline'"));
assert.equal(directive(nonceCsp, "style-src-attr"), "style-src-attr 'unsafe-inline'");
assert.equal(prodHeaders.get("X-Content-Type-Options"), "nosniff");
assert.equal(prodHeaders.get("Referrer-Policy"), "strict-origin-when-cross-origin");
assert.equal(prodHeaders.get("X-Frame-Options"), "DENY");
assert(prodHeaders.get("Permissions-Policy").includes("camera=()"));
assert(prodHeaders.has("Strict-Transport-Security"));

const staticProdHeaders = asMap(
  buildSecurityHeaders({ NODE_ENV: "production" }, { includeContentSecurityPolicy: false }),
);
assert(!staticProdHeaders.has("Content-Security-Policy"));
assert(staticProdHeaders.has("Strict-Transport-Security"));

console.log("security headers assertion passed");

function directive(csp, name) {
  return csp.split("; ").find((part) => part.startsWith(`${name} `)) ?? "";
}
