import { ErrorCode } from "@baydar/shared";
import { Test } from "@nestjs/testing";

import { KaramaService } from "../karama/karama.service";
import { PrismaService } from "../prisma/prisma.service";

import { AdminModerationService } from "./admin-moderation.service";

interface TxStub {
  moderationAction: { create: jest.Mock };
  user: { update: jest.Mock; delete: jest.Mock };
  report: { update: jest.Mock };
}

type PrismaStub = {
  report: { findMany: jest.Mock; findUnique: jest.Mock };
  $transaction: jest.Mock;
};

function buildTx(): TxStub {
  return {
    moderationAction: { create: jest.fn() },
    user: { update: jest.fn(), delete: jest.fn() },
    report: { update: jest.fn() },
  };
}

describe("AdminModerationService", () => {
  let service: AdminModerationService;
  let prisma: PrismaStub;
  let karama: { award: jest.Mock };
  let tx: TxStub;

  beforeEach(async () => {
    tx = buildTx();
    prisma = {
      report: { findMany: jest.fn(), findUnique: jest.fn() },
      $transaction: jest.fn(async (fn: (t: TxStub) => Promise<unknown>) => fn(tx)),
    };
    karama = { award: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminModerationService,
        { provide: PrismaService, useValue: prisma },
        { provide: KaramaService, useValue: karama },
      ],
    }).compile();
    service = moduleRef.get(AdminModerationService);
  });

  describe("listReports", () => {
    it("filters open reports by resolvedAt null", async () => {
      prisma.report.findMany.mockResolvedValue([]);
      await service.listReports("open", 50);
      expect(prisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { resolvedAt: null } }),
      );
    });

    it("filters resolved reports by resolvedAt not null", async () => {
      prisma.report.findMany.mockResolvedValue([]);
      await service.listReports("resolved", 50);
      expect(prisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { resolvedAt: { not: null } } }),
      );
    });

    it("caps the take at 100", async () => {
      prisma.report.findMany.mockResolvedValue([]);
      await service.listReports("all", 9999);
      expect(prisma.report.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
    });
  });

  describe("getReport", () => {
    it("404s when the report does not exist", async () => {
      prisma.report.findUnique.mockResolvedValue(null);
      await expect(service.getReport("r_missing")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  describe("act", () => {
    it("SUSPEND deactivates the target user via the transaction", async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: "r_1",
        reporterId: "u_reporter",
        targetUserId: "u_bad",
        resolvedAt: null,
      });

      await service.act({
        actorId: "u_admin",
        reportId: "r_1",
        action: "SUSPEND",
      });

      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: "u_bad" },
        data: { isActive: false },
      });
      expect(tx.user.delete).not.toHaveBeenCalled();
    });

    it("HARD_DELETE removes the target user", async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: "r_1",
        reporterId: "u_reporter",
        targetUserId: "u_bad",
        resolvedAt: null,
      });

      await service.act({
        actorId: "u_admin",
        reportId: "r_1",
        action: "HARD_DELETE",
      });

      expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: "u_bad" } });
    });

    it("awards REPORT_UPHELD Karama for any non-DISMISS action", async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: "r_1",
        reporterId: "u_reporter",
        targetUserId: null,
        resolvedAt: null,
      });

      await service.act({ actorId: "u_admin", reportId: "r_1", action: "WARN" });

      expect(karama.award).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "u_reporter", reason: "REPORT_UPHELD" }),
      );
    });

    it("does not award Karama on DISMISS to avoid encouraging false reports", async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: "r_1",
        reporterId: "u_reporter",
        targetUserId: null,
        resolvedAt: null,
      });

      await service.act({ actorId: "u_admin", reportId: "r_1", action: "DISMISS" });

      expect(karama.award).not.toHaveBeenCalled();
    });

    it("stamps resolvedAt + resolvedNote with the action label", async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: "r_1",
        reporterId: "u_reporter",
        targetUserId: null,
        resolvedAt: null,
      });

      await service.act({
        actorId: "u_admin",
        reportId: "r_1",
        action: "WARN",
        note: "stop posting spam",
      });

      expect(tx.report.update).toHaveBeenCalledWith({
        where: { id: "r_1" },
        data: expect.objectContaining({
          resolvedAt: expect.any(Date),
          resolvedNote: "WARN: stop posting spam",
        }),
      });
    });
  });
});
