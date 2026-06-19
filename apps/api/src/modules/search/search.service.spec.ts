import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";
import { SafetyService } from "../safety/safety.service";

import { SearchService } from "./search.service";

type PrismaStub = {
  profile: { findUnique: jest.Mock };
  post: { findUnique: jest.Mock };
  job: { findUnique: jest.Mock };
  company: { findUnique: jest.Mock };
  $queryRaw: jest.Mock;
};

function buildPrisma(): PrismaStub {
  return {
    profile: { findUnique: jest.fn() },
    post: { findUnique: jest.fn() },
    job: { findUnique: jest.fn() },
    company: { findUnique: jest.fn() },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
}

const personRow = (overrides: Partial<{ id: string; handle: string }> = {}) => ({
  id: overrides.id ?? "p_1",
  userId: `u_${overrides.id ?? "1"}`,
  handle: overrides.handle ?? "osama",
  firstName: "Osama",
  lastName: "Hamad",
  headline: null,
  location: null,
  avatarUrl: null,
});

const postRow = (overrides: Partial<{ id: string; authorId: string; body: string }> = {}) => ({
  id: overrides.id ?? "post_1",
  authorId: overrides.authorId ?? "author_1",
  body: overrides.body ?? "Building better hiring search in Arabic.",
  createdAt: new Date("2026-05-05T10:00:00.000Z"),
  authorDeletedAt: null,
  authorHandle: "muna",
  authorFirstName: "Muna",
  authorLastName: "Saleh",
  authorAvatarUrl: null,
});

const jobRow = (overrides: Partial<{ id: string }> = {}) => ({
  id: overrides.id ?? "job_1",
  title: "Product Engineer",
  type: "FULL_TIME",
  locationMode: "HYBRID",
  city: "Ramallah",
  country: "PS",
  createdAt: new Date("2026-05-05T10:00:00.000Z"),
  companyName: "Baydar",
  companyLogoUrl: null,
});

const companyRow = (overrides: Partial<{ id: string; name: string }> = {}) => ({
  id: overrides.id ?? "company_1",
  slug: "baydar",
  name: overrides.name ?? "Baydar",
  tagline: "Arabic-first professional network",
  industry: "Technology",
  city: "Ramallah",
  country: "PS",
  logoUrl: null,
  verified: true,
});

/**
 * Pulls the SQL string fragments handed to $queryRaw out of the
 * `Prisma.sql` template object so tests can assert on substrings without
 * caring about whitespace. The Prisma helper exposes the literal pieces as
 * `.strings` plus a `.values` array — we only need the strings here.
 */
function rawSqlFromCall(call: unknown[]): string {
  const arg = call[0] as { strings?: ArrayLike<string> } | { sql?: string };
  if ("strings" in arg && arg.strings) {
    return Array.from(arg.strings).join(" ");
  }
  return ("sql" in arg ? arg.sql : "") ?? "";
}

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
    prisma.$queryRaw.mockResolvedValue([personRow()]);

    const page = await service.people("viewer", { q: "osama", limit: 20 });

    expect(page.data).toHaveLength(1);
    expect(page.data[0]?.handle).toBe("osama");
    expect(page.meta.hasMore).toBe(false);
    expect(page.meta.nextCursor).toBeNull();
  });

  it("detects hasMore by overfetching limit + 1 and trims", async () => {
    prisma.$queryRaw.mockResolvedValue([
      personRow({ id: "p_1", handle: "a" }),
      personRow({ id: "p_2", handle: "b" }),
      personRow({ id: "p_3", handle: "c" }),
    ]);

    const page = await service.people("viewer", { q: "z", limit: 2 });

    expect(page.data).toHaveLength(2);
    expect(page.meta.hasMore).toBe(true);
    expect(page.meta.nextCursor).toBe("p_2");
  });

  it("resolves the cursor row when `after` is provided", async () => {
    prisma.profile.findUnique.mockResolvedValue({ handle: "prev", id: "p_prev" });
    prisma.$queryRaw.mockResolvedValue([]);

    await service.people("viewer", { q: "x", limit: 20, after: "p_prev" });

    expect(prisma.profile.findUnique).toHaveBeenCalledWith({
      where: { id: "p_prev" },
      select: { handle: true, id: true },
    });
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it("searches companies over name/slug/tagline/industry with a live-jobs count", async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        id: "comp_1",
        slug: "baydar-labs",
        name: "Baydar Labs",
        tagline: "بيدر للتقنية",
        industry: "Software",
        city: "Ramallah",
        country: "PS",
        logoUrl: null,
        verified: true,
        activeJobs: 3n,
      },
    ]);

    const page = await service.searchCompanies("viewer", { q: "baydar", limit: 20 });

    expect(page.data[0]).toMatchObject({
      slug: "baydar-labs",
      verified: true,
      activeJobs: 3,
    });
    const sql = rawSqlFromCall(prisma.$queryRaw.mock.calls[0]!);
    expect(sql).toMatch(/"Company"/);
    expect(sql).toMatch(/to_tsvector\(/);
    expect(sql).toMatch(/"industry"/);
    expect(sql).toMatch(/COUNT\(\*\)/);
  });

  it("uses a tsquery FTS predicate for people search", async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await service.people("viewer", { q: "ramallah", limit: 20 });

    const sql = rawSqlFromCall(prisma.$queryRaw.mock.calls[0]!);
    expect(sql).toMatch(/to_tsvector\(/);
    expect(sql).toMatch(/plainto_tsquery\(/);
    expect(sql).toMatch(/"User"/);
    expect(sql).toMatch(/"deletedAt" IS NULL/);
  });

  it("appends the blocked-id NOT IN predicate when safety reports blocks", async () => {
    safety.getBlockedEitherIds.mockResolvedValue(["blocked_1"]);
    prisma.$queryRaw.mockResolvedValue([]);

    await service.people("viewer", { q: "x", limit: 20 });

    const sql = rawSqlFromCall(prisma.$queryRaw.mock.calls[0]!);
    expect(sql).toMatch(/NOT IN/);
  });

  it("searches posts via tsquery and maps author metadata + excerpt", async () => {
    prisma.$queryRaw.mockResolvedValue([postRow()]);

    const page = await service.searchPosts("viewer", { q: "hiring", limit: 20 });

    const sql = rawSqlFromCall(prisma.$queryRaw.mock.calls[0]!);
    expect(sql).toMatch(/to_tsvector\('simple', COALESCE\(po\."body"/);
    expect(sql).toMatch(/plainto_tsquery/);
    expect(sql).toMatch(/au\."deletedAt"\s+IS\s+NULL/);
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

  it("excludes blocked post authors via a NOT IN clause", async () => {
    safety.getBlockedEitherIds.mockResolvedValue(["blocked_author"]);
    prisma.$queryRaw.mockResolvedValue([]);

    await service.searchPosts("viewer", { q: "x", limit: 20 });

    const sql = rawSqlFromCall(prisma.$queryRaw.mock.calls[0]!);
    expect(sql).toMatch(/NOT IN/);
  });

  it("searches only active and unexpired jobs", async () => {
    prisma.$queryRaw.mockResolvedValue([jobRow()]);

    const page = await service.searchJobs("viewer", { q: "engineer", limit: 20 });

    const sql = rawSqlFromCall(prisma.$queryRaw.mock.calls[0]!);
    expect(sql).toMatch(/"isActive"\s+=\s+TRUE/);
    expect(sql).toMatch(/"deletedAt" IS NULL/);
    expect(sql).toMatch(/"expiresAt" IS NULL OR/);
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

  it("searches companies via tsquery and maps public company metadata", async () => {
    prisma.$queryRaw.mockResolvedValue([companyRow()]);

    const page = await service.searchCompanies("viewer", { q: "baydar", limit: 20 });

    const sql = rawSqlFromCall(prisma.$queryRaw.mock.calls[0]!);
    expect(sql).toMatch(/FROM\s+"Company"/);
    expect(sql).toMatch(/to_tsvector\(/);
    expect(sql).toMatch(/plainto_tsquery/);
    expect(page.data).toEqual([
      expect.objectContaining({
        id: "company_1",
        slug: "baydar",
        name: "Baydar",
        industry: "Technology",
        verified: true,
      }),
    ]);
  });

  it("resolves the company cursor row when `after` is provided", async () => {
    prisma.company.findUnique.mockResolvedValue({ name: "Baydar", id: "company_1" });
    prisma.$queryRaw.mockResolvedValue([]);

    await service.searchCompanies("viewer", { q: "x", limit: 20, after: "company_1" });

    expect(prisma.company.findUnique).toHaveBeenCalledWith({
      where: { id: "company_1" },
      select: { name: true, id: true },
    });
  });
});
