import { ErrorCode } from "@baydar/shared";
import {
  HttpStatus,
  type ExecutionContext,
  type HttpException,
  type INestApplication,
} from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import type { NextFunction, Request, Response } from "express";
import request from "supertest";

import { AllExceptionsFilter } from "../../common/exception.filter";
import { DomainException } from "../../common/domain-exception";
import type { Env } from "../../config/env";
import type { AuthUser } from "../auth/decorators/current-user.decorator";
import type { AuthTokensService, StreamTokenUser } from "../auth/auth-tokens.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

import { NotificationsBus } from "./notifications.bus";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

const authUser: AuthUser = {
  id: "user-1",
  email: "demo@baydar.ps",
  role: "USER",
  locale: "ar-PS",
};

describe("NotificationsController stream auth", () => {
  const user: StreamTokenUser = authUser;

  it("rejects legacy ?access_token= on /notifications/stream", async () => {
    const authTokens = { consumeStreamToken: jest.fn() };
    const guard = buildGuard(authTokens);
    const req = buildRequest("/notifications/stream", { access_token: "legacy-jwt" });

    await expectHttpError(
      guard.canActivate(
        contextFor(req, NotificationsController.prototype.stream, NotificationsController),
      ),
      ErrorCode.AUTH_UNAUTHORIZED,
    );
    expect(authTokens.consumeStreamToken).not.toHaveBeenCalled();
  });

  it("accepts one-time ?token= on /notifications/stream", async () => {
    const authTokens = { consumeStreamToken: jest.fn().mockResolvedValue(user) };
    const guard = buildGuard(authTokens);
    const req = buildRequest("/notifications/stream", { token: "stream-token" });

    await expect(
      guard.canActivate(
        contextFor(req, NotificationsController.prototype.stream, NotificationsController),
      ),
    ).resolves.toBe(true);
    expect(authTokens.consumeStreamToken).toHaveBeenCalledWith("stream-token", "notifications");
    expect(req.user).toEqual(user);

    const unsubscribe = jest.fn();
    const bus = { subscribe: jest.fn().mockReturnValue(unsubscribe) };
    const controller = new NotificationsController(
      {} as NotificationsService,
      bus as unknown as NotificationsBus,
    );
    const sub = controller.stream(user).subscribe();
    expect(bus.subscribe).toHaveBeenCalledWith("user-1", expect.any(Function));
    sub.unsubscribe();
    expect(unsubscribe).toHaveBeenCalled();
  });
});

describe("NotificationsController dismiss", () => {
  async function createApp(
    notifications: Partial<NotificationsService>,
  ): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: notifications },
        { provide: NotificationsBus, useValue: { subscribe: jest.fn() } },
      ],
    }).compile();
    const app = moduleRef.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    app.use((req: Request & { user?: AuthUser }, _res: Response, next: NextFunction) => {
      req.user = authUser;
      next();
    });
    await app.init();
    return app;
  }

  it("returns 204 when the service dismisses the owned notification", async () => {
    const notifications = { dismiss: jest.fn().mockResolvedValue(undefined) };
    const app = await createApp(notifications as Partial<NotificationsService>);

    try {
      await request(app.getHttpServer()).delete("/notifications/n_1").expect(204).expect("");
      expect(notifications.dismiss).toHaveBeenCalledWith("user-1", "n_1");
    } finally {
      await app.close();
    }
  });

  it("returns 404 when the notification does not exist or is not owned by the viewer", async () => {
    const notifications = {
      dismiss: jest
        .fn()
        .mockRejectedValue(
          new DomainException(ErrorCode.NOT_FOUND, "Notification not found.", HttpStatus.NOT_FOUND),
        ),
    };
    const app = await createApp(notifications as Partial<NotificationsService>);

    try {
      await request(app.getHttpServer())
        .delete("/notifications/missing")
        .expect(404)
        .expect((res) => {
          expect(res.body.error.code).toBe(ErrorCode.NOT_FOUND);
        });
      expect(notifications.dismiss).toHaveBeenCalledWith("user-1", "missing");
    } finally {
      await app.close();
    }
  });
});

function buildGuard(authTokens: Partial<AuthTokensService>): JwtAuthGuard {
  return new JwtAuthGuard(
    new Reflector(),
    { getOrThrow: jest.fn() } as unknown as ConfigService<Env, true>,
    authTokens as AuthTokensService,
    { touch: jest.fn() } as unknown as import("../auth/last-seen.tracker").LastSeenTracker,
  );
}

function buildRequest(path: string, query: Record<string, string>): Request & { user?: unknown } {
  return {
    path,
    url: path,
    originalUrl: path,
    query,
    headers: {},
  } as unknown as Request & { user?: unknown };
}

function contextFor(
  req: Request,
  handler: ReturnType<ExecutionContext["getHandler"]>,
  classRef: ReturnType<ExecutionContext["getClass"]>,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => classRef,
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({}),
    }),
  } as unknown as ExecutionContext;
}

async function expectHttpError(promise: Promise<unknown>, code: ErrorCode): Promise<void> {
  try {
    await promise;
    throw new Error("Expected HTTP error");
  } catch (error) {
    const http = error as HttpException;
    expect(http.getStatus()).toBe(401);
    expect(http.getResponse()).toMatchObject({ error: { code } });
  }
}
