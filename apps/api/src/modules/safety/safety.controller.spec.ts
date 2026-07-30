import { ErrorCode, ReportReason } from "@baydar/shared";
import {
  type ExecutionContext,
  type INestApplication,
  UnauthorizedException,
} from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { ThrottlerModule } from "@nestjs/throttler";
import type { Request } from "express";
import request from "supertest";

import { DomainException } from "../../common/domain-exception";
import { AllExceptionsFilter } from "../../common/exception.filter";
import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { BaydarThrottlerGuard } from "../rate-limit/rate-limit.guard";

import { SafetyController } from "./safety.controller";
import { SafetyService } from "./safety.service";

const authUser: AuthUser = {
  id: "cm00000000000000000000001",
  email: "user@example.com",
  role: "USER",
  locale: "ar-PS",
};

async function createApp(options: {
  safety: Partial<Record<keyof SafetyService, jest.Mock>>;
  authenticated?: boolean;
}): Promise<INestApplication> {
  const builder = Test.createTestingModule({
    imports: [ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 1_000 }])],
    controllers: [SafetyController],
    providers: [
      { provide: SafetyService, useValue: options.safety },
      { provide: APP_GUARD, useClass: BaydarThrottlerGuard },
    ],
  });

  builder.overrideGuard(JwtAuthGuard).useValue({
    canActivate: (ctx: ExecutionContext): boolean => {
      if (options.authenticated === false) {
        throw new UnauthorizedException({
          error: { code: ErrorCode.AUTH_UNAUTHORIZED, message: "Missing bearer token." },
        });
      }
      const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
      req.user = authUser;
      return true;
    },
  });

  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  return app;
}

describe("SafetyController", () => {
  it("requires auth", async () => {
    const app = await createApp({ safety: {}, authenticated: false });
    try {
      await request(app.getHttpServer()).get("/blocks").expect(401);
    } finally {
      await app.close();
    }
  });

  it("rejects invalid report bodies with 400", async () => {
    const safety = { report: jest.fn() };
    const app = await createApp({ safety });
    try {
      await request(app.getHttpServer())
        .post("/reports")
        .send({ reason: ReportReason.SPAM })
        .expect(400)
        .expect((res) => {
          expect(res.body.error.code).toBe(ErrorCode.VALIDATION_FAILED);
        });
      expect(safety.report).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("maps self-target service rejection to 400", async () => {
    const safety = {
      report: jest
        .fn()
        .mockRejectedValue(
          new DomainException(ErrorCode.VALIDATION_FAILED, "Cannot report yourself.", 400),
        ),
    };
    const app = await createApp({ safety });
    try {
      await request(app.getHttpServer())
        .post("/reports")
        .send({ reason: ReportReason.SPAM, targetUserId: "cm00000000000000000000002" })
        .expect(400);
    } finally {
      await app.close();
    }
  });

  it("preserves forbidden service errors as 403", async () => {
    const safety = {
      block: jest.fn().mockRejectedValue(new DomainException(ErrorCode.BLOCKED, "Blocked.", 403)),
    };
    const app = await createApp({ safety });
    try {
      await request(app.getHttpServer())
        .post("/blocks")
        .send({ blockedUserId: "cm00000000000000000000002" })
        .expect(403)
        .expect((res) => {
          expect(res.body.error.code).toBe(ErrorCode.BLOCKED);
        });
    } finally {
      await app.close();
    }
  });

  it("creates reports and blocks with data envelopes", async () => {
    const createdAt = new Date("2026-05-05T00:00:00Z");
    const safety = {
      report: jest.fn().mockResolvedValue({ id: "cm00000000000000000000010", createdAt }),
      block: jest.fn().mockResolvedValue({
        id: "cm00000000000000000000011",
        blockedUserId: "cm00000000000000000000002",
        createdAt,
      }),
    };
    const app = await createApp({ safety });
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
    } finally {
      await app.close();
    }
  });

  it("unblocks idempotently with 204", async () => {
    const safety = { unblock: jest.fn().mockResolvedValue(undefined) };
    const app = await createApp({ safety });
    try {
      await request(app.getHttpServer()).delete("/blocks/cm00000000000000000000002").expect(204);
      expect(safety.unblock).toHaveBeenCalledWith(
        "cm00000000000000000000001",
        "cm00000000000000000000002",
      );
    } finally {
      await app.close();
    }
  });

  it("lists blocks with pagination envelope", async () => {
    const safety = {
      listBlocked: jest.fn().mockResolvedValue({
        data: [],
        meta: { nextCursor: null, hasMore: false, limit: 20 },
      }),
    };
    const app = await createApp({ safety });
    try {
      await request(app.getHttpServer())
        .get("/blocks")
        .expect(200)
        .expect({
          data: [],
          meta: { nextCursor: null, hasMore: false, limit: 20 },
        });
    } finally {
      await app.close();
    }
  });
});
