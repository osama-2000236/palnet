import { ErrorCode } from "@baydar/shared";
import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";

import { JobsService } from "./jobs.service";

type PrismaStub = {
  $queryRaw: jest.Mock;
  job: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
  };
  application: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findUniqueOrThrow: jest.Mock;
  };
};

function buildPrisma(): PrismaStub {
  return {
    $queryRaw: jest.fn(),
    job: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    application: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
  };
}

// Zod .default() makes these required on the parsed body, so the minimal
// application is not `{}`.
const EMPTY_APPLY = { attachedProofIds: [], portfolioPostIds: [] };

describe("JobsService", () => {
  let service: JobsService;
  let prisma: PrismaStub;

  beforeEach(async () => {
    prisma = buildPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [JobsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(JobsService);
  });

  describe("list", () => {
    it("prefilters q through the folded ILIKE raw query and drops the naive contains OR", async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: "job_1" }]);
      prisma.job.findMany.mockResolvedValue([]);

      await service.list("user_1", null, 20, { q: "مبرمجة 100%" });

      const sqlArg = prisma.$queryRaw.mock.calls[0]![0] as {
        strings: string[];
        values: unknown[];
      };
      expect(sqlArg.strings.join("?")).toMatch(/baydar_fold/);
      // LIKE wildcards in user input arrive escaped.
      expect(sqlArg.values).toContain("مبرمجة 100\\%");

      const where = prisma.job.findMany.mock.calls[0]![0].where;
      expect(where.id).toEqual({ in: ["job_1"] });
      expect(where.OR).toBeUndefined();
    });

    it("short-circuits to an empty page when no job matches q", async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const page = await service.list("user_1", null, 20, { q: "زيتون" });

      expect(page).toEqual({ data: [], meta: { nextCursor: null, hasMore: false, limit: 20 } });
      expect(prisma.job.findMany).not.toHaveBeenCalled();
    });

    it("skips the raw prefilter entirely when q is absent", async () => {
      prisma.job.findMany.mockResolvedValue([]);

      await service.list("user_1", null, 20, { city: "رام الله" });

      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it("filters by company industry when the sector facet is set", async () => {
      prisma.job.findMany.mockResolvedValue([]);

      await service.list("user_1", null, 20, { industry: "منظمات أهلية وغير حكومية" });

      const where = prisma.job.findMany.mock.calls[0]![0].where;
      expect(where.company).toEqual({
        industry: { contains: "منظمات أهلية وغير حكومية", mode: "insensitive" },
      });
    });
  });

  describe("apply", () => {
    it("creates a submitted application for an active job", async () => {
      prisma.job.findFirst.mockResolvedValue({ id: "job_1" });
      prisma.application.findUnique.mockResolvedValue(null);
      prisma.application.create.mockResolvedValue({ id: "app_1", status: "SUBMITTED" });

      const result = await service.apply("user_1", "job_1", {
        coverLetter: "I can help with React Native and Node.js.",
        attachedProofIds: [],
        portfolioPostIds: [],
      });

      expect(result).toEqual({ id: "app_1", status: "SUBMITTED" });
      expect(prisma.application.create).toHaveBeenCalledWith({
        data: {
          jobId: "job_1",
          applicantId: "user_1",
          resumeUrl: null,
          coverLetter: "I can help with React Native and Node.js.",
        },
        select: { id: true, status: true },
      });
    });

    it("returns the existing application when the user reapplies", async () => {
      prisma.job.findFirst.mockResolvedValue({ id: "job_1" });
      prisma.application.findUnique.mockResolvedValue({ id: "app_existing", status: "SUBMITTED" });

      await expect(service.apply("user_1", "job_1", EMPTY_APPLY)).resolves.toEqual({
        id: "app_existing",
        status: "SUBMITTED",
      });
      expect(prisma.application.create).not.toHaveBeenCalled();
    });

    it("stays idempotent when a concurrent apply wins the unique race", async () => {
      prisma.job.findFirst.mockResolvedValue({ id: "job_1" });
      prisma.application.findUnique.mockResolvedValue(null);
      prisma.application.create.mockRejectedValue({ code: "P2002" });
      prisma.application.findUniqueOrThrow.mockResolvedValue({
        id: "app_winner",
        status: "SUBMITTED",
      });

      await expect(service.apply("user_1", "job_1", EMPTY_APPLY)).resolves.toEqual({
        id: "app_winner",
        status: "SUBMITTED",
      });
    });

    it("404s when the job is unavailable", async () => {
      prisma.job.findFirst.mockResolvedValue(null);

      await expect(service.apply("user_1", "job_missing", EMPTY_APPLY)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });
});
