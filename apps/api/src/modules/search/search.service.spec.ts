import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";
import { SafetyService } from "../safety/safety.service";

import { SearchService } from "./search.service";

type PrismaStub = {
  profile: { findMany: jest.Mock };
};

function buildPrisma(): PrismaStub {
  return { profile: { findMany: jest.fn() } };
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
});
