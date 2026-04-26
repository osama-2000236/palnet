import { Test } from "@nestjs/testing";
import { ErrorCode } from "@baydar/shared";

import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { CompaniesService } from "../companies/companies.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

import { ApplicationsService } from "./applications.service";

type PrismaStub = {
  application: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  job: {
    findFirst: jest.Mock;
  };
};

function buildPrisma(): PrismaStub {
  return {
    application: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    job: {
      findFirst: jest.fn(),
    },
  };
}

const viewer: AuthUser = {
  id: "u_admin",
  email: "admin@palnet.ps",
  locale: "ar-PS",
  role: "COMPANY_ADMIN",
};

function applicationRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "app_1",
    status: "SUBMITTED",
    resumeUrl: null,
    coverLetter: "Hello",
    createdAt: new Date("2026-04-20T10:00:00Z"),
    updatedAt: new Date("2026-04-20T10:00:00Z"),
    applicant: {
      id: "u_candidate",
      profile: {
        handle: "candidate",
        firstName: "Candidate",
        lastName: "One",
        headline: null,
        avatarUrl: null,
      },
    },
    job: {
      id: "job_1",
      title: "Backend Engineer",
      type: "FULL_TIME",
      locationMode: "REMOTE",
      city: "Ramallah",
      companyId: "co_1",
      company: {
        id: "co_1",
        slug: "baydar",
        name: "Baydar",
        tagline: null,
        logoUrl: null,
        city: "Ramallah",
        country: "PS",
        members: [{ role: "ADMIN" }],
      },
    },
    ...overrides,
  };
}

describe("ApplicationsService", () => {
  let service: ApplicationsService;
  let prisma: PrismaStub;
  let companies: { assertCanManage: jest.Mock };
  let notifications: { notify: jest.Mock };

  beforeEach(async () => {
    prisma = buildPrisma();
    companies = { assertCanManage: jest.fn().mockResolvedValue({ id: "co_1" }) };
    notifications = { notify: jest.fn().mockResolvedValue(undefined) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CompaniesService, useValue: companies },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    service = moduleRef.get(ApplicationsService);
  });

  it("lists job applicants after company access passes", async () => {
    prisma.job.findFirst.mockResolvedValue({ id: "job_1" });
    prisma.application.findMany.mockResolvedValue([applicationRow()]);

    const page = await service.listForJob(viewer, "co_1", "job_1", null, 20);

    expect(companies.assertCanManage).toHaveBeenCalledWith(viewer, "co_1", "ANY_EDITOR");
    expect(page.data).toHaveLength(1);
    expect(page.meta.hasMore).toBe(false);
  });

  it("rejects status updates when the viewer cannot manage the company", async () => {
    prisma.application.findUnique.mockResolvedValue(
      applicationRow({
        job: {
          ...applicationRow().job,
          company: {
            ...applicationRow().job.company,
            members: [],
          },
        },
      }),
    );

    await expect(
      service.updateStatus(viewer, "app_1", { status: "REVIEWING" }),
    ).rejects.toMatchObject({ code: ErrorCode.AUTH_FORBIDDEN });
  });

  it("updates application status and emits a JOB_APPLICATION_UPDATE notification", async () => {
    prisma.application.findUnique.mockResolvedValue(applicationRow());
    prisma.application.update.mockResolvedValue(
      applicationRow({
        status: "SHORTLISTED",
        updatedAt: new Date("2026-04-21T10:00:00Z"),
      }),
    );

    const result = await service.updateStatus(viewer, "app_1", {
      status: "SHORTLISTED",
    });

    expect(result.status).toBe("SHORTLISTED");
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "u_candidate",
        type: "JOB_APPLICATION_UPDATE",
      }),
    );
  });
});
