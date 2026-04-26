import { Test } from "@nestjs/testing";
import { ErrorCode, PeopleSearchQuery } from "@palnet/shared";

import { ZodValidationPipe } from "../../common/zod-pipe";
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

function cursor(rank: number, id: string): string {
  return Buffer.from(JSON.stringify({ rank, id }), "utf8").toString("base64url");
}

function queryText(call: unknown[]): string {
  return call
    .flatMap((part) => {
      if (Array.isArray(part)) return part;
      if (part && typeof part === "object" && "strings" in part) {
        return (part as { strings: string[] }).strings;
      }
      return [String(part)];
    })
    .join(" ");
}

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
    expect(page.meta.nextCursor).toBe(cursor(0.7, "p_2"));
  });

  it("applies the (rank,id) cursor without a hits CTE lookup", async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await service.people({ q: "x", limit: 20, after: cursor(0.65, "p_prev") }, null);

    const sql = queryText(prisma.$queryRaw.mock.calls[0]!);
    expect(sql).toContain('p."id" >');
    expect(sql).not.toContain('SELECT "rank" FROM hits');
  });

  it("ranks exact FTS matches before lower-ranked rows", async () => {
    prisma.$queryRaw.mockResolvedValue([
      hit({ id: "p_1", handle: "mohammad-ali" }),
      hit({ id: "p_2", handle: "mohammad-work" }),
    ]);

    const page = await service.people({ q: "محمد", limit: 20 }, null);

    expect(page.data.map((row) => row.handle)).toEqual(["mohammad-ali", "mohammad-work"]);
  });

  it("normalizes Arabic tashkeel and alef variants before querying", async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await service.people({ q: "أحم\u0651د", limit: 20 }, null);

    const call = prisma.$queryRaw.mock.calls[0]!;
    expect(call).toContain("احمد");
  });

  it("rejects punctuation-only queries through API validation", () => {
    const pipe = new ZodValidationPipe(PeopleSearchQuery);

    try {
      pipe.transform({ q: "!", limit: "20" }, {} as never);
      throw new Error("pipe did not throw");
    } catch (err) {
      const payload = (err as { getResponse?: () => unknown }).getResponse?.();
      expect(payload).toMatchObject({
        error: { code: ErrorCode.VALIDATION_FAILED },
      });
    }
  });
});
