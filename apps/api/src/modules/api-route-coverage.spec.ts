import "reflect-metadata";

import { RequestMethod, type Type } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA, SSE_METADATA } from "@nestjs/common/constants";

import { AccountController } from "./account/account.controller";
import { AdminBillingController } from "./admin/admin-billing.controller";
import { AdminInternalController } from "./admin/admin-internal.controller";
import { AdminModerationController } from "./admin/admin-moderation.controller";
import { AuthController } from "./auth/auth.controller";
import { IS_PUBLIC_KEY } from "./auth/decorators/public.decorator";
import { BillingController } from "./billing/billing.controller";
import { BookmarksController } from "./bookmarks/bookmarks.controller";
import { CommentsController } from "./comments/comments.controller";
import { CompaniesController } from "./companies/companies.controller";
import { CompanyJobsController } from "./companies/company-jobs.controller";
import { CompanyMembersController } from "./companies/company-members.controller";
import { ConnectionsController } from "./connections/connections.controller";
import { FeedController } from "./feed/feed.controller";
import { HealthController } from "./health/health.controller";
import { JobsController } from "./jobs/jobs.controller";
import { KaramaController } from "./karama/karama.controller";
import { MediaController } from "./media/media.controller";
import { MessagingController } from "./messaging/messaging.controller";
import { DevicesController } from "./notifications/devices.controller";
import { NotificationsController } from "./notifications/notifications.controller";
import { NotificationPreferencesController } from "./notifications/preferences.controller";
import { PostsController } from "./posts/posts.controller";
import { ProfilesController } from "./profiles/profiles.controller";
import { RatingsController } from "./ratings/ratings.controller";
import { ReactionsController } from "./reactions/reactions.controller";
import { RepostsController } from "./reposts/reposts.controller";
import { SafetyController } from "./safety/safety.controller";
import { SearchController } from "./search/search.controller";

const CONTROLLERS: Array<Type<unknown>> = [
  AccountController,
  AdminBillingController,
  AdminInternalController,
  AdminModerationController,
  AuthController,
  BillingController,
  BookmarksController,
  CommentsController,
  CompaniesController,
  CompanyJobsController,
  CompanyMembersController,
  ConnectionsController,
  FeedController,
  HealthController,
  JobsController,
  KaramaController,
  MediaController,
  MessagingController,
  DevicesController,
  NotificationsController,
  NotificationPreferencesController,
  PostsController,
  ProfilesController,
  RatingsController,
  ReactionsController,
  RepostsController,
  SafetyController,
  SearchController,
];

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
  "POST /media/presign",
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
