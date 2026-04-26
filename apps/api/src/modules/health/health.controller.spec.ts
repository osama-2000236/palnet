import { Test } from "@nestjs/testing";
import Redis from "ioredis";

import { PrismaService } from "../prisma/prisma.service";

import { HealthController } from "./health.controller";

jest.mock("ioredis", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    ping: jest.fn().mockResolvedValue("PONG"),
    disconnect: jest.fn(),
  })),
}));

describe("HealthController", () => {
  let controller: HealthController;
  let prisma: { $queryRaw: jest.Mock };
  const RedisMock = Redis as unknown as jest.Mock;

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]) };
    const mod = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = mod.get(HealthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.REDIS_URL;
  });

  it("returns status=ok", () => {
    const res = controller.check();
    expect(res.data.status).toBe("ok");
    expect(typeof res.data.uptimeMs).toBe("number");
    expect(res.data.uptimeMs).toBeGreaterThanOrEqual(0);
  });

  it("returns ready when the database and redis respond", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";

    await expect(controller.ready()).resolves.toEqual({ data: { status: "ready" } });
    const redis = RedisMock.mock.results[0]?.value as {
      ping: jest.Mock;
      disconnect: jest.Mock;
    };
    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(RedisMock).toHaveBeenCalledTimes(1);
    expect(redis.ping).toHaveBeenCalledTimes(1);
    expect(redis.disconnect).not.toHaveBeenCalled();

    controller.onModuleDestroy();
    expect(redis.disconnect).toHaveBeenCalledTimes(1);
  });

  it("reuses one Redis client across readiness checks", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";

    for (let i = 0; i < 5; i += 1) {
      await expect(controller.ready()).resolves.toEqual({ data: { status: "ready" } });
    }

    const redis = RedisMock.mock.results[0]?.value as { ping: jest.Mock };
    expect(RedisMock).toHaveBeenCalledTimes(1);
    expect(redis.ping).toHaveBeenCalledTimes(5);
  });

  it("returns 503 when the database check fails", async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error("db down"));

    await expect(controller.ready()).rejects.toMatchObject({
      response: {
        error: {
          code: "NOT_READY",
        },
      },
      status: 503,
    });
  });
});
