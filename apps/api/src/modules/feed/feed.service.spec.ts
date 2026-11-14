import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";
import { SafetyService } from "../safety/safety.service";

import { diversify, score, type Candidate } from "./feed.ranking";
import { FeedService } from "./feed.service";

const NOW = Date.now();
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000);
const zero = { _count: { reactions: 0, comments: 0, reposts: 0 } };

function postRow(id: string, authorId = "author") {
  return {
    id,
    authorId,
    body: "نص",
    language: "ar",
    createdAt: hoursAgo(1),
    updatedAt: hoursAgo(1),
    author: {
      id: authorId,
      deletedAt: null,
      profile: { handle: authorId, firstName: "أ", lastName: "ب", headline: null, avatarUrl: null },
    },
    media: [],
    ...zero,
    reactions: [],
    reposts: [],
    bookmarks: [],
  };
}

describe("FeedService", () => {
  let service: FeedService;
  let prisma: {
    post: { findMany: jest.Mock };
    connection: { findMany: jest.Mock };
    repost: { findMany: jest.Mock };
    profile: { findUnique: jest.Mock };
    feedSlate: { findFirst: jest.Mock; deleteMany: jest.Mock; create: jest.Mock };
    reaction: { groupBy: jest.Mock };
    $transaction: jest.Mock;
  };
  let safety: { getBlockedEitherIds: jest.Mock };
  let ranking: "true" | "false";

  beforeEach(async () => {
    ranking = "true";
    prisma = {
      post: { findMany: jest.fn().mockResolvedValue([]) },
      connection: {
        findMany: jest.fn().mockResolvedValue([
          { requesterId: "viewer", receiverId: "friend" },
          { requesterId: "blocked_viewer", receiverId: "viewer" },
        ]),
      },
      repost: { findMany: jest.fn().mockResolvedValue([]) },
      profile: { findUnique: jest.fn().mockResolvedValue({ location: "Ramallah" }) },
      feedSlate: {
        findFirst: jest.fn().mockResolvedValue(null),
        deleteMany: jest.fn().mockReturnValue("delete-op"),
        create: jest.fn().mockReturnValue("create-op"),
      },
      reaction: { groupBy: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    safety = { getBlockedEitherIds: jest.fn().mockResolvedValue(["blocked_viewer"]) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        FeedService,
        { provide: PrismaService, useValue: prisma },
        { provide: SafetyService, useValue: safety },
        { provide: ConfigService, useValue: { get: () => ranking } },
      ],
    }).compile();
    service = moduleRef.get(FeedService);
  });

  describe("chronological (FEED_RANKING_ENABLED=false)", () => {
    beforeEach(() => {
      ranking = "false";
    });

    it("reads the viewer and their connections by id, minus anyone blocked", async () => {
      await service.getFeed("viewer", null, 20);

      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            authorId: { in: ["viewer", "friend"] },
            author: { deletedAt: null },
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 21,
        }),
      );
      expect(prisma.profile.findUnique).not.toHaveBeenCalled();
      expect(prisma.feedSlate.create).not.toHaveBeenCalled();
    });
  });

  describe("ranked slate", () => {
    it("builds, persists and serves a slate with reasons in ranked order", async () => {
      prisma.post.findMany
        // network candidates
        .mockResolvedValueOnce([
          { id: "p_net", authorId: "friend", createdAt: hoursAgo(2), ...zero },
        ])
        // discovery candidates
        .mockResolvedValueOnce([
          {
            id: "p_near",
            authorId: "stranger",
            createdAt: hoursAgo(1),
            author: { profile: { location: " ramallah" } },
            ...zero,
          },
        ])
        // page hydrate, deliberately out of order
        .mockResolvedValueOnce([postRow("p_near", "stranger"), postRow("p_net", "friend")]);

      const res = await service.getFeed("viewer", null, 20);

      expect(res.data.map((p) => p.id)).toEqual(["p_net", "p_near"]);
      expect(res.data[0]!.feedReason).toBeUndefined();
      expect(res.data[1]!.feedReason).toEqual({ kind: "NEARBY", actor: null });
      expect(res.meta).toEqual({ nextCursor: null, hasMore: false, limit: 20 });
      expect(prisma.feedSlate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "viewer",
          postIds: ["p_net", "p_near"],
          reasons: { p_near: { kind: "NEARBY", actor: null } },
        }),
      });
      // Discovery must not re-surface the circle or anyone blocked.
      const discovery = prisma.post.findMany.mock.calls[1]![0] as {
        where: { authorId: { notIn: string[] } };
      };
      expect(discovery.where.authorId.notIn).toEqual(["viewer", "friend", "blocked_viewer"]);
    });

    it("keeps one entry per post, under its best route in", async () => {
      prisma.post.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: "p_x",
            authorId: "stranger",
            createdAt: hoursAgo(30),
            author: { profile: { location: null } },
            ...zero,
          },
        ])
        .mockResolvedValueOnce([postRow("p_x", "stranger")]);
      prisma.repost.findMany.mockResolvedValue([
        {
          createdAt: hoursAgo(1),
          user: { profile: { handle: "friend", firstName: "ص", lastName: "د" } },
          post: { id: "p_x", authorId: "stranger", ...zero },
        },
      ]);

      const res = await service.getFeed("viewer", null, 20);

      expect(res.data).toHaveLength(1);
      expect(res.data[0]!.feedReason).toEqual({
        kind: "REPOST",
        actor: { handle: "friend", firstName: "ص", lastName: "د" },
      });
    });

    it("pages from the frozen slate after the cursor", async () => {
      prisma.feedSlate.findFirst.mockResolvedValue({
        postIds: ["a", "b", "c", "d", "e"],
        reasons: { c: { kind: "REPOST", actor: { handle: "h", firstName: "ف", lastName: "ل" } } },
      });
      prisma.post.findMany.mockResolvedValue([postRow("c"), postRow("d")]);

      const res = await service.getFeed("viewer", "b", 2);

      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ["c", "d"] },
            deletedAt: null,
            author: { deletedAt: null, id: { notIn: ["blocked_viewer"] } },
          }),
        }),
      );
      expect(res.data.map((p) => p.id)).toEqual(["c", "d"]);
      expect(res.data[0]!.feedReason?.kind).toBe("REPOST");
      expect(res.meta).toEqual({ nextCursor: "d", hasMore: true, limit: 2 });
      expect(prisma.feedSlate.create).not.toHaveBeenCalled();
    });

    it("ends the feed when the cursor's slate is gone", async () => {
      const res = await service.getFeed("viewer", "zzz", 20);
      expect(res).toEqual({ data: [], meta: { nextCursor: null, hasMore: false, limit: 20 } });
      expect(prisma.post.findMany).not.toHaveBeenCalled();
    });
  });

  describe("score", () => {
    it("prefers fresher, closer and more engaged posts", () => {
      expect(score(1, hoursAgo(1), NOW, zero)).toBeGreaterThan(score(1, hoursAgo(48), NOW, zero));
      expect(score(1, hoursAgo(1), NOW, zero)).toBeGreaterThan(score(0.1, hoursAgo(1), NOW, zero));
      const engaged = { _count: { reactions: 10, comments: 3, reposts: 1 } };
      expect(score(1, hoursAgo(1), NOW, engaged)).toBeGreaterThan(score(1, hoursAgo(1), NOW, zero));
    });
  });

  describe("diversify", () => {
    const c = (postId: string, authorId: string, s: number, outOfNetwork = false): Candidate => ({
      postId,
      authorId,
      score: s,
      outOfNetwork,
      reason: null,
    });

    it("lets no author hold more than two of any ten consecutive slots", () => {
      const loud = Array.from({ length: 6 }, (_, i) => c(`loud${i}`, "loud", 10 - i));
      const quiet = Array.from({ length: 30 }, (_, i) => c(`q${i}`, `q${i}`, 1 - i / 100));
      const out = diversify([...loud, ...quiet]).map((x) => x.authorId);
      for (let i = 0; i + 10 <= out.length; i++) {
        expect(out.slice(i, i + 10).filter((a) => a === "loud").length).toBeLessThanOrEqual(2);
      }
      expect(out.slice(0, 2)).toEqual(["loud", "loud"]);
    });

    it("gives the tenth slot to the best out-of-network post", () => {
      const net = Array.from({ length: 12 }, (_, i) => c(`n${i}`, `a${i}`, 10 - i / 10));
      const out = diversify([...net, c("far", "stranger", 0.1, true)]);
      expect(out[9]!.postId).toBe("far");
    });

    it("still fills the feed when one author is all there is", () => {
      const solo = Array.from({ length: 5 }, (_, i) => c(`s${i}`, "solo", 5 - i));
      expect(diversify(solo)).toHaveLength(5);
    });
  });
});
