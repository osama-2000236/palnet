import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";
import { SafetyService } from "../safety/safety.service";

import { FeedService } from "./feed.service";

type PrismaStub = {
  connection: { findMany: jest.Mock };
  post: { findMany: jest.Mock };
};

describe("FeedService", () => {
  let service: FeedService;
  let prisma: PrismaStub;
  let safety: { getBlockedEitherIds: jest.Mock };

  beforeEach(async () => {
    prisma = {
      connection: { findMany: jest.fn() },
      post: { findMany: jest.fn() },
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

  it("filters blocked and blocker authors at the Prisma query layer", async () => {
    prisma.connection.findMany.mockResolvedValue([
      { requesterId: "viewer", receiverId: "blocked_by_viewer" },
      { requesterId: "blocked_viewer", receiverId: "viewer" },
      { requesterId: "viewer", receiverId: "visible" },
    ]);
    safety.getBlockedEitherIds.mockResolvedValue(["blocked_by_viewer", "blocked_viewer"]);
    prisma.post.findMany.mockResolvedValue([]);

    await service.getFeed("viewer", null, 20);

    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          authorId: { in: ["viewer", "visible"] },
        },
      }),
    );
  });
});
