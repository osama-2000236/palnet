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
  let safety: { getBlockedEitherIds: jest.Mock; isBlockedEither: jest.Mock };

  beforeEach(async () => {
    prisma = buildPrisma();
    safety = {
      getBlockedEitherIds: jest.fn().mockResolvedValue([]),
      isBlockedEither: jest.fn().mockResolvedValue(false),
    };
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

    // Every other surface — feed, search, comments, messaging, notifications,
    // and this service's own `suggestions` — refuses to put two blocked users
    // in front of each other. `send` did not, so a blocked user could still
    // deliver a 300-character `message` into the recipient's invitations list.
    it("refuses to send to someone the sender has blocked", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u_receiver" });
      safety.isBlockedEither.mockResolvedValue(true);

      const call = service.send("u_sender", { receiverId: "u_receiver", message: "hi" });
      await expect(call).rejects.toMatchObject({ code: ErrorCode.BLOCKED });
      expect(prisma.connection.create).not.toHaveBeenCalled();
    });

    it("refuses to send to someone who blocked the sender", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u_blocker" });
      safety.isBlockedEither.mockResolvedValue(true);

      const call = service.send("u_blocked", { receiverId: "u_blocker", message: "let me in" });
      await expect(call).rejects.toMatchObject({ code: ErrorCode.BLOCKED });
      expect(prisma.connection.create).not.toHaveBeenCalled();
    });

    // Re-send takes the `update` branch, not `create` — it has to be gated too.
    it("refuses to revive a WITHDRAWN row across a block", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u_receiver" });
      prisma.connection.findFirst.mockResolvedValue({ id: "c_1", status: "WITHDRAWN" });
      safety.isBlockedEither.mockResolvedValue(true);

      const call = service.send("u_sender", { receiverId: "u_receiver" });
      await expect(call).rejects.toMatchObject({ code: ErrorCode.BLOCKED });
      expect(prisma.connection.update).not.toHaveBeenCalled();
    });
  });

  describe("listMine", () => {
    // A block usually arrives *because* of the request already sitting in the
    // list. Gating only the write leaves that row visible forever.
    it("hides connections with users blocked in either direction", async () => {
      safety.getBlockedEitherIds.mockResolvedValue(["u_blocked"]);
      prisma.connection.findMany.mockResolvedValue([]);

      await service.listMine("u_me", "INCOMING");

      expect(prisma.connection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "PENDING",
            receiverId: "u_me",
            AND: [
              { requesterId: { notIn: ["u_blocked"] } },
              { receiverId: { notIn: ["u_blocked"] } },
            ],
          }),
        }),
      );
    });

    it("adds no exclusion clause when nothing is blocked", async () => {
      safety.getBlockedEitherIds.mockResolvedValue([]);
      prisma.connection.findMany.mockResolvedValue([]);

      await service.listMine("u_me", "ACCEPTED");

      const where = prisma.connection.findMany.mock.calls[0]![0].where as Record<string, unknown>;
      expect(where.AND).toBeUndefined();
    });
  });

  describe("counts", () => {
    // The badge and the list have to agree, or the invitations count points at
    // a row `listMine` refuses to render and the badge never clears.
    it("applies the same block exclusion the list does", async () => {
      safety.getBlockedEitherIds.mockResolvedValue(["u_blocked"]);
      prisma.connection.count.mockResolvedValue(0);

      await service.counts("u_me");

      for (const call of prisma.connection.count.mock.calls) {
        expect(call[0].where.AND).toEqual([
          { requesterId: { notIn: ["u_blocked"] } },
          { receiverId: { notIn: ["u_blocked"] } },
        ]);
      }
      expect(prisma.connection.count).toHaveBeenCalledTimes(3);
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
