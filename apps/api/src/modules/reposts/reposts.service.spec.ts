import { Test } from "@nestjs/testing";
import { ErrorCode } from "@baydar/shared";

import { PrismaService } from "../prisma/prisma.service";

import { RepostsService } from "./reposts.service";

type PrismaStub = {
  post: { findFirst: jest.Mock };
  repost: { upsert: jest.Mock; deleteMany: jest.Mock };
};

function buildPrisma(): PrismaStub {
  return {
    post: { findFirst: jest.fn() },
    repost: { upsert: jest.fn(), deleteMany: jest.fn() },
  };
}

describe("RepostsService", () => {
  let service: RepostsService;
  let prisma: PrismaStub;

  beforeEach(async () => {
    prisma = buildPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [RepostsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(RepostsService);
  });

  it("create: 404s when the post is missing or soft-deleted", async () => {
    prisma.post.findFirst.mockResolvedValue(null);
    await expect(service.create("u1", "p_missing", { comment: undefined })).rejects.toMatchObject({
      code: ErrorCode.NOT_FOUND,
    });
    expect(prisma.repost.upsert).not.toHaveBeenCalled();
  });

  it("create: simple repost without comment upserts on (userId, postId)", async () => {
    prisma.post.findFirst.mockResolvedValue({ id: "p1" });
    await service.create("u1", "p1", { comment: undefined });
    expect(prisma.repost.upsert).toHaveBeenCalledWith({
      where: { userId_postId: { userId: "u1", postId: "p1" } },
      // Service normalises a missing comment to null at the data layer
      // so quote-vs-simple is a single column, never an undefined.
      create: { userId: "u1", postId: "p1", comment: null },
      update: { comment: null },
    });
  });

  it("create: quote repost with comment writes the comment body through", async () => {
    prisma.post.findFirst.mockResolvedValue({ id: "p1" });
    await service.create("u1", "p1", { comment: "great post" });
    const call = prisma.repost.upsert.mock.calls[0]?.[0] as {
      create: { comment: string | null };
      update: { comment: string | null };
    };
    expect(call.create.comment).toBe("great post");
    expect(call.update.comment).toBe("great post");
  });

  it("create: a second repost on the same post is idempotent (upsert path)", async () => {
    prisma.post.findFirst.mockResolvedValue({ id: "p1" });
    await service.create("u1", "p1", { comment: undefined });
    await service.create("u1", "p1", { comment: "now with quote" });
    // Two upsert calls on the same composite key — Prisma collapses to one row.
    expect(prisma.repost.upsert).toHaveBeenCalledTimes(2);
    const second = prisma.repost.upsert.mock.calls[1]?.[0] as {
      where: { userId_postId: { userId: string; postId: string } };
    };
    expect(second.where.userId_postId).toEqual({ userId: "u1", postId: "p1" });
  });

  it("delete: removes the repost row for (userId, postId)", async () => {
    await service.delete("u1", "p1");
    expect(prisma.repost.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", postId: "p1" },
    });
  });
});
