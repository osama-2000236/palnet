import { ErrorCode, JobLocationMode, JobType, MediaKind, ReportReason } from "@baydar/shared";
import type { ExecutionContext, INestApplication, Provider, Type } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { NextFunction, Request, Response } from "express";
import request from "supertest";

import { AllExceptionsFilter } from "../common/exception.filter";

import { AccountController } from "./account/account.controller";
import { AccountService } from "./account/account.service";
import { AuthEmailThrottleService } from "./auth/auth-email-throttle.service";
import { AuthTokensService } from "./auth/auth-tokens.service";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import type { AuthUser } from "./auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { JobAlertsService } from "./jobs/job-alerts.service";
import { JobsController } from "./jobs/jobs.controller";
import { JobsService } from "./jobs/jobs.service";
import { MediaScanService } from "./media/media-scan.service";
import { MediaController } from "./media/media.controller";
import { MediaMultipartService } from "./media/media-multipart.service";
import { MediaService } from "./media/media.service";
import { MessagingBus } from "./messaging/messaging.bus";
import { MessagingController } from "./messaging/messaging.controller";
import { MessagingService } from "./messaging/messaging.service";
import { NotificationsBus } from "./notifications/notifications.bus";
import { NotificationsController } from "./notifications/notifications.controller";
import { NotificationsService } from "./notifications/notifications.service";
import { SafetyController } from "./safety/safety.controller";
import { SafetyService } from "./safety/safety.service";
import { SearchController } from "./search/search.controller";
import { SearchService } from "./search/search.service";

const authUser: AuthUser = {
  id: "cm00000000000000000000001",
  email: "user@example.com",
  role: "USER",
  locale: "ar-PS",
};

async function createApp(options: {
  controllers: Type<unknown>[];
  providers: Provider[];
  overrideJwt?: boolean;
}): Promise<INestApplication> {
  const builder = Test.createTestingModule({
    controllers: options.controllers,
    providers: options.providers,
  });

  if (options.overrideJwt) {
    builder.overrideGuard(JwtAuthGuard).useValue({
      canActivate: (ctx: ExecutionContext): boolean => {
        const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
        req.user = authUser;
        return true;
      },
    });
  }

  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalFilters(new AllExceptionsFilter());
  app.use((req: Request & { user?: AuthUser }, _res: Response, next: NextFunction): void => {
    req.user = authUser;
    next();
  });
  await app.init();
  return app;
}

