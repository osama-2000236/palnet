import { ErrorCode } from "@baydar/shared";
import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";

import { JobsService } from "./jobs.service";

type PrismaStub = {
  job: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
  };
  application: {
    upsert: jest.Mock;
  };
};

function buildPrisma(): PrismaStub {
  return {
    job: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    application: {
      upsert: jest.fn(),
    },
  };
}

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

  describe("apply", () => {
    it("atomically creates or returns a submitted application for an active job", async () => {
      prisma.job.findFirst.mockResolvedValue({ id: "job_1" });
      prisma.application.upsert.mockResolvedValue({ id: "app_1", status: "SUBMITTED" });

      const result = await service.apply("user_1", "job_1", {
        coverLetter: "I can help with React Native and Node.js.",
      });

      expect(result).toEqual({ id: "app_1", status: "SUBMITTED" });
      expect(prisma.application.upsert).toHaveBeenCalledWith({
        where: { jobId_applicantId: { jobId: "job_1", applicantId: "user_1" } },
        update: {},
        create: {
          jobId: "job_1",
          applicantId: "user_1",
          resumeUrl: null,
          coverLetter: "I can help with React Native and Node.js.",
        },
        select: { id: true, status: true },
      });
    });

    it("leaves an existing application unchanged when the user reapplies", async () => {
      prisma.job.findFirst.mockResolvedValue({ id: "job_1" });
      prisma.application.upsert.mockResolvedValue({ id: "app_existing", status: "SUBMITTED" });

      await expect(service.apply("user_1", "job_1", {})).resolves.toEqual({
        id: "app_existing",
        status: "SUBMITTED",
      });
      expect(prisma.application.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: {} }),
      );
    });

    it("404s when the job is unavailable", async () => {
      prisma.job.findFirst.mockResolvedValue(null);

      await expect(service.apply("user_1", "job_missing", {})).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });
});
