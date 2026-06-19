import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";

import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let controller: HealthController;
  const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ ok: 1 }]) };

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = mod.get(HealthController);
  });

  it("returns status=ok", () => {
    const res = controller.check();
    expect(res.data.status).toBe("ok");
    expect(typeof res.data.uptimeMs).toBe("number");
    expect(res.data.uptimeMs).toBeGreaterThanOrEqual(0);
  });

  it("returns ready when the database responds", async () => {
    await expect(controller.ready()).resolves.toEqual({
      data: { status: "ready", database: "ok" },
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