describe("API controller contract", () => {
  it("pins account deletion/export/restore routes", async () => {
    const envelope = {
      exportedAt: "2026-05-06T00:00:00.000Z",
      userId: authUser.id,
      profile: null,
      posts: [],
      comments: [],
      reactions: [],
      reposts: [],
      chatRoomMembers: [],
      messages: [],
      notifications: [],
      blockedUsers: [],
      reports: [],
    };
    const account = {
      delete: jest.fn().mockResolvedValue(undefined),
      export: jest.fn().mockResolvedValue(envelope),
      restore: jest.fn().mockResolvedValue({
        user: authUser,
        tokens: {
          accessToken: "access",
          refreshToken: "refresh",
          accessExpiresAt: "2026-05-06T00:15:00.000Z",
          refreshExpiresAt: "2026-06-06T00:00:00.000Z",
        },
      }),
    };
    const app = await createApp({
      controllers: [AccountController],
      providers: [{ provide: AccountService, useValue: account }],
      overrideJwt: true,
    });

    try {
      await request(app.getHttpServer())
        .post("/account/delete")
        .send({ confirmation: "DELETE_MY_ACCOUNT" })
        .expect(204)
        .expect("");

      await request(app.getHttpServer())
        .get("/account/export")
        .expect(200)
        .expect("Content-Disposition", `attachment; filename="baydar-export-${authUser.id}.json"`)
        .expect(envelope);

      await request(app.getHttpServer())
        .post("/account/restore")
        .send({ email: "user@example.com", password: "Password1", deviceId: "device-1" })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.tokens.accessToken).toBe("access");
        });
    } finally {
      await app.close();
    }
  });

  it("rejects malformed logout bodies through the shared LogoutBody schema", async () => {
    const auth = { logout: jest.fn().mockResolvedValue(undefined) };
    const app = await createApp({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: AuthTokensService, useValue: {} },
        { provide: AuthEmailThrottleService, useValue: { check: jest.fn() } },
      ],
      overrideJwt: true,
    });

    try {
      await request(app.getHttpServer())
        .post("/auth/logout")
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body.error.code).toBe(ErrorCode.VALIDATION_FAILED);
        });
      expect(auth.logout).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("pins email verification and password reset auth routes", async () => {
    const auth = { findUserForEmailToken: jest.fn().mockResolvedValue(null) };
    const authTokens = {
      consumeVerifyEmail: jest.fn().mockResolvedValue(undefined),
      issuePasswordReset: jest.fn().mockResolvedValue(undefined),
      consumePasswordReset: jest.fn().mockResolvedValue(undefined),
    };
    const app = await createApp({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: AuthTokensService, useValue: authTokens },
        { provide: AuthEmailThrottleService, useValue: { check: jest.fn() } },
      ],
      overrideJwt: true,
    });

    try {
      await request(app.getHttpServer())
        .post("/auth/verify-email/send")
        .send({ email: "demo@baydar.ps" })
        .expect(202)
        .expect("");

      await request(app.getHttpServer())
        .post("/auth/verify-email/confirm")
        .send({ token: "a".repeat(64) })
        .expect(200)
        .expect({ data: { emailVerified: true } });

      await request(app.getHttpServer())
        .post("/auth/forgot-password")
        .send({ email: "missing@baydar.ps" })
        .expect(202)
        .expect("");

      await request(app.getHttpServer())
        .post("/auth/reset-password")
        .send({ token: "b".repeat(64), newPassword: "NewPassword1" })
        .expect(200)
        .expect({ data: { reset: true } });
    } finally {
      await app.close();
    }
  });

  it("rejects malformed messaging list queries through ZodValidationPipe", async () => {
    const messaging = { listMessages: jest.fn() };
    const app = await createApp({
      controllers: [MessagingController],
      providers: [
        { provide: MessagingService, useValue: messaging },
        { provide: MessagingBus, useValue: { subscribe: jest.fn() } },
      ],
    });

    try {
      await request(app.getHttpServer())
        .get("/messaging/rooms/cm00000000000000000000002/messages?limit=nope")
        .expect(400)
        .expect((res) => {
          expect(res.body.error.code).toBe(ErrorCode.VALIDATION_FAILED);
        });
      expect(messaging.listMessages).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("rejects malformed notifications list queries through ZodValidationPipe", async () => {
    const notifications = { list: jest.fn() };
    const app = await createApp({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: notifications },
        { provide: NotificationsBus, useValue: { subscribe: jest.fn() } },
      ],
    });

    try {
      await request(app.getHttpServer())
        .get("/notifications?after=not-a-cuid")
        .expect(400)
        .expect((res) => {
          expect(res.body.error.code).toBe(ErrorCode.VALIDATION_FAILED);
        });
      expect(notifications.list).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("pins media presign to POST /media/presign", async () => {
    const presigned = {
      uploadUrl: "https://signed.example/upload",
      publicUrl: "https://cdn.example/avatar.png",
      key: "avatar/cm00000000000000000000001/avatar.png",
      headers: { "Content-Type": "image/png" },
      expiresAt: "2026-05-05T00:00:00.000Z",
      blurhash: "LKO2?U%2Tw=w]~RBVZRi};RPxuwH",
    };
    const media = { presign: jest.fn().mockResolvedValue(presigned) };
    const app = await createApp({
      controllers: [MediaController],
      providers: [
        { provide: MediaService, useValue: media },
        { provide: MediaMultipartService, useValue: {} },
        { provide: MediaScanService, useValue: { scanObject: jest.fn() } },
      ],
    });

    try {
      await request(app.getHttpServer())
        .post("/media/presign")
        .send({
          purpose: "AVATAR",
          kind: MediaKind.IMAGE,
          mimeType: "image/png",
          sizeBytes: 1024,
        })
        .expect(201)
        .expect({ data: presigned });
      expect(media.presign).toHaveBeenCalledWith(authUser.id, {
        purpose: "AVATAR",
        kind: MediaKind.IMAGE,
        mimeType: "image/png",
        sizeBytes: 1024,
      });
    } finally {
      await app.close();
    }
  });

  it("keeps messaging detail as a raw ChatRoom DTO", async () => {
    const room = {
      id: "cm00000000000000000000002",
      isGroup: false,
      title: null,
      lastMessage: null,
      unreadCount: 0,
      members: [],
      updatedAt: "2026-05-05T00:00:00.000Z",
    };
    const messaging = { getRoomDto: jest.fn().mockResolvedValue(room) };
    const app = await createApp({
      controllers: [MessagingController],
      providers: [
        { provide: MessagingService, useValue: messaging },
        { provide: MessagingBus, useValue: { subscribe: jest.fn() } },
      ],
    });

    try {
      await request(app.getHttpServer())
        .get("/messaging/rooms/cm00000000000000000000002")
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(room);
          expect(res.body).not.toHaveProperty("data");
        });
    } finally {
      await app.close();
    }
  });

  it("keeps jobs detail as a raw Job DTO", async () => {
    const job = {
      id: "cm00000000000000000000003",
      companyId: "cm00000000000000000000004",
      postedById: "cm00000000000000000000005",
      title: "Senior Product Engineer",
      description: "Build Baydar hiring workflows.",
      type: JobType.FULL_TIME,
      locationMode: JobLocationMode.HYBRID,
      city: "Ramallah",
      country: "PS",
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      skillsRequired: ["TypeScript"],
      isActive: true,
      expiresAt: null,
      createdAt: "2026-05-05T00:00:00.000Z",
      company: {
        id: "cm00000000000000000000004",
        slug: "baydar",
        name: "Baydar",
        logoUrl: null,
      },
      viewer: { hasApplied: false, bookmarkId: null },
    };
    const jobs = { getOne: jest.fn().mockResolvedValue(job) };
    const app = await createApp({
      controllers: [JobsController],
      providers: [
        { provide: JobsService, useValue: jobs },
        { provide: JobAlertsService, useValue: {} },
      ],
    });

    try {
      await request(app.getHttpServer())
        .get("/jobs/cm00000000000000000000003")
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(job);
          expect(res.body).not.toHaveProperty("data");
        });
    } finally {
      await app.close();
    }
  });

  it("serves the public job share DTO without viewer state and with public caching", async () => {
    const publicJob = {
      id: "cm00000000000000000000003",
      companyId: "cm00000000000000000000004",
      title: "Senior Product Engineer",
      description: "Build Baydar hiring workflows.",
      type: JobType.FULL_TIME,
      locationMode: JobLocationMode.HYBRID,
      city: "Ramallah",
      country: "PS",
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      skillsRequired: ["TypeScript"],
      isActive: true,
      expiresAt: null,
      createdAt: "2026-05-05T00:00:00.000Z",
      company: {
        id: "cm00000000000000000000004",
        slug: "baydar",
        name: "Baydar",
        logoUrl: null,
      },
    };
    const jobs = { getPublic: jest.fn().mockResolvedValue(publicJob) };
    const app = await createApp({
      controllers: [JobsController],
      providers: [
        { provide: JobsService, useValue: jobs },
        { provide: JobAlertsService, useValue: {} },
      ],
    });

    try {
      await request(app.getHttpServer())
        .get("/jobs/public/cm00000000000000000000003")
        .expect(200)
        .expect("Cache-Control", "public, max-age=300")
        .expect((res) => {
          expect(res.body).toEqual(publicJob);
          expect(res.body).not.toHaveProperty("viewer");
          expect(res.body).not.toHaveProperty("postedById");
        });
    } finally {
      await app.close();
    }
  });

  it("keeps notifications unread-count as a raw count DTO", async () => {
    const notifications = { countUnread: jest.fn().mockResolvedValue(7) };
    const app = await createApp({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: notifications },
        { provide: NotificationsBus, useValue: { subscribe: jest.fn() } },
      ],
    });

    try {
      await request(app.getHttpServer())
        .get("/notifications/unread-count")
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ count: 7 });
          expect(res.body).not.toHaveProperty("data");
        });
    } finally {
      await app.close();
    }
  });

  it("pins notifications dismiss route to raw 204", async () => {
    const notifications = { dismiss: jest.fn().mockResolvedValue(undefined) };
    const app = await createApp({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: notifications },
        { provide: NotificationsBus, useValue: { subscribe: jest.fn() } },
      ],
    });

    try {
      await request(app.getHttpServer())
        .delete("/notifications/cm00000000000000000000040")
        .expect(204)
        .expect((res) => {
          expect(res.text).toBe("");
        });
      expect(notifications.dismiss).toHaveBeenCalledWith(authUser.id, "cm00000000000000000000040");
    } finally {
      await app.close();
    }
  });

  it("pins safety routes to envelopes and raw 204 unblock", async () => {
    const createdAt = new Date("2026-05-05T00:00:00Z");
    const safety = {
      report: jest.fn().mockResolvedValue({ id: "cm00000000000000000000010", createdAt }),
      block: jest.fn().mockResolvedValue({
        id: "cm00000000000000000000011",
        blockedUserId: "cm00000000000000000000002",
        createdAt,
      }),
      unblock: jest.fn().mockResolvedValue(undefined),
      listBlocked: jest.fn().mockResolvedValue({
        data: [],
        meta: { nextCursor: null, hasMore: false, limit: 20 },
      }),
    };
    const app = await createApp({
      controllers: [SafetyController],
      providers: [{ provide: SafetyService, useValue: safety }],
      overrideJwt: true,
    });

    try {
      await request(app.getHttpServer())
        .post("/reports")
        .send({ reason: ReportReason.SPAM, targetUserId: "cm00000000000000000000002" })
        .expect(201)
        .expect({
          data: { id: "cm00000000000000000000010", createdAt: createdAt.toISOString() },
        });

      await request(app.getHttpServer())
        .post("/blocks")
        .send({ blockedUserId: "cm00000000000000000000002" })
        .expect(201)
        .expect({
          data: {
            id: "cm00000000000000000000011",
            blockedUserId: "cm00000000000000000000002",
            createdAt: createdAt.toISOString(),
          },
        });

      await request(app.getHttpServer())
        .get("/blocks")
        .expect(200)
        .expect({
          data: [],
          meta: { nextCursor: null, hasMore: false, limit: 20 },
        });

      await request(app.getHttpServer())
        .delete("/blocks/cm00000000000000000000002")
        .expect(204)
        .expect((res) => {
          expect(res.text).toBe("");
        });
    } finally {
      await app.close();
    }
  });

  it("pins posts search route and cursor envelope", async () => {
    const search = {
      searchPosts: jest.fn().mockResolvedValue({
        data: [
          {
            id: "cm00000000000000000000020",
            authorId: "cm00000000000000000000021",
            authorHandle: "muna",
            authorDisplayName: "Muna Saleh",
            authorAvatarUrl: null,
            bodyExcerpt: "Hiring search is now broader.",
            matchStart: 0,
            matchEnd: 6,
            createdAt: "2026-05-05T00:00:00.000Z",
          },
        ],
        meta: { nextCursor: null, hasMore: false, limit: 20 },
      }),
    };
    const app = await createApp({
      controllers: [SearchController],
      providers: [{ provide: SearchService, useValue: search }],
      overrideJwt: true,
    });

    try {
      await request(app.getHttpServer())
        .get("/search/posts?q=hiring")
        .expect(200)
        .expect({
          data: [
            {
              id: "cm00000000000000000000020",
              authorId: "cm00000000000000000000021",
              authorHandle: "muna",
              authorDisplayName: "Muna Saleh",
              authorAvatarUrl: null,
              bodyExcerpt: "Hiring search is now broader.",
              matchStart: 0,
              matchEnd: 6,
              createdAt: "2026-05-05T00:00:00.000Z",
            },
          ],
          meta: { nextCursor: null, hasMore: false, limit: 20 },
        });
      expect(search.searchPosts).toHaveBeenCalledWith(authUser.id, { q: "hiring", limit: 20 });
    } finally {
      await app.close();
    }
  });

  it("pins jobs search route and cursor envelope", async () => {
    const search = {
      searchJobs: jest.fn().mockResolvedValue({
        data: [
          {
            id: "cm00000000000000000000030",
            title: "Product Engineer",
            companyName: "Baydar",
            companyLogoUrl: null,
            locationMode: JobLocationMode.HYBRID,
            city: "Ramallah",
            country: "PS",
            type: JobType.FULL_TIME,
            createdAt: "2026-05-05T00:00:00.000Z",
          },
        ],
        meta: { nextCursor: null, hasMore: false, limit: 20 },
      }),
    };
    const app = await createApp({
      controllers: [SearchController],
      providers: [{ provide: SearchService, useValue: search }],
      overrideJwt: true,
    });

    try {
      await request(app.getHttpServer())
        .get("/search/jobs?q=engineer")
        .expect(200)
        .expect({
          data: [
            {
              id: "cm00000000000000000000030",
              title: "Product Engineer",
              companyName: "Baydar",
              companyLogoUrl: null,
              locationMode: JobLocationMode.HYBRID,
              city: "Ramallah",
              country: "PS",
              type: JobType.FULL_TIME,
              createdAt: "2026-05-05T00:00:00.000Z",
            },
          ],
          meta: { nextCursor: null, hasMore: false, limit: 20 },
        });
      expect(search.searchJobs).toHaveBeenCalledWith(authUser.id, { q: "engineer", limit: 20 });
    } finally {
      await app.close();
    }
  });
});
