import { ErrorCode, ReportReason } from "@baydar/shared";
import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";

import { SafetyService } from "./safety.service";

type PrismaStub = {
  blockedUser: {
    findUnique: jest.Mock;
    create: jest.Mock;
    deleteMany: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
  report: { create: jest.Mock };
  post: { findUnique: jest.Mock };
  comment: { findUnique: jest.Mock };
  message: { findUnique: jest.Mock };
};

function buildPrisma(): PrismaStub {
  return {
    blockedUser: {
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    report: { create: jest.fn() },
    post: { findUnique: jest.fn() },
    comment: { findUnique: jest.fn() },
    message: { findUnique: jest.fn() },
  };
}

describe("SafetyService", () => {
  let service: SafetyService;
  let prisma: PrismaStub;

  beforeEach(async () => {
    prisma = buildPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [SafetyService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(SafetyService);
  });

  it("block is idempotent and returns an existing row", async () => {
    const createdAt = new Date("2026-05-05T00:00:00Z");
    prisma.blockedUser.findUnique.mockResolvedValue({
      id: "block_1",
      blockerId: "user_1",
      blockedId: "user_2",
      createdAt,
    });

    await expect(service.block("user_1", "user_2")).resolves.toEqual({
      id: "block_1",
      blockedUserId: "user_2",
      createdAt,
    });
    expect(prisma.blockedUser.create).not.toHaveBeenCalled();
  });

  it("unblock is idempotent", async () => {
    prisma.blockedUser.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.unblock("user_1", "user_2")).resolves.toBeUndefined();
    expect(prisma.blockedUser.deleteMany).toHaveBeenCalledWith({
      where: { blockerId: "user_1", blockedId: "user_2" },
    });
  });

  it("rejects self-block", async () => {
    await expect(service.block("user_1", "user_1")).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_FAILED,
    });
  });

  it("lists blocked users with cursor metadata", async () => {
    prisma.blockedUser.findMany.mockResolvedValue([
      {
        id: "block_2",
        blockedId: "user_2",
        createdAt: new Date("2026-05-05T00:00:00Z"),
        blocked: {
          profile: {
            handle: "blocked",
            firstName: "Blocked",
            lastName: "User",
            avatarUrl: null,
          },
        },
      },
      {
        id: "block_3",
        blockedId: "user_3",
        createdAt: new Date("2026-05-04T00:00:00Z"),
        blocked: { profile: null },
      },
    ]);

    const page = await service.listBlocked("user_1", null, 1);
    expect(page.data).toHaveLength(1);
    expect(page.data[0]).toMatchObject({
      id: "block_2",
      blockedUserId: "user_2",
      blockedHandle: "blocked",
      blockedDisplayName: "Blocked User",
    });
    expect(page.meta).toEqual({ nextCursor: "block_2", hasMore: true, limit: 1 });
  });

  it("rejects reports without a target before writing", async () => {
    await expect(
      service.report("user_1", { reason: ReportReason.SPAM } as never),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
    expect(prisma.report.create).not.toHaveBeenCalled();
  });

  it("rejects direct self-report", async () => {
    await expect(
      service.report("user_1", { reason: ReportReason.SPAM, targetUserId: "user_1" }),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
    expect(prisma.report.create).not.toHaveBeenCalled();
  });

  it("creates a valid report", async () => {
    const createdAt = new Date("2026-05-05T00:00:00Z");
    prisma.report.create.mockResolvedValue({ id: "report_1", createdAt });
    await expect(
      service.report("user_1", {
        reason: ReportReason.HARASSMENT,
        details: "abuse",
        targetUserId: "user_2",
      }),
    ).resolves.toEqual({ id: "report_1", createdAt });
  });

  it("isBlockedEither returns the truth table for both directions", async () => {
    prisma.blockedUser.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);

    await expect(service.isBlockedEither("user_1", "user_2")).resolves.toBe(false);
    await expect(service.isBlockedEither("user_2", "user_1")).resolves.toBe(true);
    await expect(service.isBlockedEither("user_1", "user_1")).resolves.toBe(false);
  });

  it("builds bidirectional block sets", async () => {
    prisma.blockedUser.findMany.mockResolvedValue([
      { blockerId: "user_1", blockedId: "user_2" },
      { blockerId: "user_3", blockedId: "user_1" },
    ]);

    const set = await service.getBlockSet("user_1");
    expect([...set.blocking]).toEqual(["user_2"]);
    expect([...set.blockedBy]).toEqual(["user_3"]);
  });
});
