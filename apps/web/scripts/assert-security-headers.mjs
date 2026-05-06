import assert from "node:assert/strict";

import { buildSecurityHeaders } from "../next.config.mjs";

function asMap(headers) {
  return new Map(headers.map((header) => [header.key, header.value]));
}

const devHeaders = asMap(buildSecurityHeaders({ NODE_ENV: "development" }));
assert(devHeaders.has("Content-Security-Policy-Report-Only"));
assert(!devHeaders.has("Content-Security-Policy"));
assert(!devHeaders.has("Strict-Transport-Security"));

const prodHeaders = asMap(buildSecurityHeaders({ NODE_ENV: "production" }));
assert(prodHeaders.has("Content-Security-Policy"));
assert(!prodHeaders.get("Content-Security-Policy").includes("'unsafe-inline'"));
assert.equal(prodHeaders.get("X-Content-Type-Options"), "nosniff");
assert.equal(prodHeaders.get("Referrer-Policy"), "strict-origin-when-cross-origin");
assert.equal(prodHeaders.get("X-Frame-Options"), "DENY");
assert(prodHeaders.get("Permissions-Policy").includes("camera=()"));
assert(prodHeaders.has("Strict-Transport-Security"));

console.log("security headers assertion passed");
