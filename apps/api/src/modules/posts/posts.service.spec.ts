import { Test } from "@nestjs/testing";
import { ErrorCode } from "@palnet/shared";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";

import { PostsService } from "./posts.service";

type PrismaStub = {
  post: {
    create: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
};

function buildPrisma(): PrismaStub {
  return {
    post: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
}

const hydrated = (overrides: Partial<{ authorId: string; id: string }> = {}) => ({
  id: overrides.id ?? "post_1",
  authorId: overrides.authorId ?? "user_1",
  body: "hello",
  language: "ar",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  author: {
    id: overrides.authorId ?? "user_1",
    profile: {
      handle: "osama",
      firstName: "Osama",
      lastName: "Hamad",
      headline: null,
      avatarUrl: null,
    },
  },
  media: [],
  _count: { reactions: 0, comments: 0, reposts: 0 },
  reactions: [],
  reposts: [],
});

describe("PostsService", () => {
  let service: PostsService;
  let prisma: PrismaStub;

  beforeEach(async () => {
    prisma = buildPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [PostsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(PostsService);
  });

  describe("create", () => {
    it("persists and returns a Post DTO (happy path)", async () => {
      prisma.post.create.mockResolvedValue(hydrated());

      const dto = await service.create("user_1", {
        body: "hello",
        language: "ar",
        media: [],
      });

      expect(dto.id).toBe("post_1");
      expect(dto.author.handle).toBe("osama");
      expect(dto.counts.reactions).toBe(0);
      expect(dto.viewer.reaction).toBeNull();
      expect(prisma.post.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("update", () => {
    it("rejects when user is not the author with AUTH_FORBIDDEN", async () => {
      prisma.post.findFirst.mockResolvedValue({
        id: "post_1",
        authorId: "user_other",
        deletedAt: null,
      });

      const call = service.update("user_1", "post_1", { body: "edited" });

      await expect(call).rejects.toBeInstanceOf(DomainException);
      await expect(call).rejects.toMatchObject({
        code: ErrorCode.AUTH_FORBIDDEN,
      });
    });

    it("rejects when post missing with NOT_FOUND", async () => {
      prisma.post.findFirst.mockResolvedValue(null);

      const call = service.update("user_1", "post_1", { body: "edited" });

      await expect(call).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });
});
