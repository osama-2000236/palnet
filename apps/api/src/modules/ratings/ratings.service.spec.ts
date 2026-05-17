import { ErrorCode } from "@baydar/shared";
import { Test } from "@nestjs/testing";

import { KaramaService } from "../karama/karama.service";
import { PrismaService } from "../prisma/prisma.service";

import { RatingsService } from "./ratings.service";

type PrismaStub = {
  application: { findUnique: jest.Mock };
  companyMember: { findFirst: jest.Mock };
  userRating: {
    findFirst: jest.Mock;
    create: jest.Mock;
    findMany: jest.Mock;
    aggregate: jest.Mock;
  };
};

function ratingRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "r_1",
    raterId: "u_rater",
    rateeId: "u_ratee",
    context: "EMPLOYER_RATES_CANDIDATE",
    score: 5,
    comment: null,
    jobId: null,
    applicationId: null,
    createdAt: new Date("2026-04-18T10:00:00Z"),
    rater: {
      id: "u_rater",
      profile: {
        handle: "rater",
        firstName: "R",
        lastName: "One",
        avatarUrl: null,
      },
    },
    ...overrides,
  };
}

describe("RatingsService", () => {
  let service: RatingsService;
  let prisma: PrismaStub;
  let karama: { award: jest.Mock };

  beforeEach(async () => {
    prisma = {
      application: { findUnique: jest.fn() },
      companyMember: { findFirst: jest.fn() },
      userRating: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        aggregate: jest.fn(),
      },
    };
    karama = { award: jest.fn().mockResolvedValue(undefined) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        RatingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: KaramaService, useValue: karama },
      ],
    }).compile();
    service = moduleRef.get(RatingsService);
  });

  describe("create", () => {
    it("rejects self-ratings", async () => {
      await expect(
        service.create("u_me", {
          rateeId: "u_me",
          context: "EMPLOYER_RATES_CANDIDATE",
          score: 5,
        }),
      ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
    });

    it("rejects employer-rates-candidate when rater is not a company member", async () => {
      prisma.application.findUnique.mockResolvedValue({
        applicantId: "u_candidate",
        job: { companyId: "co_1", postedById: "u_poster" },
      });
      prisma.companyMember.findFirst.mockResolvedValue(null);

      await expect(
        service.create("u_outsider", {
          rateeId: "u_candidate",
          context: "EMPLOYER_RATES_CANDIDATE",
          applicationId: "app_1",
          score: 5,
        }),
      ).rejects.toMatchObject({ code: ErrorCode.AUTH_FORBIDDEN });
    });

    it("rejects candidate-rates-employer when ratee is not the job poster", async () => {
      prisma.application.findUnique.mockResolvedValue({
        applicantId: "u_me",
        job: { companyId: "co_1", postedById: "u_poster" },
      });

      await expect(
        service.create("u_me", {
          rateeId: "u_someone_else",
          context: "CANDIDATE_RATES_EMPLOYER",
          applicationId: "app_1",
          score: 5,
        }),
      ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
    });

    it("409s when the rater has already rated for the same (context, jobId)", async () => {
      prisma.userRating.findFirst.mockResolvedValue({ id: "existing" });
      await expect(
        service.create("u_me", {
          rateeId: "u_other",
          context: "EMPLOYER_RATES_CANDIDATE",
          score: 5,
        }),
      ).rejects.toMatchObject({ code: ErrorCode.CONFLICT });
    });

    it("awards Karama at full payout for a 5-star rating", async () => {
      prisma.userRating.findFirst.mockResolvedValue(null);
      prisma.userRating.create.mockResolvedValue(ratingRow({ score: 5 }));

      await service.create("u_me", {
        rateeId: "u_ratee",
        context: "EMPLOYER_RATES_CANDIDATE",
        score: 5,
      });

      expect(karama.award).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "u_ratee",
          reason: "RATING_RECEIVED",
          delta: undefined,
        }),
      );
    });

    it("awards half Karama for a 4-star rating", async () => {
      prisma.userRating.findFirst.mockResolvedValue(null);
      prisma.userRating.create.mockResolvedValue(ratingRow({ score: 4 }));

      await service.create("u_me", {
        rateeId: "u_ratee",
        context: "EMPLOYER_RATES_CANDIDATE",
        score: 4,
      });

      expect(karama.award).toHaveBeenCalledWith(expect.objectContaining({ delta: 15 }));
    });

    it("does not award Karama below 4 stars", async () => {
      prisma.userRating.findFirst.mockResolvedValue(null);
      prisma.userRating.create.mockResolvedValue(ratingRow({ score: 3 }));

      await service.create("u_me", {
        rateeId: "u_ratee",
        context: "EMPLOYER_RATES_CANDIDATE",
        score: 3,
      });

      expect(karama.award).not.toHaveBeenCalled();
    });
  });

  describe("listForUser", () => {
    it("caps the take at 50 even when the caller asks for more", async () => {
      prisma.userRating.findMany.mockResolvedValue([]);
      await service.listForUser("u_ratee", null, 9999);
      expect(prisma.userRating.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });

    it("filters by context when provided", async () => {
      prisma.userRating.findMany.mockResolvedValue([]);
      await service.listForUser("u_ratee", "CANDIDATE_RATES_EMPLOYER", 10);
      expect(prisma.userRating.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { rateeId: "u_ratee", context: "CANDIDATE_RATES_EMPLOYER" },
        }),
      );
    });
  });

  describe("summary", () => {
    it("returns average=0 and count=0 when nobody has rated yet", async () => {
      prisma.userRating.aggregate.mockResolvedValue({ _avg: { score: null }, _count: { _all: 0 } });
      const out = await service.summary("u_ratee", "EMPLOYER_RATES_CANDIDATE");
      expect(out).toEqual({
        userId: "u_ratee",
        context: "EMPLOYER_RATES_CANDIDATE",
        average: 0,
        count: 0,
      });
    });

    it("passes through Prisma aggregate output verbatim", async () => {
      prisma.userRating.aggregate.mockResolvedValue({
        _avg: { score: 4.5 },
        _count: { _all: 12 },
      });
      const out = await service.summary("u_ratee", "EMPLOYER_RATES_CANDIDATE");
      expect(out.average).toBe(4.5);
      expect(out.count).toBe(12);
    });
  });
});
