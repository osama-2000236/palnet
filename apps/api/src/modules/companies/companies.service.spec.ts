import { type ApplicationStatus, ErrorCode } from "@baydar/shared";
import { Test } from "@nestjs/testing";

import { EmployerEntitlementsService } from "../billing/employer-entitlements.service";
import { KaramaService } from "../karama/karama.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

import { CompaniesService } from "./companies.service";

type PrismaStub = {
  company: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  companyMember: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  job: { findFirst: jest.Mock; findMany: jest.Mock; create: jest.Mock; update: jest.Mock };
  application: { findFirst: jest.Mock; findMany: jest.Mock; update: jest.Mock; count: jest.Mock };
  $transaction: jest.Mock;
  $executeRaw: jest.Mock;
};

function buildPrisma(): PrismaStub {
  const stub: PrismaStub = {
    company: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    companyMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    job: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    application: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    $transaction: jest.fn(),
    $executeRaw: jest.fn().mockResolvedValue(0),
  };
  // Interactive-transaction callbacks run against the same stub as the tx client.
  stub.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function"
      ? (arg as (tx: PrismaStub) => unknown)(stub)
      : Promise.all(arg as Array<Promise<unknown>>),
  );
  return stub;
}

function jobRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "j_1",
    companyId: "co_1",
    title: "Engineer",
    type: "FULL_TIME",
    locationMode: "HYBRID",
    city: "Ramallah",
    isActive: true,
    expiresAt: null,
    createdAt: new Date("2026-04-18T10:00:00Z"),
    updatedAt: new Date("2026-04-18T10:00:00Z"),
    ...overrides,
  };
}

function applicantRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "app_1",
    jobId: "j_1",
    applicantId: "u_app",
    status: "SUBMITTED" as ApplicationStatus,
    resumeUrl: null,
    coverLetter: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    applicant: {
      id: "u_app",
      email: "app@example.com",
      profile: {
        handle: "app",
        firstName: "App",
        lastName: "Licant",
        headline: null,
        avatarUrl: null,
        location: null,
        country: "PS",
      },
    },
    ...overrides,
  };
}

