import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";

import { EmployerEntitlementsService } from "./employer-entitlements.service";

describe("EmployerEntitlementsService", () => {
  let service: EmployerEntitlementsService;
  let prisma: {
    job: { count: jest.Mock };
    subscription: { findFirst: jest.Mock };
    employerCredit: { findFirst: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      job: { count: jest.fn() },
      subscription: { findFirst: jest.fn() },
      employerCredit: { findFirst: jest.fn(), update: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        EmployerEntitlementsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(EmployerEntitlementsService);
  });

  it("allows free employer until one active job", async () => {
    prisma.job.count.mockResolvedValue(0);
    prisma.subscription.findFirst.mockResolvedValue(null);

    await expect(service.assertCanCreateJob("company-1")).resolves.toBeUndefined();
  });

  it("rejects when active plan limit and job credits are exhausted", async () => {
    prisma.job.count.mockResolvedValue(5);
    prisma.subscription.findFirst.mockResolvedValue({ plan: { features: { activeJobs: 5 } } });
    prisma.employerCredit.findFirst.mockResolvedValue(null);

    await expect(service.assertCanCreateJob("company-1")).rejects.toMatchObject({ status: 402 });
  });

  it("consumes one job credit after limit is reached", async () => {
    prisma.job.count.mockResolvedValue(1);
    prisma.subscription.findFirst.mockResolvedValue(null);
    prisma.employerCredit.findFirst.mockResolvedValue({ id: "credit-1", remaining: 2 });

    await service.assertCanCreateJob("company-1");

    expect(prisma.employerCredit.update).toHaveBeenCalledWith({
      where: { id: "credit-1" },
      data: { remaining: 1 },
    });
  });
});
