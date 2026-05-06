import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";
import { SafetyService } from "../safety/safety.service";

import { SearchService } from "./search.service";

type PrismaStub = {
  profile: { findMany: jest.Mock };
  post: { findMany: jest.Mock };
  job: { findMany: jest.Mock };
};

function buildPrisma(): PrismaStub {
  return {
    profile: { findMany: jest.fn() },
    post: { findMany: jest.fn() },
    job: { findMany: jest.fn() },
  };
}

const hit = (overrides: Partial<{ id: string; handle: string }> = {}) => ({
  id: overrides.id ?? "p_1",
  userId: `u_${overrides.id ?? "1"}`,
  handle: overrides.handle ?? "osama",
  firstName: "Osama",
  lastName: "Hamad",
  headline: null,
  location: null,
  avatarUrl: null,
});

const postHit = (overrides: Partial<{ id: string; authorId: string; body: string }> = {}) => ({
  id: overrides.id ?? "post_1",
  authorId: overrides.authorId ?? "author_1",
  body: overrides.body ?? "Building better hiring search in Arabic.",
  createdAt: new Date("2026-05-05T10:00:00.000Z"),
  author: {
    profile: {
      handle: "muna",
      firstName: "Muna",
      lastName: "Saleh",
      avatarUrl: null,
    },
  },
});

const jobHit = (overrides: Partial<{ id: string }> = {}) => ({
  id: overrides.id ?? "job_1",
  title: "Product Engineer",
  type: "FULL_TIME",
  locationMode: "HYBRID",
  city: "Ramallah",
  country: "PS",
  createdAt: new Date("2026-05-05T10:00:00.000Z"),
  company: { name: "Baydar", logoUrl: null },
});

describe("SearchService", () => {
  let service: SearchService;
  let prisma: PrismaStub;
  let safety: { getBlockedEitherIds: jest.Mock };

  beforeEach(async () => {
    prisma = buildPrisma();
    safety = { getBlockedEitherIds: jest.fn().mockResolvedValue([]) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: prisma },
        { provide: SafetyService, useValue: safety },
      ],
    }).compile();
    service = moduleRef.get(SearchService);
  });

  it("returns hits with pagination metadata (happy path)", async () => {
    prisma.profile.findMany.mockResolvedValue([hit()]);

    const page = await service.people("viewer", { q: "osama", limit: 20 });

    expect(page.data).toHaveLength(1);
    expect(page.data[0]?.handle).toBe("osama");
    expect(page.meta.hasMore).toBe(false);
    expect(page.meta.nextCursor).toBeNull();
  });

  it("detects hasMore by overfetching limit + 1 and trims", async () => {
    // limit=2 + 1 overfetch = 3 rows back
    prisma.profile.findMany.mockResolvedValue([
      hit({ id: "p_1", handle: "a" }),
      hit({ id: "p_2", handle: "b" }),
      hit({ id: "p_3", handle: "c" }),
    ]);

    const page = await service.people("viewer", { q: "z", limit: 2 });

    expect(page.data).toHaveLength(2);
    expect(page.meta.hasMore).toBe(true);
    expect(page.meta.nextCursor).toBe("p_2");
  });

  it("forwards cursor + skip when `after` is provided", async () => {
    prisma.profile.findMany.mockResolvedValue([]);

    await service.people("viewer", { q: "x", limit: 20, after: "p_prev" });

    expect(prisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: "p_prev" },
        skip: 1,
      }),
    );
  });

  it("excludes blocked users at the Prisma query layer", async () => {
    safety.getBlockedEitherIds.mockResolvedValue(["blocked_1"]);
    prisma.profile.findMany.mockResolvedValue([]);

    await service.people("viewer", { q: "x", limit: 20 });

    expect(prisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: { notIn: ["blocked_1"] } }),
      }),
    );
  });

  it("excludes deleted users at the people search query layer", async () => {
    prisma.profile.findMany.mockResolvedValue([]);

    await service.people("viewer", { q: "x", limit: 20 });

    expect(prisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ user: { deletedAt: null } }),
      }),
    );
  });

  it("searches posts and maps author metadata plus body excerpt", async () => {
    prisma.post.findMany.mockResolvedValue([postHit()]);

    const page = await service.searchPosts("viewer", { q: "hiring", limit: 20 });

    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          body: { contains: "hiring", mode: "insensitive" },
          deletedAt: null,
        }),
      }),
    );
    expect(page.data).toEqual([
      expect.objectContaining({
        id: "post_1",
        authorId: "author_1",
        authorHandle: "muna",
        authorDisplayName: "Muna Saleh",
        bodyExcerpt: "Building better hiring search in Arabic.",
        createdAt: "2026-05-05T10:00:00.000Z",
      }),
    ]);
  });

  it("excludes blocked post authors at the Prisma query layer", async () => {
    safety.getBlockedEitherIds.mockResolvedValue(["blocked_author"]);
    prisma.post.findMany.mockResolvedValue([]);

    await service.searchPosts("viewer", { q: "x", limit: 20 });

    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ authorId: { notIn: ["blocked_author"] } }),
      }),
    );
  });

  it("searches only active and unexpired jobs", async () => {
    prisma.job.findMany.mockResolvedValue([jobHit()]);

    const page = await service.searchJobs("viewer", { q: "engineer", limit: 20 });

    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          deletedAt: null,
          AND: [
            {
              OR: [
                { title: { contains: "engineer", mode: "insensitive" } },
                { description: { contains: "engineer", mode: "insensitive" } },
              ],
            },
            { OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }] },
          ],
        }),
      }),
    );
    expect(page.data).toEqual([
      expect.objectContaining({
        id: "job_1",
        title: "Product Engineer",
        companyName: "Baydar",
        locationMode: "HYBRID",
        type: "FULL_TIME",
      }),
    ]);
  });
});