describe("CompaniesService", () => {
  let service: CompaniesService;
  let prisma: PrismaStub;
  let notifications: { notify: jest.Mock };
  let karama: { award: jest.Mock };
  let entitlements: { assertCanCreateJob: jest.Mock };

  beforeEach(async () => {
    prisma = buildPrisma();
    notifications = { notify: jest.fn().mockResolvedValue(undefined) };
    karama = { award: jest.fn().mockResolvedValue(undefined) };
    entitlements = { assertCanCreateJob: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: KaramaService, useValue: karama },
        { provide: EmployerEntitlementsService, useValue: entitlements },
      ],
    }).compile();
    service = moduleRef.get(CompaniesService);
  });

  describe("create", () => {
    it("409s when slug is already taken", async () => {
      prisma.company.findUnique.mockResolvedValue({ id: "existing" });
      await expect(
        service.create("u_owner", {
          slug: "taken",
          name: "X",
          country: "PS",
        }),
      ).rejects.toMatchObject({ code: ErrorCode.CONFLICT });
    });
  });

  describe("update", () => {
    it("only forwards provided fields to Prisma", async () => {
      prisma.company.update.mockResolvedValue({
        id: "co_1",
        slug: "x",
        name: "Renamed",
        tagline: null,
        about: null,
        website: null,
        industry: null,
        sizeBucket: null,
        logoUrl: null,
        coverUrl: null,
        country: "PS",
        city: null,
        verified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.update("co_1", { name: "Renamed" });

      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: "co_1" },
        data: { name: "Renamed" },
      });
    });
  });

  describe("removeMember", () => {
    it("404s when the target membership is missing", async () => {
      prisma.companyMember.findUnique.mockResolvedValue(null);
      await expect(service.removeMember("co_1", "u_missing")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it("prevents removing the last remaining owner", async () => {
      prisma.companyMember.findUnique.mockResolvedValue({ role: "OWNER" });
      prisma.companyMember.count.mockResolvedValue(1);
      await expect(service.removeMember("co_1", "u_owner")).rejects.toMatchObject({
        code: ErrorCode.CONFLICT,
      });
      expect(prisma.companyMember.delete).not.toHaveBeenCalled();
    });

    it("removes a non-owner member without checking owner count", async () => {
      prisma.companyMember.findUnique.mockResolvedValue({ role: "EDITOR" });
      await service.removeMember("co_1", "u_editor");
      expect(prisma.companyMember.delete).toHaveBeenCalledWith({
        where: { companyId_userId: { companyId: "co_1", userId: "u_editor" } },
      });
    });
  });

  describe("createJob", () => {
    it("rejects salaryMax < salaryMin", async () => {
      await expect(
        service.createJob("co_1", "u_poster", {
          title: "Eng",
          description: "Build",
          type: "FULL_TIME",
          locationMode: "HYBRID",
          country: "PS",
          salaryCurrency: "ILS",
          skillsRequired: [],
          salaryMin: 1000,
          salaryMax: 500,
        }),
      ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
      expect(entitlements.assertCanCreateJob).not.toHaveBeenCalled();
    });

    it("delegates the entitlements check before creating", async () => {
      prisma.job.create.mockResolvedValue(jobRow());

      await service.createJob("co_1", "u_poster", {
        title: "Eng",
        description: "Build",
        type: "FULL_TIME",
        locationMode: "HYBRID",
        country: "PS",
        salaryCurrency: "ILS",
        skillsRequired: [],
      });

      expect(entitlements.assertCanCreateJob).toHaveBeenCalledWith("co_1", expect.anything());
      expect(prisma.job.create).toHaveBeenCalled();
    });
  });

  describe("archiveJob", () => {
    it("soft-deletes and flips isActive false", async () => {
      prisma.job.findFirst.mockResolvedValue({ id: "j_1" });
      prisma.job.update.mockResolvedValue(jobRow({ isActive: false }));

      await service.archiveJob("co_1", "j_1");

      expect(prisma.job.update).toHaveBeenCalledWith({
        where: { id: "j_1" },
        data: expect.objectContaining({ isActive: false, deletedAt: expect.any(Date) }),
      });
    });
  });

  describe("updateApplicantStatus", () => {
    it("notifies the applicant when status changes", async () => {
      prisma.application.findFirst.mockResolvedValue(applicantRow({ status: "SUBMITTED" }));
      prisma.application.update.mockResolvedValue(applicantRow({ status: "SHORTLISTED" }));

      await service.updateApplicantStatus("co_1", "j_1", "app_1", "u_actor", {
        status: "SHORTLISTED",
      });

      expect(notifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "JOB_APPLICATION_UPDATE",
          recipientId: "u_app",
          actorId: "u_actor",
          jobId: "j_1",
        }),
      );
    });

    it("awards Karama on first HIRED transition", async () => {
      prisma.application.findFirst.mockResolvedValue(applicantRow({ status: "SHORTLISTED" }));
      prisma.application.update.mockResolvedValue(applicantRow({ status: "HIRED" }));

      await service.updateApplicantStatus("co_1", "j_1", "app_1", "u_actor", { status: "HIRED" });

      expect(karama.award).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "u_app", reason: "VERIFIED_HIRE" }),
      );
    });

    it("is a no-op short-circuit when status is unchanged", async () => {
      prisma.application.findFirst.mockResolvedValue(applicantRow({ status: "SHORTLISTED" }));

      await service.updateApplicantStatus("co_1", "j_1", "app_1", "u_actor", {
        status: "SHORTLISTED",
      });

      expect(prisma.application.update).not.toHaveBeenCalled();
      expect(notifications.notify).not.toHaveBeenCalled();
      expect(karama.award).not.toHaveBeenCalled();
    });
  });
});
