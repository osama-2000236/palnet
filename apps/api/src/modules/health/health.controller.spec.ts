import { Test } from "@nestjs/testing";
import Redis from "ioredis";

import { PrismaService } from "../prisma/prisma.service";

import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let controller: HealthController;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]) };
    const mod = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = mod.get(HealthController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.REDIS_URL;
  });

  it("returns status=ok", () => {
    const res = controller.check();
    expect(res.data.status).toBe("ok");
    expect(typeof res.data.uptimeMs).toBe("number");
    expect(res.data.uptimeMs).toBeGreaterThanOrEqual(0);
  });

  it("returns ready when the database and redis respond", async () => {
    const ping = jest.spyOn(Redis.prototype, "ping").mockResolvedValue("PONG");
    const disconnect = jest.spyOn(Redis.prototype, "disconnect").mockReturnValue(undefined);
    process.env.REDIS_URL = "redis://localhost:6379";

    await expect(controller.ready()).resolves.toEqual({ data: { status: "ready" } });
    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(ping).toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalled();
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
