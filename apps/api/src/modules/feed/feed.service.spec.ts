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
