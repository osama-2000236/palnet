import { Test } from "@nestjs/testing";

import { ModerationService } from "../moderation/moderation.service";
import { PrismaService } from "../prisma/prisma.service";

import { FeedService } from "./feed.service";

type PrismaStub = {
  connection: { findMany: jest.Mock };
  post: { findMany: jest.Mock };
};

function buildPrisma(): PrismaStub {
  return {
    connection: { findMany: jest.fn().mockResolvedValue([]) },
    post: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

function makePost(over: Partial<{ id: string; authorId: string }> = {}) {
  const now = new Date();
  return {
    id: over.id ?? "p1",
    authorId: over.authorId ?? "u1",
    body: "hi",
    language: "ar",
    createdAt: now,
    updatedAt: now,
    author: {
      id: over.authorId ?? "u1",
      profile: {
        handle: "alice",
        firstName: "Alice",
        lastName: "Doe",
        headline: null,
        avatarUrl: null,
      },
    },
    media: [],
    _count: { reactions: 0, comments: 0, reposts: 0 },
    reactions: [],
    reposts: [],
  };
}

describe("FeedService", () => {
  let service: FeedService;
  let prisma: PrismaStub;
  let moderation: { blockedIds: jest.Mock };

  beforeEach(async () => {
    prisma = buildPrisma();
    moderation = { blockedIds: jest.fn().mockResolvedValue([]) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        FeedService,
        { provide: PrismaService, useValue: prisma },
        { provide: ModerationService, useValue: moderation },
      ],
    }).compile();
    service = moduleRef.get(FeedService);
  });

  it("scopes the author set to viewer + accepted connections in either direction", async () => {
    prisma.connection.findMany.mockResolvedValue([
      { requesterId: "u1", receiverId: "u2" },
      { requesterId: "u3", receiverId: "u1" },
    ]);
    await service.getFeed("u1", null, 10);
    const args = prisma.post.findMany.mock.calls[0]?.[0] as {
      where: { authorId: { in: string[] } };
    };
    // Expect viewer + both ends of accepted edges, regardless of direction.
    expect(args.where.authorId.in.sort()).toEqual(["u1", "u2", "u3"]);
  });

  it("excludes blocked users on either side of the block", async () => {
    prisma.connection.findMany.mockResolvedValue([
      { requesterId: "u1", receiverId: "u2" },
      { requesterId: "u1", receiverId: "u_blocked" },
    ]);
    moderation.blockedIds.mockResolvedValue(["u_blocked"]);
    await service.getFeed("u1", null, 10);
    const args = prisma.post.findMany.mock.calls[0]?.[0] as {
      where: { authorId: { in: string[] } };
    };
    expect(args.where.authorId.in).toContain("u1");
    expect(args.where.authorId.in).toContain("u2");
    expect(args.where.authorId.in).not.toContain("u_blocked");
  });

  it("filters out soft-deleted and taken-down posts at the query layer", async () => {
    await service.getFeed("u1", null, 5);
    const args = prisma.post.findMany.mock.calls[0]?.[0] as {
      where: { deletedAt: null; takedownAt: null };
    };
    expect(args.where.deletedAt).toBeNull();
    expect(args.where.takedownAt).toBeNull();
  });

  it("uses limit + 1 fetch and trims the sentinel for hasMore", async () => {
    const rows = [makePost({ id: "p1" }), makePost({ id: "p2" }), makePost({ id: "p3" })];
    prisma.post.findMany.mockResolvedValue(rows);
    const page = await service.getFeed("u1", null, 2);
    expect(page.data.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(page.meta).toEqual({ nextCursor: "p2", hasMore: true, limit: 2 });
    // Internally the take is limit + 1.
    const args = prisma.post.findMany.mock.calls[0]?.[0] as { take: number };
    expect(args.take).toBe(3);
  });

  it("returns nextCursor null and hasMore false when results fit in the page", async () => {
    prisma.post.findMany.mockResolvedValue([makePost({ id: "p1" })]);
    const page = await service.getFeed("u1", null, 10);
    expect(page.meta).toEqual({ nextCursor: null, hasMore: false, limit: 10 });
  });

  it("forwards a cursor with skip:1 so the previous tail isn't repeated", async () => {
    await service.getFeed("u1", "p_prev", 10);
    const args = prisma.post.findMany.mock.calls[0]?.[0] as {
      cursor: { id: string };
      skip: number;
    };
    expect(args.cursor).toEqual({ id: "p_prev" });
    expect(args.skip).toBe(1);
  });

  it("orders by createdAt desc with id desc as the tiebreaker", async () => {
    await service.getFeed("u1", null, 10);
    const args = prisma.post.findMany.mock.calls[0]?.[0] as {
      orderBy: Array<Record<string, "asc" | "desc">>;
    };
    expect(args.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
  });
});
