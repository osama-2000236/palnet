import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";

import { RESTORE_GRACE_MS } from "./account-retention";
import { AccountRetentionService } from "./account-retention.service";

type PrismaStub = {
  user: {
    findMany: jest.Mock;
    deleteMany: jest.Mock;
  };
};

function buildPrisma(): PrismaStub {
  return {
    user: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

describe("AccountRetentionService", () => {
  let service: AccountRetentionService;
  let prisma: PrismaStub;

  beforeEach(async () => {
    prisma = buildPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [AccountRetentionService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AccountRetentionService);
  });

  it("returns zero-deleted report when no expired soft-deletes exist", async () => {
    prisma.user.findMany.mockResolvedValue([]);

    const now = new Date("2026-05-15T03:00:00.000Z");
    const result = await service.runRetention({ now });

    expect(result.deletedCount).toBe(0);
    expect(result.deletedUserIds).toEqual([]);
    expect(result.dryRun).toBe(false);
    expect(prisma.user.deleteMany).not.toHaveBeenCalled();
  });

  it("hard-deletes users whose grace period has expired", async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: "user-a", deletedAt: new Date("2026-04-01T00:00:00.000Z") },
      { id: "user-b", deletedAt: new Date("2026-03-15T00:00:00.000Z") },
    ]);
    prisma.user.deleteMany.mockResolvedValue({ count: 2 });

    const now = new Date("2026-05-15T03:00:00.000Z");
    const result = await service.runRetention({ now });

    const cutoff = new Date(now.getTime() - RESTORE_GRACE_MS);
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { deletedAt: { lt: cutoff } },
      select: { id: true, deletedAt: true },
    });
    expect(prisma.user.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["user-a", "user-b"] } },
    });
    expect(result.deletedCount).toBe(2);
    expect(result.deletedUserIds).toEqual(["user-a", "user-b"]);
    expect(result.dryRun).toBe(false);
    expect(result.cutoff).toBe(cutoff.toISOString());
  });

  it("dry run reports eligible users without deleting any rows", async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: "user-a", deletedAt: new Date("2026-04-01T00:00:00.000Z") },
    ]);

    const now = new Date("2026-05-15T03:00:00.000Z");
    const result = await service.runRetention({ now, dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.deletedCount).toBe(1);
    expect(result.deletedUserIds).toEqual(["user-a"]);
    expect(prisma.user.deleteMany).not.toHaveBeenCalled();
  });

  it("dry run with no candidates reports dryRun true and deletes nothing", async () => {
    prisma.user.findMany.mockResolvedValue([]);

    const result = await service.runRetention({ dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.deletedCount).toBe(0);
    expect(prisma.user.deleteMany).not.toHaveBeenCalled();
  });
});
