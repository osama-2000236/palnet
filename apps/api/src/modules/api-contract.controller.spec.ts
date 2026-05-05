import { ErrorCode, JobLocationMode, JobType, MediaKind } from "@baydar/shared";
import type { ExecutionContext, INestApplication, Provider, Type } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { NextFunction, Request, Response } from "express";
import request from "supertest";

import { AllExceptionsFilter } from "../common/exception.filter";

import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import type { AuthUser } from "./auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { JobsController } from "./jobs/jobs.controller";
import { JobsService } from "./jobs/jobs.service";
import { MediaController } from "./media/media.controller";
import { MediaService } from "./media/media.service";
import { MessagingBus } from "./messaging/messaging.bus";
import { MessagingController } from "./messaging/messaging.controller";
import { MessagingService } from "./messaging/messaging.service";
import { NotificationsBus } from "./notifications/notifications.bus";
import { NotificationsController } from "./notifications/notifications.controller";
import { NotificationsService } from "./notifications/notifications.service";

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
  it("rejects malformed logout bodies through the shared LogoutBody schema", async () => {
    const auth = { logout: jest.fn().mockResolvedValue(undefined) };
    const app = await createApp({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: auth }],
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
      providers: [{ provide: MediaService, useValue: media }],
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
      viewer: { hasApplied: false },
    };
    const jobs = { getOne: jest.fn().mockResolvedValue(job) };
    const app = await createApp({
      controllers: [JobsController],
      providers: [{ provide: JobsService, useValue: jobs }],
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

});
