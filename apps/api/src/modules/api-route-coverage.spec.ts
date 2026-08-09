import "reflect-metadata";

import { readdirSync } from "node:fs";
import path from "node:path";

import { RequestMethod, type Type } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA, SSE_METADATA } from "@nestjs/common/constants";

import { IS_PUBLIC_KEY } from "./auth/decorators/public.decorator";

/**
 * Every controller on disk, not a list somebody remembered to update.
 *
 * The hand-maintained array this replaces could not detect what it was for.
 * Dropping a new `@Public()` controller into `src/modules` — `GET
 * /leaky/secrets`, no auth — left both pins below passing, because the routes
 * it exposed belonged to a class the list had never heard of. A coverage check
 * whose input is curated by hand only covers what you already knew about.
 */
function controllerFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return controllerFiles(full);
    return entry.name.endsWith(".controller.ts") ? [full] : [];
  });
}

const CONTROLLERS: Type<unknown>[] = controllerFiles(__dirname).flatMap((file) =>
  // Dynamic by necessity: a static import list is the defect this replaces.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Object.values(require(file) as Record<string, unknown>).filter(
    (value): value is Type<unknown> =>
      typeof value === "function" && Reflect.hasMetadata(PATH_METADATA, value),
  ),
);

const EXPECTED_ROUTES = [
  "POST /account/delete",
  "GET /account/export",
  "POST /account/restore",
  "GET /admin/billing/invoices",
  "POST /admin/billing/invoices/:invoiceId/action",
  "POST /admin/internal/account-retention/run",
  "POST /admin/internal/karama-decay/run",
  "POST /admin/internal/billing/invoices/:invoiceId/action",
  "POST /admin/internal/media/scan",
  "GET /admin/moderation/reports",
  "GET /admin/moderation/reports/:id",
  "POST /admin/moderation/reports/:id/actions",
  "POST /auth/register",
  "POST /auth/login",
  "POST /auth/refresh",
  "POST /auth/verify-email/send",
  "POST /auth/verify-email/confirm",
  "POST /auth/forgot-password",
  "POST /auth/reset-password",
  "POST /auth/logout",
  "POST /auth/change-password",
  "GET /auth/sessions",
  "DELETE /auth/sessions/others",
  "DELETE /auth/sessions/:deviceId",
  "GET /auth/me",
  "POST /auth/stream-token",
  "POST /billing/checkout-session",
  "GET /billing/catalog",
  "GET /billing/me",
  "POST /billing/me/cancel",
  "GET /billing/invoices",
  "GET /billing/companies/:companyId/summary",
  "POST /billing/invoices/:id/pay-by-transfer",
  "POST /billing/webhooks/hyperpay",
  "GET /bookmarks",
  "POST /bookmarks",
  "DELETE /bookmarks/:id",
  "POST /posts/:id/comments",
  "GET /posts/:id/comments",
  "DELETE /comments/:id",
  "GET /companies/me",
  "POST /companies",
  "GET /companies/:idOrSlug",
  "PATCH /companies/:id",
  "DELETE /companies/:id",
  "GET /companies/:companyId/jobs",
  "POST /companies/:companyId/jobs",
  "PATCH /companies/:companyId/jobs/:jobId",
  "POST /companies/:companyId/jobs/:jobId/archive",
  "GET /companies/:companyId/jobs/:jobId/applicants",
  "PATCH /companies/:companyId/jobs/:jobId/applicants/:applicationId",
  "GET /companies/:companyId/members",
  "POST /companies/:companyId/members",
  "PATCH /companies/:companyId/members/:userId",
  "DELETE /companies/:companyId/members/:userId",
  "POST /connections",
  "POST /connections/:id/respond",
  "POST /connections/:id/withdraw",
  "DELETE /connections/:id",
  "GET /connections",
  "GET /connections/counts",
  "GET /connections/suggestions",
  "GET /feed",
  "GET /health",
  "GET /health/ready",
  "GET /jobs",
  "GET /jobs/alerts",
  "POST /jobs/alerts",
  "DELETE /jobs/alerts/:id",
  "GET /jobs/public/:id",
  "GET /jobs/:id",
  "POST /jobs/:id/apply",
  "GET /karama/balance",
  "POST /karama/redeem",
  // The asymmetric edge. A follow costs the person followed nothing, which is
  // why the diaspora can use it and a connection request they cannot.
  "POST /follows",
  "DELETE /follows",
  "GET /follows/me",
  "GET /follows/followers",
  "GET /follows/counts",
  // Less than a block, and not the same as each other: a mute is invisible and
  // only touches the feed; a restriction is for when blocking is itself a
  // signal the other person would notice.
  "POST /feed-mutes",
  "DELETE /feed-mutes/:userId",
  "GET /feed-mutes",
  "POST /restrictions",
  "DELETE /restrictions/:userId",
  "GET /restrictions",
  "GET /connections/degree/:userId",
  // Replaces GET /connections/suggestions, which returned people ordered by
  // profile freshness with no reason attached. The old path stays an alias for
  // one release — DEPRECATIONS.json.
  "GET /discovery/people",
  "DELETE /discovery/people/:userId",
  "GET /discovery/alumni",
  "GET /discovery/diaspora",
  "GET /discovery/nearby",
  "POST /admin/internal/second-degree/refresh",
  "POST /media/presign",
  // Resumable uploads. A drop on 2G costs the part in flight, not the file.
  "POST /media/multipart",
  "POST /media/multipart/:uploadId/part",
  "POST /media/multipart/:uploadId/complete",
  "DELETE /media/multipart/:uploadId",
  "POST /media/confirm",
  "GET /messaging/rooms",
  "POST /messaging/rooms",
  "GET /messaging/rooms/:id",
  "GET /messaging/rooms/:id/messages",
  "POST /messaging/rooms/:id/messages",
  "PATCH /messaging/messages/:id",
  "DELETE /messaging/messages/:id",
  "POST /messaging/rooms/:id/read",
  "POST /messaging/rooms/:id/archive",
  "POST /messaging/rooms/:id/typing",
  "SSE /messaging/stream",
  "GET /notifications",
  "GET /notifications/unread-count",
  "POST /notifications/read",
  "DELETE /notifications/:id",
  "SSE /notifications/stream",
  "POST /notifications/devices",
  "GET /me/notification-preferences",
  "PATCH /me/notification-preferences",
  "POST /posts",
  "GET /posts/:id",
  "PATCH /posts/:id",
  "DELETE /posts/:id",
  "POST /profiles/onboard",
  "PATCH /profiles/me",
  "GET /profiles/me",
  "POST /profiles/me/experiences",
  "PUT /profiles/me/experiences/:id",
  "DELETE /profiles/me/experiences/:id",
  "POST /profiles/me/educations",
  "PUT /profiles/me/educations/:id",
  "DELETE /profiles/me/educations/:id",
  "POST /profiles/me/skills",
  "DELETE /profiles/me/skills/:skillId",
  "POST /profiles/:handle/skills/:skillId/endorse",
  "GET /profiles/:handle",
  "POST /ratings",
  "GET /ratings/:userId",
  "GET /ratings/:userId/summary",
  "PUT /posts/:id/reaction",
  "DELETE /posts/:id/reaction",
  "POST /posts/:id/reposts",
  "DELETE /posts/:id/reposts",
  "POST /reports",
  "POST /blocks",
  // ── WS-01: identity, evidence, and the rest of a professional life (P3) ──
  // Profile sections. Every one is `me`-scoped: there is no route here that
  // takes somebody else's profile id.
  "POST /profiles/me/certificates",
  "PUT /profiles/me/certificates/:id",
  "DELETE /profiles/me/certificates/:id",
  "POST /profiles/me/languages",
  "DELETE /profiles/me/languages/:languageKey",
  "POST /profiles/me/volunteer",
  "PUT /profiles/me/volunteer/:id",
  "DELETE /profiles/me/volunteer/:id",
  "POST /profiles/me/honors",
  "PUT /profiles/me/honors/:id",
  "DELETE /profiles/me/honors/:id",
  "POST /profiles/me/publications",
  "PUT /profiles/me/publications/:id",
  "DELETE /profiles/me/publications/:id",
  "PUT /profiles/me/translations/:locale",
  "DELETE /profiles/me/translations/:locale",
  "PUT /profiles/me/career-break",
  "DELETE /profiles/me/career-break",
  // Aggregate only, k-anonymised at 5. There is deliberately no route that
  // returns a named viewer.
  "GET /profiles/me/views",
  // Verification. Four methods, none of them a blue tick.
  "GET /verifications/me",
  "POST /verifications/phone/start",
  "POST /verifications/phone/confirm",
  "POST /verifications/email-domain/start",
  "POST /verifications/email-domain/confirm",
  "POST /verifications/body/request",
  // Recommendations. Note what is absent: no route lets a SUBJECT edit a
  // testimonial's body, only hide it.
  "POST /recommendations",
  "POST /recommendations/requests",
  "GET /recommendations/requests",
  "POST /recommendations/:id/respond",
  "POST /recommendations/:id/withdraw",
  "PATCH /recommendations/:id/visibility",
  "GET /recommendations/:handle",
  // Occupation claims, work proofs, vouches, licences.
  "POST /profiles/me/claims",
  "DELETE /profiles/me/claims/:occupationKey",
  "POST /work-proofs",
  "GET /work-proofs/me",
  "POST /work-proofs/:id/confirm",
  "POST /work-proofs/:id/decline",
  // DISPUTE, never DELETE: a confirmed proof is a record, and either party
  // being able to erase it is the whole failure mode.
  "POST /work-proofs/:id/dispute",
  "GET /profiles/:handle/evidence",
  "POST /vouches",
  "DELETE /vouches/:id",
  "POST /licences",
  "POST /licences/:id/verify-request",
  "DELETE /licences/:id",
  // The CV document. HTML rather than PDF bytes -- see GAP-09.
  "GET /cv/:handle",
  "DELETE /blocks/:blockedUserId",
  "GET /blocks",
  "GET /search/people",
  "GET /search/posts",
  "GET /search/companies",
  "GET /search/jobs",
].sort();

