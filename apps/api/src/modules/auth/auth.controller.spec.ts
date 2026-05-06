import type { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Request } from "express";
import request from "supertest";

import { AuthEmailThrottleService } from "./auth-email-throttle.service";
import { AuthTokensService } from "./auth-tokens.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

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
});
