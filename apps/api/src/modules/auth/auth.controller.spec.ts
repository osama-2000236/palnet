import type { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Request } from "express";
import request from "supertest";

import { AuthEmailThrottleService } from "./auth-email-throttle.service";
import { AuthTokensService } from "./auth-tokens.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

const authSession = {
  user: {
    id: "cm00000000000000000000001",
    email: "demo@baydar.ps",
    role: "USER",
    locale: "ar-PS",
  },
  tokens: {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    accessExpiresAt: "2026-05-06T12:15:00.000Z",
    refreshExpiresAt: "2026-06-06T12:00:00.000Z",
  },
};

async function createApp(mocks: {
  auth?: Partial<AuthService>;
  authTokens?: Partial<AuthTokensService>;
  emailThrottle?: Partial<AuthEmailThrottleService>;
}): Promise<INestApplication> {
  const builder = Test.createTestingModule({
    controllers: [AuthController],
    providers: [
      { provide: AuthService, useValue: mocks.auth ?? {} },
      { provide: AuthTokensService, useValue: mocks.authTokens ?? {} },
      { provide: AuthEmailThrottleService, useValue: mocks.emailThrottle ?? { check: jest.fn() } },
    ],
  });
  builder.overrideGuard(JwtAuthGuard).useValue({
    canActivate: (ctx: ExecutionContext): boolean => {
      const req = ctx.switchToHttp().getRequest<Request>();
      Object.assign(req, { user: { id: "user-1", email: "demo@baydar.ps", role: "USER" } });
      return true;
    },
  });
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe("AuthController email verification and password reset", () => {
  it("sets a cross-site refresh cookie behind HTTPS proxies", async () => {
    const auth = { login: jest.fn().mockResolvedValue(authSession) };
    const app = await createApp({ auth });

    try {
      await request(app.getHttpServer())
        .post("/auth/login")
        .set("x-forwarded-proto", "https")
        .send({ email: "demo@baydar.ps", password: "Password1", deviceId: "web-device" })
        .expect(200)
        .expect((res) => {
          const cookie = res.headers["set-cookie"]?.[0] ?? "";
          expect(cookie).toContain("HttpOnly");
          expect(cookie).toContain("SameSite=None");
          expect(cookie).toContain("Secure");
        });
    } finally {
      await app.close();
    }
  });

  it("POST /auth/stream-token returns a scoped one-time token envelope", async () => {
    const authTokens = {
      issueStreamToken: jest.fn().mockResolvedValue({
        token: "stream-token",
        expiresAt: "2026-05-06T12:00:00.000Z",
      }),
    };
    const app = await createApp({ authTokens });

    try {
      await request(app.getHttpServer())
        .post("/auth/stream-token")
        .send({ scope: "messaging" })
        .expect(200)
        .expect({
          data: {
            token: "stream-token",
            expiresAt: "2026-05-06T12:00:00.000Z",
          },
        });
      expect(authTokens.issueStreamToken).toHaveBeenCalledWith("user-1", "messaging");
    } finally {
      await app.close();
    }
  });

  it("POST /auth/stream-token rejects invalid scope", async () => {
    const authTokens = { issueStreamToken: jest.fn() };
    const app = await createApp({ authTokens });

    try {
      await request(app.getHttpServer())
        .post("/auth/stream-token")
        .send({ scope: "feed" })
        .expect(400)
        .expect((res) => {
          expect(res.body.error.code).toBe("VALIDATION_FAILED");
        });
      expect(authTokens.issueStreamToken).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("POST /auth/verify-email/send returns 202 and queues for existing users", async () => {
    const auth = { findUserForEmailToken: jest.fn().mockResolvedValue({ id: "user-1" }) };
    const authTokens = { issueVerifyEmail: jest.fn().mockResolvedValue(undefined) };
    const app = await createApp({ auth, authTokens });

    try {
      await request(app.getHttpServer())
        .post("/auth/verify-email/send")
        .send({ email: "demo@baydar.ps" })
        .expect(202)
        .expect("");
      expect(authTokens.issueVerifyEmail).toHaveBeenCalledWith("user-1", {
        requestedFromIp: expect.any(String),
        requestedFromUa: undefined,
      });
    } finally {
      await app.close();
    }
  });

  it("POST /auth/verify-email/confirm returns verified envelope", async () => {
    const authTokens = { consumeVerifyEmail: jest.fn().mockResolvedValue(undefined) };
    const app = await createApp({ authTokens });

    try {
      await request(app.getHttpServer())
        .post("/auth/verify-email/confirm")
        .send({ token: "a".repeat(64) })
        .expect(200)
        .expect({ data: { emailVerified: true } });
      expect(authTokens.consumeVerifyEmail).toHaveBeenCalledWith("a".repeat(64));
    } finally {
      await app.close();
    }
  });

  it("POST /auth/forgot-password returns 202 for unknown email", async () => {
    const authTokens = { issuePasswordReset: jest.fn().mockResolvedValue(undefined) };
    const app = await createApp({ authTokens });

    try {
      await request(app.getHttpServer())
        .post("/auth/forgot-password")
        .send({ email: "missing@baydar.ps" })
        .expect(202)
        .expect("");
      expect(authTokens.issuePasswordReset).toHaveBeenCalledWith("missing@baydar.ps", {
        requestedFromIp: expect.any(String),
        requestedFromUa: undefined,
      });
    } finally {
      await app.close();
    }
  });

  it("POST /auth/reset-password returns reset envelope", async () => {
    const authTokens = { consumePasswordReset: jest.fn().mockResolvedValue(undefined) };
    const app = await createApp({ authTokens });

    try {
      await request(app.getHttpServer())
        .post("/auth/reset-password")
        .send({ token: "a".repeat(64), newPassword: "NewPassword1" })
        .expect(200)
        .expect({ data: { reset: true } });
      expect(authTokens.consumePasswordReset).toHaveBeenCalledWith("a".repeat(64), "NewPassword1");
    } finally {
      await app.close();
    }
  });

  it("POST /auth/change-password validates and returns 204", async () => {
    const auth = { changePassword: jest.fn().mockResolvedValue(undefined) };
    const app = await createApp({ auth });

    try {
      await request(app.getHttpServer())
        .post("/auth/change-password")
        .send({
          currentPassword: "OldPassword1",
          newPassword: "NewPassword1",
          deviceId: "device-1",
        })
        .expect(204)
        .expect("");
      expect(auth.changePassword).toHaveBeenCalledWith("user-1", {
        currentPassword: "OldPassword1",
        newPassword: "NewPassword1",
        deviceId: "device-1",
      });
    } finally {
      await app.close();
    }
  });

  it("GET /auth/sessions returns active sessions", async () => {
    const sessions = [
      {
        id: "device-1",
        device: "Chrome",
        lastActiveAt: "2026-06-14T10:00:00.000Z",
      },
    ];
    const auth = { listSessions: jest.fn().mockResolvedValue(sessions) };
    const app = await createApp({ auth });

    try {
      await request(app.getHttpServer()).get("/auth/sessions").expect(200).expect({
        data: sessions,
      });
      expect(auth.listSessions).toHaveBeenCalledWith("user-1");
    } finally {
      await app.close();
    }
  });

  it("DELETE /auth/sessions/others revokes every other device", async () => {
    const auth = { logoutOthers: jest.fn().mockResolvedValue(undefined) };
    const app = await createApp({ auth });

    try {
      await request(app.getHttpServer())
        .delete("/auth/sessions/others")
        .send({ deviceId: "device-1" })
        .expect(204)
        .expect("");
      expect(auth.logoutOthers).toHaveBeenCalledWith("user-1", "device-1");
    } finally {
      await app.close();
    }
  });

  it("DELETE /auth/sessions/:deviceId revokes one device", async () => {
    const auth = { logout: jest.fn().mockResolvedValue(undefined) };
    const app = await createApp({ auth });

    try {
      await request(app.getHttpServer()).delete("/auth/sessions/device-2").expect(204).expect("");
      expect(auth.logout).toHaveBeenCalledWith("user-1", "device-2");
    } finally {
      await app.close();
    }
  });
});