// Routes reachable without a session. The global `JwtAuthGuard` is default-deny,
// so this list is the entire unauthenticated attack surface — and it was pinned
// by nothing. The route list above pins paths and methods, which is the half
// that breaks a client; this is the half that leaks data.
//
// Adding `@Public()` anywhere now fails here until someone edits this list,
// which is the point: it should take a deliberate edit, in a diff a reviewer
// can see.
const EXPECTED_PUBLIC_ROUTES = [
  // Token-authenticated automation, not open: the controller carries
  // `@UseGuards(InternalTokenGuard)`, covered in internal-token.guard.spec.ts.
  "POST /admin/internal/account-retention/run",
  "POST /admin/internal/karama-decay/run",
  "POST /admin/internal/second-degree/refresh",
  "POST /admin/internal/billing/invoices/:invoiceId/action",
  "POST /admin/internal/media/scan",
  // Credential surfaces. Each is rate-limited at the route.
  "POST /account/restore",
  "POST /auth/register",
  "POST /auth/login",
  "POST /auth/refresh",
  "POST /auth/verify-email/send",
  "POST /auth/verify-email/confirm",
  "POST /auth/forgot-password",
  "POST /auth/reset-password",
  // Signature-verified by the provider, so it cannot carry a session.
  "POST /billing/webhooks/hyperpay",
  // Liveness and readiness, scraped by the platform.
  "GET /health",
  "GET /health/ready",
  // The one deliberately anonymous read: a shared job link must open for a
  // logged-out visitor.
  "GET /jobs/public/:id",
].sort();

