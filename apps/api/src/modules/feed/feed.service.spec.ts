import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";
import { SafetyService } from "../safety/safety.service";

import { FeedService } from "./feed.service";

type PrismaStub = {
  post: { findMany: jest.Mock };
};

describe("FeedService", () => {
  let service: FeedService;
  let prisma: PrismaStub;
  let safety: { getBlockedEitherIds: jest.Mock };

  beforeEach(async () => {
    prisma = {
      post: { findMany: jest.fn().mockResolvedValue([]) },
    };
    safety = { getBlockedEitherIds: jest.fn().mockResolvedValue([]) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        FeedService,
        { provide: PrismaService, useValue: prisma },
        { provide: SafetyService, useValue: safety },
        // Unset transform base: the designed fallback, where every image URL
        // passes through unchanged.
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();
    service = moduleRef.get(FeedService);
  });

  it("filters blocked authors via the single-query author predicate", async () => {
    safety.getBlockedEitherIds.mockResolvedValue(["blocked_by_viewer", "blocked_viewer"]);

    await service.getFeed("viewer", null, 20);

    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          author: expect.objectContaining({
            deletedAt: null,
            id: { notIn: ["blocked_by_viewer", "blocked_viewer"] },
            OR: [
              { id: "viewer" },
              { sentConnections: { some: { receiverId: "viewer", status: "ACCEPTED" } } },
              { recvConnections: { some: { requesterId: "viewer", status: "ACCEPTED" } } },
            ],
          }),
        }),
      }),
    );
  });

  it("omits the blocked-id predicate when nothing is blocked", async () => {
    await service.getFeed("viewer", null, 20);

    const call = prisma.post.findMany.mock.calls[0]![0] as {
      where: { author: Record<string, unknown> };
    };
    expect(call.where.author).not.toHaveProperty("id");
    expect(call.where.author).toMatchObject({
      deletedAt: null,
      OR: expect.any(Array),
    });
  });

  it("excludes soft-deleted authors via the author relation filter", async () => {
    await service.getFeed("viewer", null, 20);

    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          author: expect.objectContaining({ deletedAt: null }),
        }),
      }),
    );
  });
});

describe("image variants", () => {
  const withMedia = (avatarUrl: string | null) => ({
    id: "post-1",
    authorId: "author-1",
    body: "نص",
    language: "ar",
    createdAt: new Date("2026-08-09T10:00:00.000Z"),
    updatedAt: new Date("2026-08-09T10:00:00.000Z"),
    deletedAt: null,
    author: {
      id: "author-1",
      deletedAt: null,
      profile: {
        handle: "member",
        firstName: "ليلى",
        lastName: "خ",
        headline: null,
        avatarUrl,
      },
    },
    media: [
      {
        id: "m1",
        url: "https://cdn.baydar.ps/post_media/u_1/photo.jpg",
        kind: "IMAGE",
        mimeType: "image/jpeg",
        width: 1600,
        height: 1200,
        durationMs: null,
        sizeBytes: 900_000,
        blurhash: null,
      },
    ],
    reactions: [],
    reposts: [],
    bookmarks: [],
    _count: { reactions: 0, comments: 0, reposts: 0 },
  });

  async function feedWith(connection: "slow" | "fast", transformBase: string | undefined) {
    const prismaStub = {
      post: { findMany: jest.fn().mockResolvedValue([withMedia("https://cdn.baydar.ps/a/1.jpg")]) },
      reaction: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        FeedService,
        { provide: PrismaService, useValue: prismaStub },
        {
          provide: SafetyService,
          useValue: { getBlockedEitherIds: jest.fn().mockResolvedValue([]) },
        },
        { provide: ConfigService, useValue: { get: () => transformBase } },
      ],
    }).compile();
    return moduleRef.get(FeedService).getFeed("viewer-1", null, 10, connection);
  }

  it("sends a 2G member the small image and the small avatar", async () => {
    const page = await feedWith("slow", "https://images.baydar.ps/cdn-cgi/image");

    expect(page.data[0]!.media[0]!.url).toContain("width=320");
    expect(page.data[0]!.author.avatarUrl).toContain("width=32");
  });

  it("sends a fast member the full-size ones", async () => {
    const page = await feedWith("fast", "https://images.baydar.ps/cdn-cgi/image");

    expect(page.data[0]!.media[0]!.url).toContain("width=1080");
    expect(page.data[0]!.author.avatarUrl).toContain("width=96");
  });

  it("passes URLs through untouched while no transform is provisioned", async () => {
    // The designed fallback. Nothing 404s while somebody sets up Cloudflare
    // Images; the product simply spends more bytes.
    const page = await feedWith("slow", undefined);

    expect(page.data[0]!.media[0]!.url).toBe("https://cdn.baydar.ps/post_media/u_1/photo.jpg");
    expect(page.data[0]!.author.avatarUrl).toBe("https://cdn.baydar.ps/a/1.jpg");
  });
});
