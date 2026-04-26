import { Test } from "@nestjs/testing";
import { ErrorCode, JobLocationMode, JobType } from "@baydar/shared";

import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { CompaniesService } from "../companies/companies.service";
import { PrismaService } from "../prisma/prisma.service";

import { JobsService } from "./jobs.service";

type PrismaStub = {
  job: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  application: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
};

function buildPrisma(): PrismaStub {
  return {
    job: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    application: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
}

const viewer: AuthUser = {
  id: "u_owner",
  email: "owner@palnet.ps",
  locale: "ar-PS",
  role: "COMPANY_ADMIN",
};

describe("JobsService", () => {
  let service: JobsService;
  let prisma: PrismaStub;
  let companies: { assertCanManage: jest.Mock };

  beforeEach(async () => {
    prisma = buildPrisma();
    companies = { assertCanManage: jest.fn().mockResolvedValue({ id: "co_1" }) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CompaniesService, useValue: companies },
      ],
    }).compile();
    service = moduleRef.get(JobsService);
  });

  it("creates a managed company job with the current user as poster", async () => {
    prisma.job.create.mockResolvedValue({
      id: "job_1",
      companyId: "co_1",
      postedById: viewer.id,
      title: "Backend Engineer",
      description: "A".repeat(40),
      type: JobType.FULL_TIME,
      locationMode: JobLocationMode.HYBRID,
      city: "Ramallah",
      country: "PS",
      salaryMin: 2000,
      salaryMax: 4000,
      salaryCurrency: "ILS",
      skillsRequired: ["NestJS"],
      isActive: true,
      expiresAt: null,
      createdAt: new Date("2026-04-20T10:00:00Z"),
      company: {
        id: "co_1",
        slug: "baydar",
        name: "Baydar",
        tagline: null,
        logoUrl: null,
        city: "Ramallah",
        country: "PS",
        members: [{ role: "OWNER" }],
      },
      applications: [],
    });

    const result = await service.create(viewer, "co_1", {
      title: "Backend Engineer",
      description: "A".repeat(40),
      type: JobType.FULL_TIME,
      locationMode: JobLocationMode.HYBRID,
      city: "Ramallah",
      country: "PS",
      salaryMin: 2000,
      salaryMax: 4000,
      salaryCurrency: "ILS",
      skillsRequired: ["NestJS"],
    });

    expect(companies.assertCanManage).toHaveBeenCalledWith(viewer, "co_1", "ANY_EDITOR");
    expect(result.postedById).toBe(viewer.id);
  });

  it("returns the existing application on idempotent re-apply", async () => {
    prisma.job.findFirst.mockResolvedValue({ id: "job_1", isActive: true });
    prisma.application.findUnique.mockResolvedValue({
      id: "app_1",
      status: "SUBMITTED",
    });

    const result = await service.apply("u_candidate", "job_1", {});

    expect(result.id).toBe("app_1");
    expect(prisma.application.create).not.toHaveBeenCalled();
  });

  it("rejects closed jobs with JOB_CLOSED", async () => {
    prisma.job.findFirst.mockResolvedValue({ id: "job_1", isActive: false });

    await expect(service.apply("u_candidate", "job_1", {})).rejects.toMatchObject({
      code: ErrorCode.JOB_CLOSED,
    });
  });
});
