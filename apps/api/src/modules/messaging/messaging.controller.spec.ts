import { ErrorCode } from "@baydar/shared";
import type { ExecutionContext, HttpException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

import type { Env } from "../../config/env";
import type { AuthTokensService, StreamTokenUser } from "../auth/auth-tokens.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

import type { MessagingBus } from "./messaging.bus";
import { MessagingController } from "./messaging.controller";
import type { MessagingService } from "./messaging.service";

describe("MessagingController stream auth", () => {
  const user: StreamTokenUser = {
    id: "user-1",
    email: "demo@baydar.ps",
    role: "USER",
    locale: "ar-PS",
  };

  it("rejects legacy ?access_token= on /messaging/stream", async () => {
    const authTokens = { consumeStreamToken: jest.fn() };
    const guard = buildGuard(authTokens);
    const req = buildRequest("/messaging/stream", { access_token: "legacy-jwt" });

    await expectHttpError(
      guard.canActivate(contextFor(req, MessagingController.prototype.stream, MessagingController)),
      ErrorCode.AUTH_UNAUTHORIZED,
    );
    expect(authTokens.consumeStreamToken).not.toHaveBeenCalled();
  });

  it("accepts one-time ?token= on /messaging/stream", async () => {
    const authTokens = { consumeStreamToken: jest.fn().mockResolvedValue(user) };
    const guard = buildGuard(authTokens);
    const req = buildRequest("/messaging/stream", { token: "stream-token" });

    await expect(
      guard.canActivate(contextFor(req, MessagingController.prototype.stream, MessagingController)),
    ).resolves.toBe(true);
    expect(authTokens.consumeStreamToken).toHaveBeenCalledWith("stream-token", "messaging");
    expect(req.user).toEqual(user);

    const unsubscribe = jest.fn();
    const bus = { subscribe: jest.fn().mockReturnValue(unsubscribe) };
    const controller = new MessagingController(
      {} as MessagingService,
      bus as unknown as MessagingBus,
    );
    const sub = controller.stream(user).subscribe();
    expect(bus.subscribe).toHaveBeenCalledWith("user-1", expect.any(Function));
    sub.unsubscribe();
    expect(unsubscribe).toHaveBeenCalled();
  });
});

function buildGuard(authTokens: Partial<AuthTokensService>): JwtAuthGuard {
  return new JwtAuthGuard(
    new Reflector(),
    { getOrThrow: jest.fn() } as unknown as ConfigService<Env, true>,
    authTokens as AuthTokensService,
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