describe("API route coverage", () => {
  it("pins every public controller route", () => {
    expect(collectRoutes(CONTROLLERS).sort()).toEqual(EXPECTED_ROUTES);
  });

  it("pins every route reachable without a session", () => {
    expect(collectPublicRoutes(CONTROLLERS).sort()).toEqual(EXPECTED_PUBLIC_ROUTES);
  });
});

function collectRoutes(controllers: Array<Type<unknown>>): string[] {
  return controllers.flatMap((controller) => {
    const prefix = normalizePath(Reflect.getMetadata(PATH_METADATA, controller));
    return Object.getOwnPropertyNames(controller.prototype).flatMap((property) => {
      if (property === "constructor") return [];
      const handler = controller.prototype[property] as (...args: unknown[]) => unknown;
      const path = Reflect.getMetadata(PATH_METADATA, handler);
      const method = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;
      if (path === undefined || method === undefined) return [];
      const isSse = Reflect.getMetadata(SSE_METADATA, handler) === true;
      return [`${isSse ? "SSE" : methodName(method)} ${joinPaths(prefix, normalizePath(path))}`];
    });
  });
}

/**
 * Routes the global JWT guard will not challenge.
 *
 * `@Public()` is both a method and a class decorator, and on a class it covers
 * every route in it — `admin/internal` uses exactly that form. Reading only the
 * handler metadata would report those four routes as authenticated.
 */
function collectPublicRoutes(controllers: Type<unknown>[]): string[] {
  return controllers.flatMap((controller) => {
    const classPublic = Reflect.getMetadata(IS_PUBLIC_KEY, controller) === true;
    const prefix = normalizePath(Reflect.getMetadata(PATH_METADATA, controller));
    return Object.getOwnPropertyNames(controller.prototype).flatMap((property) => {
      if (property === "constructor") return [];
      const handler = controller.prototype[property] as (...args: unknown[]) => unknown;
      const path = Reflect.getMetadata(PATH_METADATA, handler);
      const method = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;
      if (path === undefined || method === undefined) return [];
      if (!classPublic && Reflect.getMetadata(IS_PUBLIC_KEY, handler) !== true) return [];
      const isSse = Reflect.getMetadata(SSE_METADATA, handler) === true;
      return [`${isSse ? "SSE" : methodName(method)} ${joinPaths(prefix, normalizePath(path))}`];
    });
  });
}

function normalizePath(path: string | string[] | undefined): string {
  const value = Array.isArray(path) ? (path[0] ?? "") : (path ?? "");
  return value.replace(/^\/+|\/+$/g, "");
}

function joinPaths(prefix: string, path: string): string {
  const joined = [prefix, path].filter(Boolean).join("/");
  return `/${joined}`;
}

function methodName(method: RequestMethod): string {
  return RequestMethod[method];
}
