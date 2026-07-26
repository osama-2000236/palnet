import { ErrorCode } from "@baydar/shared";
import { Test } from "@nestjs/testing";

import { DomainException } from "../../common/domain-exception";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { SafetyService } from "../safety/safety.service";

import { ConnectionsService } from "./connections.service";

type PrismaStub = {
  user: { findUnique: jest.Mock };
  profile: { findMany: jest.Mock };
  connection: {
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
};

function buildPrisma(): PrismaStub {
  return {
    user: { findUnique: jest.fn() },
    profile: { findMany: jest.fn() },
    connection: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };
}

describe("ConnectionsService", () => {
  let service: ConnectionsService;
  let prisma: PrismaStub;
  let safety: { getBlockedEitherIds: jest.Mock };

  beforeEach(async () => {
    prisma = buildPrisma();
    safety = { getBlockedEitherIds: jest.fn().mockResolvedValue([]) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ConnectionsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: NotificationsService,
          useValue: { notify: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: SafetyService, useValue: safety },
      ],
    }).compile();
    service = moduleRef.get(ConnectionsService);
  });

  describe("send", () => {
    it("creates a PENDING row when no prior row exists (happy path)", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u_receiver" });
      prisma.connection.findFirst.mockResolvedValue(null);
      prisma.connection.create.mockResolvedValue({ id: "c_1" });

      const row = await service.send("u_sender", {
        receiverId: "u_receiver",
        message: "hi",
      });

      expect(row.id).toBe("c_1");
      expect(prisma.connection.create).toHaveBeenCalledWith({
        data: {
          requesterId: "u_sender",
          receiverId: "u_receiver",
          status: "PENDING",
          message: "hi",
        },
      });
    });

    it("rejects self-connect with VALIDATION_FAILED", async () => {
      const call = service.send("u_me", { receiverId: "u_me" });
      await expect(call).rejects.toBeInstanceOf(DomainException);
      await expect(call).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_FAILED,
      });
    });

    it("rejects when a PENDING row already exists with CONFLICT", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u_receiver" });
      prisma.connection.findFirst.mockResolvedValue({
        id: "c_1",
        status: "PENDING",
      });

      const call = service.send("u_sender", { receiverId: "u_receiver" });
      await expect(call).rejects.toMatchObject({
        code: ErrorCode.CONFLICT,
      });
    });
  });

  describe("respond", () => {
    it("only the receiver can accept — otherwise AUTH_FORBIDDEN", async () => {
      prisma.connection.findUnique.mockResolvedValue({
        id: "c_1",
        requesterId: "u_a",
        receiverId: "u_b",
        status: "PENDING",
      });

      const call = service.respond("u_a", "c_1", { action: "ACCEPT" });
      await expect(call).rejects.toMatchObject({
        code: ErrorCode.AUTH_FORBIDDEN,
      });
    });

    it("transitions PENDING → ACCEPTED on happy path", async () => {
      prisma.connection.findUnique.mockResolvedValue({
        id: "c_1",
        requesterId: "u_a",
        receiverId: "u_b",
        status: "PENDING",
      });
      prisma.connection.update.mockResolvedValue({ id: "c_1", status: "ACCEPTED" });

      const row = await service.respond("u_b", "c_1", { action: "ACCEPT" });
      expect(row.status).toBe("ACCEPTED");
      expect(prisma.connection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "ACCEPTED" }),
        }),
      );
    });
  });

  describe("suggestions", () => {
    it("excludes the viewer and existing connection rows", async () => {
      prisma.connection.findMany.mockResolvedValue([
        { requesterId: "u_me", receiverId: "u_existing" },
        { requesterId: "u_pending", receiverId: "u_me" },
      ]);
      prisma.profile.findMany.mockResolvedValue([
        {
          userId: "u_new",
          handle: "new-person",
          firstName: "New",
          lastName: "Person",
          headline: null,
          avatarUrl: null,
        },
      ]);

      const rows = await service.suggestions("u_me", 8);

      expect(prisma.profile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: { notIn: ["u_me", "u_existing", "u_pending"] },
            user: { isActive: true, deletedAt: null },
          }),
          take: 8,
        }),
      );
      expect(rows).toEqual([
        {
          user: {
            userId: "u_new",
            handle: "new-person",
            firstName: "New",
            lastName: "Person",
            headline: null,
            avatarUrl: null,
          },
          reasonCode: "SUGGESTED",
          reasonCount: null,
        },
      ]);
    });

    // Blocking writes BlockedUser, not Connection, so the connection sweep
    // above cannot see it — a blocked stranger came back as a suggestion.
    it("excludes users blocked in either direction", async () => {
      prisma.connection.findMany.mockResolvedValue([]);
      prisma.profile.findMany.mockResolvedValue([]);
      safety.getBlockedEitherIds.mockResolvedValue(["u_blocked", "u_blocked_me"]);

      await service.suggestions("u_me", 8);

      expect(safety.getBlockedEitherIds).toHaveBeenCalledWith("u_me");
      expect(prisma.profile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: { notIn: ["u_me", "u_blocked", "u_blocked_me"] },
          }),
        }),
      );
    });
  });
});
