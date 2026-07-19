import { JobLocationMode, JobType, NotificationType } from "@baydar/shared";
import { Test } from "@nestjs/testing";

import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

import { JobAlertsService, alertMatches, type AlertableJob } from "./job-alerts.service";

const JOB: AlertableJob = {
  id: "job_1",
  title: "مهندس برمجيات",
  description: "نبحث عن مهندس React في رام الله",
  city: "رام الله",
  type: JobType.FULL_TIME,
  locationMode: JobLocationMode.REMOTE,
  companyId: "co_1",
  postedById: "u_poster",
};

const FOLDED = {
  haystack: "مهندس برمجيات نبحث عن مهندس react في رام الله",
  city: "رام الله",
  industry: "منظمات غير ربحيه",
};

const EMPTY_ALERT = { q: null, city: null, type: null, locationMode: null, industry: null };

describe("alertMatches", () => {
  it("matches a folded Arabic q against title+description", () => {
    // أ folds to ا, tashkeel stripped — must match the plain-alef haystack.
    expect(alertMatches({ ...EMPTY_ALERT, q: "مُهَندِس" }, JOB, FOLDED)).toBe(true);
    expect(alertMatches({ ...EMPTY_ALERT, q: "محاسب" }, JOB, FOLDED)).toBe(false);
  });

  it("matches latin q case-insensitively", () => {
    expect(alertMatches({ ...EMPTY_ALERT, q: "REACT" }, JOB, FOLDED)).toBe(true);
  });

  it("filters on exact type and locationMode", () => {
    expect(alertMatches({ ...EMPTY_ALERT, type: JobType.PART_TIME }, JOB, FOLDED)).toBe(false);
    expect(
      alertMatches({ ...EMPTY_ALERT, locationMode: JobLocationMode.REMOTE }, JOB, FOLDED),
    ).toBe(true);
  });

  it("folds city and industry contains-matches", () => {
    expect(alertMatches({ ...EMPTY_ALERT, city: "رَام الله" }, JOB, FOLDED)).toBe(true);
    // ة/ه folding: stored industry is "منظمات غير ربحية" folded to ربحيه.
    expect(alertMatches({ ...EMPTY_ALERT, industry: "منظمات غير ربحية" }, JOB, FOLDED)).toBe(true);
    expect(alertMatches({ ...EMPTY_ALERT, city: "غزة" }, JOB, FOLDED)).toBe(false);
  });
});

describe("JobAlertsService.notifyMatches", () => {
  let service: JobAlertsService;
  let prisma: {
    jobAlert: { findMany: jest.Mock; count: jest.Mock; create: jest.Mock; deleteMany: jest.Mock };
    company: { findUnique: jest.Mock };
  };
  let notifications: { notify: jest.Mock };

  beforeEach(async () => {
    prisma = {
      jobAlert: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      company: { findUnique: jest.fn().mockResolvedValue({ industry: "تكنولوجيا المعلومات" }) },
    };
    notifications = { notify: jest.fn().mockResolvedValue(undefined) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        JobAlertsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    service = moduleRef.get(JobAlertsService);
  });

  it("notifies each matching user once, excluding the poster", async () => {
    prisma.jobAlert.findMany.mockResolvedValue([
      { ...EMPTY_ALERT, id: "a1", userId: "u_1", q: "مهندس", createdAt: new Date() },
      { ...EMPTY_ALERT, id: "a2", userId: "u_1", city: "رام الله", createdAt: new Date() },
      { ...EMPTY_ALERT, id: "a3", userId: "u_2", q: "محاسب", createdAt: new Date() },
    ]);

    await service.notifyMatches(JOB);

    expect(prisma.jobAlert.findMany).toHaveBeenCalledWith({
      where: { userId: { not: "u_poster" } },
    });
    expect(notifications.notify).toHaveBeenCalledTimes(1);
    expect(notifications.notify).toHaveBeenCalledWith({
      type: NotificationType.JOB_ALERT,
      recipientId: "u_1",
      jobId: "job_1",
      data: { jobTitle: JOB.title },
      dedupe: true,
    });
  });

  it("swallows fanout errors — job creation must never fail on alerts", async () => {
    prisma.jobAlert.findMany.mockRejectedValue(new Error("db down"));
    await expect(service.notifyMatches(JOB)).resolves.toBeUndefined();
    expect(notifications.notify).not.toHaveBeenCalled();
  });
});
