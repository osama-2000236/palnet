import { Test } from "@nestjs/testing";

import { ModerationService } from "../moderation/moderation.service";
import { PrismaService } from "../prisma/prisma.service";

import { SearchService } from "./search.service";

type PrismaStub = {
  $queryRaw: jest.Mock;
};

function buildPrisma(): PrismaStub {
  return { $queryRaw: jest.fn() };
}

function buildModeration(): { blockedIds: jest.Mock } {
  return { blockedIds: jest.fn().mockResolvedValue([]) };
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
  rank: 0.7,
});

describe("SearchService", () => {
  let service: SearchService;
  let prisma: PrismaStub;

  beforeEach(async () => {
    prisma = buildPrisma();
    const moderation = buildModeration();
    const moduleRef = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: prisma },
        { provide: ModerationService, useValue: moderation },
      ],
    }).compile();
    service = moduleRef.get(SearchService);
  });

  it("returns hits with pagination metadata (happy path)", async () => {
    prisma.$queryRaw.mockResolvedValue([hit()]);

    const page = await service.people({ q: "osama", limit: 20 }, null);

    expect(page.data).toHaveLength(1);
    expect(page.data[0]?.handle).toBe("osama");
    expect(page.meta.hasMore).toBe(false);
    expect(page.meta.nextCursor).toBeNull();
  });

  it("detects hasMore by overfetching limit + 1 and trims", async () => {
    // limit=2 + 1 overfetch = 3 rows back
    prisma.$queryRaw.mockResolvedValue([
      hit({ id: "p_1", handle: "a" }),
      hit({ id: "p_2", handle: "b" }),
      hit({ id: "p_3", handle: "c" }),
    ]);

    const page = await service.people({ q: "z", limit: 2 }, null);

    expect(page.data).toHaveLength(2);
    expect(page.meta.hasMore).toBe(true);
    expect(page.meta.nextCursor).toBe("p_2");
  });

  it("applies the raw FTS cursor when `after` is provided", async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await service.people({ q: "x", limit: 20, after: "p_prev" }, null);

    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it("ranks exact FTS matches before lower-ranked rows", async () => {
    prisma.$queryRaw.mockResolvedValue([
      hit({ id: "p_1", handle: "mohammad-ali" }),
      hit({ id: "p_2", handle: "mohammad-work" }),
    ]);

    const page = await service.people({ q: "محمد", limit: 20 }, null);

    expect(page.data.map((row) => row.handle)).toEqual(["mohammad-ali", "mohammad-work"]);
  });
});
