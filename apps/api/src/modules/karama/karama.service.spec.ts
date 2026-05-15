import { ErrorCode } from "@baydar/shared";
import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";

import { KaramaService, KARAMA_BALANCE_CAP } from "./karama.service";

type PrismaStub = {
  user: { findUnique: jest.Mock; findMany: jest.Mock; update: jest.Mock };
  karamaLedger: { findFirst: jest.Mock; findMany: jest.Mock; create: jest.Mock };
  $transaction: jest.Mock;
};

function buildPrisma(): PrismaStub {
  return {
    user: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    karamaLedger: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(async (fn) => fn({} as never)),
  };
}

describe("KaramaService", () => {
  let service: KaramaService;
  let prisma: PrismaStub;
  let tx: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    karamaLedger: { create: jest.Mock };
  };

  beforeEach(async () => {
    prisma = buildPrisma();
    tx = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      karamaLedger: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (fn) => fn(tx as never));
    const moduleRef = await Test.createTestingModule({
      providers: [
        KaramaService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(KaramaService);
  });

  it("awards positive Karama for VERIFIED_HIRE and writes a ledger row", async () => {
    tx.user.findUnique.mockResolvedValue({ karamaBalance: 100 });
    tx.user.update.mockResolvedValue({ karamaBalance: 300 });
    tx.karamaLedger.create.mockResolvedValue({ createdAt: new Date() });

    await service.award({ userId: "user-1", reason: "VERIFIED_HIRE" });

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { karamaBalance: 300 },
      select: { karamaBalance: true },
    });
    expect(tx.karamaLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        delta: 200,
        balanceAfter: 300,
        reason: "VERIFIED_HIRE",
      }),
    });
  });

  it("clamps awards that would exceed the cap", async () => {
    tx.user.findUnique.mockResolvedValue({ karamaBalance: KARAMA_BALANCE_CAP - 10 });
    tx.user.update.mockResolvedValue({ karamaBalance: KARAMA_BALANCE_CAP });
    tx.karamaLedger.create.mockResolvedValue({ createdAt: new Date() });

    await service.award({ userId: "user-1", reason: "VERIFIED_HIRE" });

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { karamaBalance: KARAMA_BALANCE_CAP },
      select: { karamaBalance: true },
    });
    expect(tx.karamaLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ delta: 10, balanceAfter: KARAMA_BALANCE_CAP }),
    });
  });

  it("rejects redemption when balance is insufficient", async () => {
    prisma.karamaLedger.findFirst.mockResolvedValue(null);
    tx.user.findUnique.mockResolvedValue({ karamaBalance: 40 });

    await expect(
      service.redeem("user-1", {
        reward: "BOOST_APPLICATION",
        idempotencyKey: "k".repeat(16),
      }),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it("redeems boost and writes a negative-delta ledger row", async () => {
    prisma.karamaLedger.findFirst.mockResolvedValue(null);
    tx.user.findUnique.mockResolvedValue({ karamaBalance: 300 });
    tx.user.update.mockResolvedValue({ karamaBalance: 200 });
    tx.karamaLedger.create.mockResolvedValue({ createdAt: new Date("2026-05-15T00:00:00Z") });

    const result = await service.redeem("user-1", {
      reward: "BOOST_APPLICATION",
      idempotencyKey: "key1".padEnd(16, "0"),
    });

    expect(result.balance).toBe(200);
    expect(result.reward).toBe("BOOST_APPLICATION");
    expect(tx.karamaLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        delta: -100,
        balanceAfter: 200,
        reason: "REDEEM_BOOST_APPLICATION",
        refType: "REDEEM",
      }),
    });
  });

  it("returns the original outcome on idempotent replay of a redemption", async () => {
    const previous = {
      id: "led-1",
      createdAt: new Date("2026-05-15T00:00:00Z"),
      balanceAfter: 200,
    };
    prisma.karamaLedger.findFirst.mockResolvedValue(previous);

    const result = await service.redeem("user-1", {
      reward: "BOOST_APPLICATION",
      idempotencyKey: "key1".padEnd(16, "0"),
    });

    expect(result.balance).toBe(200);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it("decays inactive balances once for the current UTC month", async () => {
    prisma.user.findMany.mockResolvedValue([{ id: "user-1", karamaBalance: 300 }]);
    prisma.karamaLedger.findFirst.mockResolvedValue(null);
    tx.user.findUnique.mockResolvedValue({ karamaBalance: 300 });
    tx.user.update.mockResolvedValue({ karamaBalance: 297 });
    tx.karamaLedger.create.mockResolvedValue({ createdAt: new Date("2026-05-15T03:00:00Z") });

    const result = await service.runMonthlyDecay({
      now: new Date("2026-05-15T03:00:00Z"),
    });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        karamaBalance: { gt: 0 },
        OR: [
          { lastSeenAt: { lt: new Date("2026-03-16T03:00:00Z") } },
          { lastSeenAt: null, createdAt: { lt: new Date("2026-03-16T03:00:00Z") } },
        ],
      },
      orderBy: { id: "asc" },
      select: { id: true, karamaBalance: true },
    });
    expect(prisma.karamaLedger.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        reason: "DECAY",
        refType: "monthly-inactivity-decay",
        refId: "2026-05",
      },
      select: { id: true },
    });
    expect(tx.karamaLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        delta: -3,
        balanceAfter: 297,
        reason: "DECAY",
        refType: "monthly-inactivity-decay",
        refId: "2026-05",
      }),
    });
    expect(result).toMatchObject({
      period: "2026-05",
      dryRun: false,
      scannedCount: 1,
      decayedCount: 1,
      skippedAlreadyDecayedCount: 0,
      totalDelta: -3,
      decayedUserIds: ["user-1"],
    });
  });

  it("skips users who already received decay for the month", async () => {
    prisma.user.findMany.mockResolvedValue([{ id: "user-1", karamaBalance: 300 }]);
    prisma.karamaLedger.findFirst.mockResolvedValue({ id: "ledger-1" });

    const result = await service.runMonthlyDecay({
      now: new Date("2026-05-15T03:00:00Z"),
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(result.decayedCount).toBe(0);
    expect(result.skippedAlreadyDecayedCount).toBe(1);
  });

  it("reports dry-run decay without writing the ledger", async () => {
    prisma.user.findMany.mockResolvedValue([{ id: "user-1", karamaBalance: 50 }]);
    prisma.karamaLedger.findFirst.mockResolvedValue(null);

    const result = await service.runMonthlyDecay({
      now: new Date("2026-05-15T03:00:00Z"),
      dryRun: true,
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      dryRun: true,
      decayedCount: 1,
      totalDelta: -1,
      decayedUserIds: ["user-1"],
    });
  });
});
