import { BookmarkType, ErrorCode } from "@baydar/shared";
import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";

import { BookmarksService } from "./bookmarks.service";

type PrismaStub = {
  bookmark: {
    create: jest.Mock;
    deleteMany: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
  };
  job: { findFirst: jest.Mock };
  post: { findFirst: jest.Mock };
};

function buildPrisma(): PrismaStub {
  return {
    bookmark: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    job: { findFirst: jest.fn() },
    post: { findFirst: jest.fn() },
  };
}

describe("BookmarksService", () => {
  let service: BookmarksService;
  let prisma: PrismaStub;

  beforeEach(async () => {
    prisma = buildPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [BookmarksService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(BookmarksService);
  });

  it("creates a post bookmark from a server-owned target", async () => {
    prisma.post.findFirst.mockResolvedValue({ id: "post_1" });
    prisma.bookmark.findFirst.mockResolvedValue(null);
    prisma.bookmark.create.mockResolvedValue(makePostBookmark());

    const result = await service.create("user_1", {
      type: BookmarkType.POST,
      targetId: "post_1",
    });

    expect(prisma.bookmark.create).toHaveBeenCalledWith({
      data: { userId: "user_1", type: BookmarkType.POST, postId: "post_1" },
      include: expect.any(Object),
    });
    expect(result).toMatchObject({
      id: "bm_1",
      type: BookmarkType.POST,
      targetId: "post_1",
      title: "Mona Saleh",
      href: "/feed?postId=post_1",
    });
  });

  it("returns an existing bookmark when the target is already saved", async () => {
    prisma.job.findFirst.mockResolvedValue({ id: "job_1" });
    prisma.bookmark.findFirst.mockResolvedValue(makeJobBookmark());

    await expect(
      service.create("user_1", { type: BookmarkType.JOB, targetId: "job_1" }),
    ).resolves.toMatchObject({
      id: "bm_job",
      type: BookmarkType.JOB,
      targetId: "job_1",
      title: "Frontend Engineer",
    });
    expect(prisma.bookmark.create).not.toHaveBeenCalled();
  });

  it("404s when the target is not visible", async () => {
    prisma.post.findFirst.mockResolvedValue(null);

    await expect(
      service.create("user_1", { type: BookmarkType.POST, targetId: "post_missing" }),
    ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
  });

  it("lists only live bookmarks and keeps the cursor envelope", async () => {
    prisma.bookmark.findMany.mockResolvedValue([makePostBookmark(), makeJobBookmark()]);

    const result = await service.list("user_1", {
      after: null,
      limit: 1,
      type: null,
    });

    expect(prisma.bookmark.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user_1",
          OR: expect.any(Array),
        }),
        take: 2,
      }),
    );
    expect(result.meta).toEqual({ nextCursor: "bm_1", hasMore: true, limit: 1 });
    expect(result.data).toHaveLength(1);
  });

  it("falls back to the poster when a saved job has no company", async () => {
    prisma.bookmark.findMany.mockResolvedValue([makeIndividualJobBookmark()]);

    const result = await service.list("user_1", { after: null, limit: 10, type: null });

    expect(result.data[0]).toEqual(
      expect.objectContaining({
        subtitle: "رشا عبد",
        imageUrl: "https://cdn.example.com/rasha.png",
      }),
    );
  });

  it("still prefers the company over the poster when the job has one", async () => {
    prisma.bookmark.findMany.mockResolvedValue([makeJobBookmark()]);

    const result = await service.list("user_1", { after: null, limit: 10, type: null });

    expect(result.data[0]).toEqual(
      expect.objectContaining({
        subtitle: "Nimbus Cloud",
        imageUrl: "https://cdn.example.com/nimbus.png",
      }),
    );
  });

  it("removes only the viewer-owned bookmark row", async () => {
    prisma.bookmark.deleteMany.mockResolvedValue({ count: 1 });

    await service.remove("user_1", "bm_1");

    expect(prisma.bookmark.deleteMany).toHaveBeenCalledWith({
      where: { id: "bm_1", userId: "user_1" },
    });
  });
});

function makePostBookmark() {
  return {
    id: "bm_1",
    userId: "user_1",
    type: BookmarkType.POST,
    postId: "post_1",
    jobId: null,
    createdAt: new Date("2026-06-14T00:00:00.000Z"),
    post: {
      id: "post_1",
      body: "Strong launch note for regional cloud teams.",
      author: {
        deletedAt: null,
        profile: {
          handle: "mona",
          firstName: "Mona",
          lastName: "Saleh",
          avatarUrl: "https://cdn.example.com/mona.png",
        },
      },
    },
    job: null,
  };
}

function makeJobBookmark() {
  return {
    id: "bm_job",
    userId: "user_1",
    type: BookmarkType.JOB,
    postId: null,
    jobId: "job_1",
    createdAt: new Date("2026-06-13T00:00:00.000Z"),
    post: null,
    job: {
      id: "job_1",
      title: "Frontend Engineer",
      city: "Ramallah",
      locationMode: "HYBRID",
      type: "FULL_TIME",
      company: {
        id: "co_1",
        slug: "nimbus-cloud",
        name: "Nimbus Cloud",
        logoUrl: "https://cdn.example.com/nimbus.png",
      },
      postedBy: {
        profile: {
          handle: "rasha",
          firstName: "رشا",
          lastName: "عبد",
          avatarUrl: "https://cdn.example.com/rasha.png",
        },
      },
    },
  };
}

/** Individual-posted work: `Job.companyId` is nullable, so `company` is absent. */
function makeIndividualJobBookmark() {
  const row = makeJobBookmark();
  return { ...row, job: { ...row.job, company: null } };
}
