import { Test } from "@nestjs/testing";
import { ErrorCode, NotificationType } from "@baydar/shared";

import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

import { CommentsService } from "./comments.service";

type PrismaStub = {
  post: { findFirst: jest.Mock };
  comment: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
};

function buildPrisma(): PrismaStub {
  return {
    post: { findFirst: jest.fn() },
    comment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

const baseAuthor = {
  id: "u1",
  profile: {
    handle: "alice",
    firstName: "Alice",
    lastName: "Doe",
    avatarUrl: null,
  },
};

function makeRow(
  over: Partial<{ id: string; postId: string; parentId: string | null; body: string }> = {},
) {
  const now = new Date();
  return {
    id: over.id ?? "c1",
    postId: over.postId ?? "p1",
    parentId: over.parentId ?? null,
    body: over.body ?? "hello",
    createdAt: now,
    updatedAt: now,
    author: baseAuthor,
  };
}

describe("CommentsService", () => {
  let service: CommentsService;
  let prisma: PrismaStub;
  let notifications: { notify: jest.Mock };

  beforeEach(async () => {
    prisma = buildPrisma();
    notifications = { notify: jest.fn().mockResolvedValue(undefined) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    service = moduleRef.get(CommentsService);
  });

  // ── create ────────────────────────────────────────────────────────────

  it("create: 404s on a missing post", async () => {
    prisma.post.findFirst.mockResolvedValue(null);
    await expect(service.create("u2", "p_missing", { body: "hi" })).rejects.toMatchObject({
      code: ErrorCode.NOT_FOUND,
    });
    expect(prisma.comment.create).not.toHaveBeenCalled();
  });

  it("create: 404s on a missing parent comment", async () => {
    prisma.post.findFirst.mockResolvedValue({ id: "p1", authorId: "u1" });
    prisma.comment.findFirst.mockResolvedValue(null);
    await expect(
      service.create("u2", "p1", { body: "hi", parentId: "c_missing" }),
    ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
  });

  it("create: top-level comment notifies the post author", async () => {
    prisma.post.findFirst.mockResolvedValue({ id: "p1", authorId: "u_post" });
    prisma.comment.create.mockResolvedValue(makeRow());

    const dto = await service.create("u2", "p1", { body: "hi" });
    expect(dto.id).toBe("c1");
    // Single notification — to the post author only.
    expect(notifications.notify).toHaveBeenCalledTimes(1);
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.POST_COMMENT,
        recipientId: "u_post",
        actorId: "u2",
        postId: "p1",
        commentId: "c1",
      }),
    );
  });

  it("create: reply notifies both post author and parent author when distinct", async () => {
    prisma.post.findFirst.mockResolvedValue({ id: "p1", authorId: "u_post" });
    prisma.comment.findFirst.mockResolvedValue({ id: "c_parent", authorId: "u_parent" });
    prisma.comment.create.mockResolvedValue(makeRow({ parentId: "c_parent" }));

    await service.create("u2", "p1", { body: "hi", parentId: "c_parent" });
    expect(notifications.notify).toHaveBeenCalledTimes(2);
    const recipients = notifications.notify.mock.calls.map(
      (call) => (call[0] as { recipientId: string }).recipientId,
    );
    expect(recipients).toEqual(expect.arrayContaining(["u_post", "u_parent"]));
  });

  it("create: reply does not double-notify when post author is also parent author", async () => {
    prisma.post.findFirst.mockResolvedValue({ id: "p1", authorId: "u_post" });
    prisma.comment.findFirst.mockResolvedValue({ id: "c_parent", authorId: "u_post" });
    prisma.comment.create.mockResolvedValue(makeRow({ parentId: "c_parent" }));

    await service.create("u2", "p1", { body: "hi", parentId: "c_parent" });
    expect(notifications.notify).toHaveBeenCalledTimes(1);
  });

  // ── list ──────────────────────────────────────────────────────────────

  it("list: paginates with hasMore and trims the +1 sentinel", async () => {
    const rows = [makeRow({ id: "c1" }), makeRow({ id: "c2" }), makeRow({ id: "c3" })];
    prisma.comment.findMany.mockResolvedValue(rows);
    const page = await service.list("p1", null, 2);
    expect(page.data.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(page.meta).toEqual({ nextCursor: "c2", hasMore: true, limit: 2 });
  });

  it("list: returns nextCursor null when the page is the last one", async () => {
    prisma.comment.findMany.mockResolvedValue([makeRow({ id: "c1" })]);
    const page = await service.list("p1", null, 5);
    expect(page.data).toHaveLength(1);
    expect(page.meta).toEqual({ nextCursor: null, hasMore: false, limit: 5 });
  });

  it("list: forwards cursor + skip to Prisma", async () => {
    prisma.comment.findMany.mockResolvedValue([]);
    await service.list("p1", "c_prev", 10);
    expect(prisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: "c_prev" },
        skip: 1,
        where: expect.objectContaining({ postId: "p1", parentId: null, deletedAt: null }),
      }),
    );
  });

  // ── delete ────────────────────────────────────────────────────────────

  it("delete: 404s when the comment is missing", async () => {
    prisma.comment.findFirst.mockResolvedValue(null);
    await expect(service.delete("u1", "c_missing")).rejects.toMatchObject({
      code: ErrorCode.NOT_FOUND,
    });
  });

  it("delete: 403s when the viewer is not the author", async () => {
    prisma.comment.findFirst.mockResolvedValue({ id: "c1", authorId: "u_other" });
    await expect(service.delete("u1", "c1")).rejects.toMatchObject({
      code: ErrorCode.AUTH_FORBIDDEN,
    });
    expect(prisma.comment.update).not.toHaveBeenCalled();
  });

  it("delete: soft-deletes the row by stamping deletedAt", async () => {
    prisma.comment.findFirst.mockResolvedValue({ id: "c1", authorId: "u1" });
    await service.delete("u1", "c1");
    expect(prisma.comment.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { deletedAt: expect.any(Date) },
    });
  });
});
