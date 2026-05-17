import { ErrorCode } from "@baydar/shared";
import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";

import { RepostsService } from "./reposts.service";

type PrismaStub = {
  post: { findFirst: jest.Mock };
  repost: { upsert: jest.Mock; deleteMany: jest.Mock };
};

describe("RepostsService", () => {
  let service: RepostsService;
  let prisma: PrismaStub;

  beforeEach(async () => {
    prisma = {
      post: { findFirst: jest.fn() },
      repost: { upsert: jest.fn(), deleteMany: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [RepostsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(RepostsService);
  });

  describe("create", () => {
    it("404s when the post is missing or soft-deleted", async () => {
      prisma.post.findFirst.mockResolvedValue(null);
      await expect(service.create("u_me", "p_missing", {})).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it("upserts so re-reposting overwrites the optional comment", async () => {
      prisma.post.findFirst.mockResolvedValue({ id: "p_1" });
      await service.create("u_me", "p_1", { comment: "hot take" });
      expect(prisma.repost.upsert).toHaveBeenCalledWith({
        where: { userId_postId: { userId: "u_me", postId: "p_1" } },
        create: { userId: "u_me", postId: "p_1", comment: "hot take" },
        update: { comment: "hot take" },
      });
    });

    it("normalises an absent comment to null on both create and update branches", async () => {
      prisma.post.findFirst.mockResolvedValue({ id: "p_1" });
      await service.create("u_me", "p_1", {});
      expect(prisma.repost.upsert).toHaveBeenCalledWith({
        where: { userId_postId: { userId: "u_me", postId: "p_1" } },
        create: { userId: "u_me", postId: "p_1", comment: null },
        update: { comment: null },
      });
    });
  });

  describe("delete", () => {
    it("removes the viewer's repost row by composite key", async () => {
      prisma.repost.deleteMany.mockResolvedValue({ count: 1 });
      await service.delete("u_me", "p_1");
      expect(prisma.repost.deleteMany).toHaveBeenCalledWith({
        where: { userId: "u_me", postId: "p_1" },
      });
    });
  });
});
