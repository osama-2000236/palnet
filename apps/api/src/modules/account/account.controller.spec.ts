import { ErrorCode, type AccountExportEnvelope } from "@baydar/shared";
import type { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { NextFunction, Request, Response } from "express";
import request from "supertest";

import { AllExceptionsFilter } from "../../common/exception.filter";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

import { AccountController } from "./account.controller";
import { AccountService } from "./account.service";

const authUser = {
  id: "cm00000000000000000000001",
  email: "u@example.com",
  role: "USER" as const,
  locale: "ar-PS",
};

async function createApp(account: Partial<AccountService>): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [AccountController],
    providers: [{ provide: AccountService, useValue: account }],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate: (ctx: ExecutionContext): boolean => {
        const req = ctx.switchToHttp().getRequest<Request & { user?: typeof authUser }>();
        req.user = authUser;
        return true;
      },
    })
    .compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalFilters(new AllExceptionsFilter());
  app.use((req: Request & { user?: typeof authUser }, _res: Response, next: NextFunction) => {
    req.user = authUser;
    next();
  });
  await app.init();
  return app;
}

describe("AccountController", () => {
  it("validates delete confirmation and returns 204", async () => {
    const account = { delete: jest.fn().mockResolvedValue(undefined) };
    const app = await createApp(account);
    try {
      await request(app.getHttpServer())
        .post("/account/delete")
        .send({ confirmation: "WRONG" })
        .expect(400)
        .expect((res) => {
          expect(res.body.error.code).toBe(ErrorCode.VALIDATION_FAILED);
        });

      await request(app.getHttpServer())
        .post("/account/delete")
        .send({ confirmation: "DELETE_MY_ACCOUNT" })
        .expect(204)
        .expect("");
      expect(account.delete).toHaveBeenCalledWith(authUser.id);
    } finally {
      await app.close();
    }
  });

  it("returns export envelope with attachment disposition", async () => {
    const envelope: AccountExportEnvelope = {
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
    const account = { export: jest.fn().mockResolvedValue(envelope) };
    const app = await createApp(account);
    try {
      await request(app.getHttpServer())
        .get("/account/export")
        .expect(200)
        .expect("Content-Disposition", `attachment; filename="baydar-export-${authUser.id}.json"`)
        .expect(envelope);
      expect(account.export).toHaveBeenCalledWith(authUser.id);
    } finally {
      await app.close();
    }
  });

  it("restores without auth and returns a session envelope (body transport)", async () => {
    const session = {
      user: { id: authUser.id, email: "u@example.com", role: "USER", locale: "ar-PS" },
      tokens: {
        accessToken: "access",
        refreshToken: "refresh",
        accessExpiresAt: "2026-05-06T00:15:00.000Z",
        refreshExpiresAt: "2026-06-06T00:00:00.000Z",
      },
    };
    const account = { restore: jest.fn().mockResolvedValue(session) };
    const app = await createApp(account);
    try {
      await request(app.getHttpServer())
        .post("/account/restore")
        .set("X-Auth-Transport", "body")
        .send({ email: "u@example.com", password: "Password1", deviceId: "device-1" })
        .expect(200)
        .expect({ data: session });
      expect(account.restore).toHaveBeenCalledWith({
        email: "u@example.com",
        password: "Password1",
        deviceId: "device-1",
      });
    } finally {
      await app.close();
    }
  });

  it("restores with cookie transport: refresh token moves to an HttpOnly cookie", async () => {
    const session = {
      user: { id: authUser.id, email: "u@example.com", role: "USER", locale: "ar-PS" },
      tokens: {
        accessToken: "access",
        refreshToken: "refresh",
        accessExpiresAt: "2026-05-06T00:15:00.000Z",
        refreshExpiresAt: "2099-06-06T00:00:00.000Z",
      },
    };
    const account = { restore: jest.fn().mockResolvedValue(session) };
    const app = await createApp(account);
    try {
      const res = await request(app.getHttpServer())
        .post("/account/restore")
        .send({ email: "u@example.com", password: "Password1", deviceId: "device-1" })
        .expect(200);
      expect(res.body.data.tokens.refreshToken).toBe("");
      const setCookie = res.headers["set-cookie"]?.[0] ?? "";
      expect(setCookie).toContain("baydar_refresh=refresh");
      expect(setCookie).toContain("HttpOnly");
    } finally {
      await app.close();
    }
  });
});
