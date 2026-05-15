import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";

import { EmployerEntitlementsService } from "./employer-entitlements.service";

describe("EmployerEntitlementsService", () => {
  let service: EmployerEntitlementsService;
  let prisma: {
    job: { count: jest.Mock };
    subscription: { findFirst: jest.Mock };
    employerCredit: { findFirst: jest.Mock; updateMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      job: { count: jest.fn() },
      subscription: { findFirst: jest.fn() },
      employerCredit: { findFirst: jest.fn(), updateMany: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [EmployerEntitlementsService, { provide: PrismaService, useValue: prisma }],
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

  it("consumes one job credit atomically after limit is reached", async () => {
    prisma.job.count.mockResolvedValue(1);
    prisma.subscription.findFirst.mockResolvedValue(null);
    prisma.employerCredit.findFirst.mockResolvedValue({ id: "credit-1" });
    prisma.employerCredit.updateMany.mockResolvedValue({ count: 1 });

    await service.assertCanCreateJob("company-1");

    expect(prisma.employerCredit.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "credit-1",
        remaining: { gt: 0 },
      }),
      data: { remaining: { decrement: 1 } },
    });
  });

  it("rejects when atomic decrement loses the race for the only remaining credit", async () => {
    prisma.job.count.mockResolvedValue(1);
    prisma.subscription.findFirst.mockResolvedValue(null);
    prisma.employerCredit.findFirst.mockResolvedValue({ id: "credit-1" });
    prisma.employerCredit.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.assertCanCreateJob("company-1")).rejects.toMatchObject({ status: 402 });
  });
});
