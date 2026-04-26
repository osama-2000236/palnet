import { Test } from "@nestjs/testing";
import { CompanyMemberRole, ErrorCode } from "@baydar/shared";

import { DomainException } from "../../common/domain-exception";
import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

import { CompaniesService } from "./companies.service";

type PrismaStub = {
  company: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
  companyMember: {
    upsert: jest.Mock;
    findUnique: jest.Mock;
    delete: jest.Mock;
  };
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  $transaction: jest.Mock;
};

function buildPrisma(): PrismaStub {
  return {
    company: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    companyMember: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

const viewer: AuthUser = {
  id: "u_owner",
  email: "owner@palnet.ps",
  locale: "ar-PS",
  role: "USER",
};

describe("CompaniesService", () => {
  let service: CompaniesService;
  let prisma: PrismaStub;

  beforeEach(async () => {
    prisma = buildPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [CompaniesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(CompaniesService);
  });

  it("creates a company, adds the creator as OWNER, and promotes USER to COMPANY_ADMIN", async () => {
    prisma.company.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({
        company: {
          create: jest.fn().mockResolvedValue({
            id: "co_1",
            slug: "baydar",
            name: "Baydar",
            tagline: null,
            about: null,
            website: null,
            industry: null,
            sizeBucket: "11-50",
            logoUrl: null,
            coverUrl: null,
            country: "PS",
            city: "Ramallah",
            verified: false,
            createdAt: new Date("2026-04-20T10:00:00Z"),
            updatedAt: new Date("2026-04-20T10:00:00Z"),
          }),
        },
        user: {
          update: jest.fn().mockResolvedValue({ id: viewer.id }),
        },
      }),
    );

    const result = await service.create(viewer, {
      slug: "baydar",
      name: "Baydar",
      city: "Ramallah",
      country: "PS",
      sizeBucket: "11-50",
    });

    expect(result.slug).toBe("baydar");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("rejects duplicate slugs with CONFLICT", async () => {
    prisma.company.findUnique.mockResolvedValue({ id: "co_existing" });

    await expect(
      service.create(viewer, {
        slug: "baydar",
        name: "Baydar",
        country: "PS",
      }),
    ).rejects.toMatchObject({ code: ErrorCode.CONFLICT });
  });

  it("blocks EDITOR members from manage access", async () => {
    prisma.company.findUnique.mockResolvedValue({
      id: "co_1",
      slug: "baydar",
      name: "Baydar",
      members: [{ role: CompanyMemberRole.EDITOR }],
    });

    await expect(service.assertCanManage(viewer, "co_1")).rejects.toBeInstanceOf(DomainException);
    await expect(service.assertCanManage(viewer, "co_1")).rejects.toMatchObject({
      code: ErrorCode.AUTH_FORBIDDEN,
    });
  });
});
