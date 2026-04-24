import { Test } from "@nestjs/testing";
import { ErrorCode } from "@palnet/shared";

import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

import { AdminService } from "./admin.service";

// Stubs for the Prisma model methods AdminService actually calls.
type PrismaStub = {
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  post: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  comment: { findUnique: jest.Mock };
  message: { findUnique: jest.Mock };
  report: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  auditLog: {
    create: jest.Mock;
    findMany: jest.Mock;
  };
  refreshToken: { updateMany: jest.Mock };
  $transaction: jest.Mock;
};

function buildPrisma(): PrismaStub {
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    post: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    comment: { findUnique: jest.fn() },
    message: { findUnique: jest.fn() },
    report: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    refreshToken: { updateMany: jest.fn() },
    // `$transaction(ops)` in the service is always called with an array of
    // prepared Prisma promises. The real client awaits them; in tests we
    // resolve to an empty array since the callers don't use the result.
    $transaction: jest.fn().mockResolvedValue([]),
  };
}

describe("AdminService", () => {
  let service: AdminService;
  let prisma: PrismaStub;
  let notifications: { notify: jest.Mock };

  beforeEach(async () => {
    prisma = buildPrisma();
    notifications = { notify: jest.fn().mockResolvedValue(undefined) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    service = moduleRef.get(AdminService);
  });

  // ── suspendUser ────────────────────────────────────────────────────────

  it("suspend: refuses self-suspension", async () => {
    await expect(service.suspendUser("u_mod", "u_mod", { reason: "nope" })).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_FAILED,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("suspend: 404s when the target user does not exist", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.suspendUser("u_mod", "u_missing", { reason: "x" })).rejects.toMatchObject({
      code: ErrorCode.NOT_FOUND,
    });
  });

  it("suspend: runs the transactional write and notifies the target", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u_target", suspendedAt: null });

    await service.suspendUser("u_mod", "u_target", { reason: "harassment" });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    // AdminService builds the write as 3 Prisma promises per mutation.
    const ops = prisma.$transaction.mock.calls[0]?.[0] as unknown[];
    expect(Array.isArray(ops)).toBe(true);
    expect(ops).toHaveLength(3);

    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "MODERATION_USER_SUSPENDED",
        recipientId: "u_target",
        actorId: "u_mod",
        data: { reason: "harassment" },
      }),
    );
  });

  // ── unsuspendUser ──────────────────────────────────────────────────────

  it("unsuspend: is a no-op when the user is not suspended", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u_target", suspendedAt: null });
    await service.unsuspendUser("u_mod", "u_target", {});
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it("unsuspend: writes and notifies when lifting an active suspension", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "u_target",
      suspendedAt: new Date("2026-04-01T00:00:00Z"),
    });

    await service.unsuspendUser("u_mod", "u_target", { note: "appealed via email" });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "MODERATION_USER_UNSUSPENDED",
        recipientId: "u_target",
        data: { note: "appealed via email" },
      }),
    );
  });

  // ── takedownPost / restorePost ─────────────────────────────────────────

  it("takedown: notifies the post author with the reason", async () => {
    prisma.post.findFirst.mockResolvedValue({
      id: "p_1",
      takedownAt: null,
      authorId: "u_author",
    });

    await service.takedownPost("u_mod", "p_1", { reason: "spam" });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "MODERATION_POST_TAKEDOWN",
        recipientId: "u_author",
        postId: "p_1",
        data: { postId: "p_1", reason: "spam" },
      }),
    );
  });

  it("restore: skips when not taken down; notifies when lifting", async () => {
    prisma.post.findFirst.mockResolvedValue({
      id: "p_1",
      takedownAt: null,
      authorId: "u_author",
    });
    await service.restorePost("u_mod", "p_1", {});
    expect(prisma.$transaction).not.toHaveBeenCalled();

    prisma.post.findFirst.mockResolvedValue({
      id: "p_2",
      takedownAt: new Date("2026-04-10T00:00:00Z"),
      authorId: "u_author2",
    });
    await service.restorePost("u_mod", "p_2", { note: "appealed" });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "MODERATION_POST_RESTORED",
        recipientId: "u_author2",
        postId: "p_2",
      }),
    );
  });

  // ── fileAppeal ─────────────────────────────────────────────────────────

  it("file appeal: 403s when the viewer does not own the targeted content", async () => {
    prisma.report.findUnique.mockResolvedValue({
      id: "r_1",
      resolvedAt: new Date("2026-04-15T00:00:00Z"),
      appealStatus: null,
      targetUserId: null,
      targetPostId: "p_1",
      targetCommentId: null,
      targetMessageId: null,
    });
    prisma.post.findUnique.mockResolvedValue({ authorId: "u_someone_else" });

    await expect(service.fileAppeal("u_viewer", "r_1", "my note")).rejects.toMatchObject({
      code: ErrorCode.AUTH_FORBIDDEN,
    });
  });

  it("file appeal: rejects unresolved reports", async () => {
    prisma.report.findUnique.mockResolvedValue({
      id: "r_1",
      resolvedAt: null,
      appealStatus: null,
      targetUserId: "u_viewer",
      targetPostId: null,
      targetCommentId: null,
      targetMessageId: null,
    });

    await expect(service.fileAppeal("u_viewer", "r_1", "note")).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_FAILED,
    });
  });

  it("file appeal: rejects when an appeal already exists", async () => {
    prisma.report.findUnique.mockResolvedValue({
      id: "r_1",
      resolvedAt: new Date(),
      appealStatus: "PENDING",
      targetUserId: "u_viewer",
      targetPostId: null,
      targetCommentId: null,
      targetMessageId: null,
    });

    await expect(service.fileAppeal("u_viewer", "r_1", "note")).rejects.toMatchObject({
      code: ErrorCode.APPEAL_ALREADY_FILED,
    });
  });

  it("file appeal: accepts a valid appeal and flips the report to PENDING", async () => {
    prisma.report.findUnique.mockResolvedValue({
      id: "r_1",
      resolvedAt: new Date(),
      appealStatus: null,
      targetUserId: "u_viewer",
      targetPostId: null,
      targetCommentId: null,
      targetMessageId: null,
    });
    prisma.report.update.mockResolvedValue({
      id: "r_1",
      appealedAt: new Date("2026-04-20T00:00:00Z"),
      appealStatus: "PENDING",
    });

    const ack = await service.fileAppeal("u_viewer", "r_1", "note");

    expect(ack.appealStatus).toBe("PENDING");
    expect(prisma.report.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "r_1" },
        data: expect.objectContaining({
          appealStatus: "PENDING",
          appealNote: "note",
        }),
      }),
    );
  });

  // ── reviewAppeal ───────────────────────────────────────────────────────

  it("review appeal: UPHELD reverses the user suspension AND notifies the target", async () => {
    prisma.report.findUnique.mockResolvedValueOnce({
      id: "r_1",
      appealStatus: "PENDING",
      targetUserId: "u_target",
      targetPostId: null,
      targetCommentId: null,
      targetMessageId: null,
    });

    await service.reviewAppeal("u_mod", "r_1", {
      decision: "UPHELD",
      note: "our bad",
    });

    // First `$transaction` call carries: update report, audit log, user unsuspend.
    const ops = prisma.$transaction.mock.calls[0]?.[0] as unknown[];
    expect(ops).toHaveLength(3);

    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "MODERATION_APPEAL_REVIEWED",
        recipientId: "u_target",
        data: { reportId: "r_1", decision: "UPHELD", note: "our bad" },
      }),
    );
  });

  it("review appeal: DENIED does not append reversal ops", async () => {
    prisma.report.findUnique.mockResolvedValue({
      id: "r_1",
      appealStatus: "PENDING",
      targetUserId: "u_target",
      targetPostId: null,
      targetCommentId: null,
      targetMessageId: null,
    });

    await service.reviewAppeal("u_mod", "r_1", { decision: "DENIED" });

    const ops = prisma.$transaction.mock.calls[0]?.[0] as unknown[];
    // Report update + audit row only — no user.update reversal.
    expect(ops).toHaveLength(2);
  });

  it("review appeal: 404 when no appeal exists", async () => {
    prisma.report.findUnique.mockResolvedValue({
      id: "r_1",
      appealStatus: null,
      targetUserId: "u_target",
      targetPostId: null,
      targetCommentId: null,
      targetMessageId: null,
    });

    await expect(
      service.reviewAppeal("u_mod", "r_1", { decision: "UPHELD" }),
    ).rejects.toMatchObject({ code: ErrorCode.APPEAL_NOT_FOUND });
  });

  it("review appeal: 409 when the appeal has already been reviewed", async () => {
    prisma.report.findUnique.mockResolvedValue({
      id: "r_1",
      appealStatus: "DENIED",
      targetUserId: "u_target",
      targetPostId: null,
      targetCommentId: null,
      targetMessageId: null,
    });

    await expect(
      service.reviewAppeal("u_mod", "r_1", { decision: "UPHELD" }),
    ).rejects.toMatchObject({ code: ErrorCode.CONFLICT });
  });
});
