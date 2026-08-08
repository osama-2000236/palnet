import { Prisma } from "@baydar/db";
import { CallHandler, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { firstValueFrom, of, throwError } from "rxjs";

import { PrismaService } from "../modules/prisma/prisma.service";

import { DomainException } from "./domain-exception";
import { IdempotencyInterceptor } from "./idempotency.interceptor";

/**
 * The point of this interceptor is a member on 2G whose 40-second POST dies at
 * 38 seconds and whose outbox retries. Every case below is that member.
 */

const USER = "ckuser000000000000000001";
const ROUTE = "POST /posts";

function contextFor(options: {
  idempotent?: boolean;
  key?: string;
  userId?: string | undefined;
  statusCode?: number;
}) {
  const response = { statusCode: options.statusCode ?? 201, status: jest.fn() };
  const request = {
    headers: options.key ? { "idempotency-key": options.key } : {},
    method: "POST",
    route: { path: "/posts" },
    url: "/posts",
    user: options.userId === undefined ? { id: USER } : { id: options.userId },
  };
  const context = {
    getHandler: () => jest.fn(),
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
  } as unknown as ExecutionContext;
  return { context, response };
}

function build(options: { idempotent?: boolean } = {}) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(options.idempotent ?? true),
  } as unknown as Reflector;
  const prisma = {
    idempotencyRecord: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
    },
  };
  const interceptor = new IdempotencyInterceptor(reflector, prisma as unknown as PrismaService);
  return { interceptor, prisma, reflector };
}

const handlerReturning = (body: unknown): CallHandler => ({ handle: () => of(body) });

describe("the first request", () => {
  it("runs the handler and stores the response", async () => {
    const { interceptor, prisma } = build();
    const { context } = contextFor({ key: "k-1" });

    const out = await firstValueFrom(
      interceptor.intercept(context, handlerReturning({ data: { id: "p1" } })),
    );

    expect(out).toEqual({ data: { id: "p1" } });
    expect(prisma.idempotencyRecord.create).toHaveBeenCalledTimes(1);
    const stored = prisma.idempotencyRecord.create.mock.calls[0]![0].data;
    expect(stored).toMatchObject({ userId: USER, key: "k-1", route: ROUTE, statusCode: 201 });
    // 48 hours, give or take the time this test takes to run.
    expect(stored.expiresAt.getTime() - Date.now()).toBeGreaterThan(47 * 60 * 60 * 1000);
    expect(stored.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(48 * 60 * 60 * 1000);
  });
});

describe("the retry", () => {
  it("returns the stored body without running the handler again", async () => {
    const { interceptor, prisma } = build();
    prisma.idempotencyRecord.findUnique.mockResolvedValue({
      route: ROUTE,
      statusCode: 201,
      responseBody: { data: { id: "p1" } },
      expiresAt: new Date(Date.now() + 60_000),
    });
    const { context } = contextFor({ key: "k-1" });
    const handle = jest.fn(() => of({ data: { id: "SECOND-POST" } }));

    const out = await firstValueFrom(interceptor.intercept(context, { handle }));

    // The whole feature: one post, not two.
    expect(out).toEqual({ data: { id: "p1" } });
    expect(handle).not.toHaveBeenCalled();
    expect(prisma.idempotencyRecord.create).not.toHaveBeenCalled();
  });

  it("restores the original status, not just the body", async () => {
    // A create that answered 201 must answer 201 again, or a client branching
    // on the status treats its own retry as something new.
    const { interceptor, prisma } = build();
    prisma.idempotencyRecord.findUnique.mockResolvedValue({
      route: ROUTE,
      statusCode: 201,
      responseBody: { data: { id: "p1" } },
      expiresAt: new Date(Date.now() + 60_000),
    });
    const { context, response } = contextFor({ key: "k-1", statusCode: 200 });

    await firstValueFrom(interceptor.intercept(context, handlerReturning({})));

    expect(response.status).toHaveBeenCalledWith(201);
  });

  it("runs again once the record has expired", async () => {
    const { interceptor, prisma } = build();
    prisma.idempotencyRecord.findUnique.mockResolvedValue({
      route: ROUTE,
      statusCode: 201,
      responseBody: { data: { id: "old" } },
      expiresAt: new Date(Date.now() - 1),
    });
    const { context } = contextFor({ key: "k-1" });

    const out = await firstValueFrom(
      interceptor.intercept(context, handlerReturning({ fresh: 1 })),
    );

    expect(out).toEqual({ fresh: 1 });
  });

  it("refuses a key already used for a different operation", async () => {
    const { interceptor, prisma } = build();
    prisma.idempotencyRecord.findUnique.mockResolvedValue({
      route: "POST /jobs/:id/apply",
      statusCode: 201,
      responseBody: { data: { id: "application-1" } },
      expiresAt: new Date(Date.now() + 60_000),
    });
    const { context } = contextFor({ key: "k-1" });

    // Answering with the application would hand back another request's data.
    await expect(
      firstValueFrom(interceptor.intercept(context, handlerReturning({}))),
    ).rejects.toBeInstanceOf(DomainException);
  });

  it("treats two racing retries as one, not as an error", async () => {
    const { interceptor, prisma } = build();
    prisma.idempotencyRecord.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "6",
      }),
    );
    const { context } = contextFor({ key: "k-1" });

    // The row exists because the other retry won. Both callers hold a correct
    // response; raising here would turn a success into a 500.
    await expect(
      firstValueFrom(interceptor.intercept(context, handlerReturning({ ok: true }))),
    ).resolves.toEqual({ ok: true });
  });
});

describe("what it does not touch", () => {
  it("stays out of the way when the handler is not marked", async () => {
    const { interceptor, prisma } = build({ idempotent: false });
    const { context } = contextFor({ key: "k-1" });

    await firstValueFrom(interceptor.intercept(context, handlerReturning({ ok: true })));

    expect(prisma.idempotencyRecord.findUnique).not.toHaveBeenCalled();
  });

  it("stays out of the way when the client sends no key", async () => {
    // Optional by design: requiring it would break every existing caller for a
    // guarantee they never asked for.
    const { interceptor, prisma } = build();
    const { context } = contextFor({});

    await firstValueFrom(interceptor.intercept(context, handlerReturning({ ok: true })));

    expect(prisma.idempotencyRecord.findUnique).not.toHaveBeenCalled();
    expect(prisma.idempotencyRecord.create).not.toHaveBeenCalled();
  });

  it("rejects a key long enough to be a payload", async () => {
    const { interceptor } = build();
    const { context } = contextFor({ key: "x".repeat(201) });

    expect(() => interceptor.intercept(context, handlerReturning({}))).toThrow(DomainException);
  });

  it("does not store a failure", async () => {
    // A 4xx is a write that did not happen. Pinning it for 48 hours would mean
    // a client that fixed its request still got the old error back.
    const { interceptor, prisma } = build();
    const { context } = contextFor({ key: "k-1" });

    await firstValueFrom(
      interceptor.intercept(context, { handle: () => throwError(() => new Error("boom")) }),
    ).catch(() => undefined);

    expect(prisma.idempotencyRecord.create).not.toHaveBeenCalled();
  });
});
