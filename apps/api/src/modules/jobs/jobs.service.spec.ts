import { ErrorCode } from "@baydar/shared";
import { Test } from "@nestjs/testing";

import { NotificationsService } from "../notifications/notifications.service";
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

const LIVE_WINDOW = [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }];

describe("JobsService", () => {
  let service: JobsService;
  let prisma: PrismaStub;
  let notify: jest.Mock;

  beforeEach(async () => {
    prisma = buildPrisma();
    notify = jest.fn().mockResolvedValue(undefined);
    const moduleRef = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: { notify } },
      ],
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
      expect(sqlArg.strings.join("?")).toMatch(/"expiresAt" IS NULL OR "expiresAt" > NOW\(\)/);
      // LIKE wildcards in user input arrive escaped.
      expect(sqlArg.values).toContain("مبرمجة 100\\%");

      const where = prisma.job.findMany.mock.calls[0]![0].where;
      expect(where.id).toEqual({ in: ["job_1"] });
      // The only OR left is the expiry window, not a naive title/description contains.
      expect(where.OR).toEqual(LIVE_WINDOW);
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

  describe("expiry", () => {
    it("hides jobs past expiresAt from the board", async () => {
      prisma.job.findMany.mockResolvedValue([]);

      await service.list("user_1", null, 20, {});

      const where = prisma.job.findMany.mock.calls[0]![0].where;
      expect(where).toMatchObject({ isActive: true, deletedAt: null, OR: LIVE_WINDOW });
    });

    it("refuses applications to an expired job", async () => {
      prisma.job.findFirst.mockResolvedValue(null);

      await expect(service.apply("user_1", "job_old", EMPTY_APPLY)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
      expect(prisma.job.findFirst.mock.calls[0]![0].where).toMatchObject({
        id: "job_old",
        isActive: true,
        OR: LIVE_WINDOW,
      });
    });
  });

  describe("apply", () => {
    // Applying used to tell nobody: the poster found applicants only by
    // opening the applicants page on a hunch.
    it("tells the poster about a new applicant, once", async () => {
      prisma.job.findFirst.mockResolvedValue({
        id: "job_1",
        title: "كهربائي",
        postedById: "poster_1",
        company: { slug: "acme" },
      });
      prisma.application.findUnique.mockResolvedValue(null);
      prisma.application.create.mockResolvedValue({ id: "app_1", status: "SUBMITTED" });

      await service.apply("user_1", "job_1", EMPTY_APPLY);

      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith({
        type: "JOB_APPLICATION_RECEIVED",
        recipientId: "poster_1",
        actorId: "user_1",
        jobId: "job_1",
        data: { applicationId: "app_1", jobTitle: "كهربائي", companySlug: "acme" },
      });

      notify.mockClear();
      prisma.application.findUnique.mockResolvedValue({ id: "app_1", status: "SUBMITTED" });
      await service.apply("user_1", "job_1", EMPTY_APPLY);
      expect(notify).not.toHaveBeenCalled();
    });

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
