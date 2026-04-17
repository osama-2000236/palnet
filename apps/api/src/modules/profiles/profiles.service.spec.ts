import { Test } from "@nestjs/testing";
import { ErrorCode, JobLocationMode } from "@palnet/shared";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";
import { ProfilesService } from "./profiles.service";

type PrismaStub = {
  profile: { findUnique: jest.Mock };
  experience: {
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    findUnique: jest.Mock;
  };
  education: {
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    findUnique: jest.Mock;
  };
  skill: { upsert: jest.Mock };
  profileSkill: { upsert: jest.Mock; deleteMany: jest.Mock };
  connection: { findFirst: jest.Mock };
};

function buildPrisma(): PrismaStub {
  return {
    profile: { findUnique: jest.fn() },
    experience: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
    education: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
    skill: { upsert: jest.fn() },
    profileSkill: { upsert: jest.fn(), deleteMany: jest.fn() },
    connection: { findFirst: jest.fn() },
  };
}

function profileRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "p_1",
    userId: "u_1",
    handle: "osama",
    firstName: "Osama",
    lastName: "Abdel-Wahab",
    headline: null,
    about: null,
    location: null,
    country: "PS",
    avatarUrl: null,
    coverUrl: null,
    website: null,
    pronouns: null,
    openToWork: false,
    hiring: false,
    experiences: [],
    educations: [],
    skills: [],
    ...overrides,
  };
}

describe("ProfilesService (edit)", () => {
  let service: ProfilesService;
  let prisma: PrismaStub;

  beforeEach(async () => {
    prisma = buildPrisma();
    // getMine is called at the end of every mutation; it looks up profile by userId.
    prisma.profile.findUnique.mockImplementation(async ({ where }) => {
      if (where.userId === "u_1") return profileRow();
      // requireProfile (select: { id }) path
      if (where.userId) return { id: "p_1" };
      return null;
    });
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProfilesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(ProfilesService);
  });

  describe("experiences", () => {
    it("creates a new experience (happy path)", async () => {
      prisma.experience.create.mockResolvedValue({ id: "e_1" });

      await service.addExperience("u_1", {
        title: "Engineer",
        companyName: "PalNet",
        companyId: null,
        location: null,
        locationMode: JobLocationMode.ONSITE,
        startDate: new Date("2024-01-01").toISOString(),
        endDate: null,
        description: null,
      });

      expect(prisma.experience.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            profileId: "p_1",
            title: "Engineer",
            companyName: "PalNet",
          }),
        }),
      );
    });

    it("404s when updating an experience that belongs to another profile", async () => {
      prisma.experience.findUnique.mockResolvedValue({
        id: "e_2",
        profileId: "p_other",
      });

      await expect(
        service.updateExperience("u_1", "e_2", {
          title: "x",
          companyName: "y",
          companyId: null,
          location: null,
          locationMode: JobLocationMode.ONSITE,
          startDate: new Date().toISOString(),
          endDate: null,
          description: null,
        }),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      } as Partial<DomainException>);
    });

    it("deletes an experience owned by the caller", async () => {
      prisma.experience.findUnique.mockResolvedValue({
        id: "e_3",
        profileId: "p_1",
      });
      prisma.experience.delete.mockResolvedValue({ id: "e_3" });
      await service.deleteExperience("u_1", "e_3");
      expect(prisma.experience.delete).toHaveBeenCalledWith({
        where: { id: "e_3" },
      });
    });
  });

  describe("skills", () => {
    it("slugifies the name and upserts skill + association", async () => {
      prisma.skill.upsert.mockResolvedValue({
        id: "sk_1",
        name: "TypeScript",
        slug: "typescript",
      });
      prisma.profileSkill.upsert.mockResolvedValue({
        profileId: "p_1",
        skillId: "sk_1",
      });

      await service.addSkill("u_1", { name: "  TypeScript  " });

      expect(prisma.skill.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: "typescript" },
          create: expect.objectContaining({ slug: "typescript" }),
        }),
      );
      expect(prisma.profileSkill.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            profileId_skillId: { profileId: "p_1", skillId: "sk_1" },
          },
        }),
      );
    });

    it("removeSkill deletes by (profileId, skillId)", async () => {
      prisma.profileSkill.deleteMany.mockResolvedValue({ count: 1 });
      await service.removeSkill("u_1", "sk_9");
      expect(prisma.profileSkill.deleteMany).toHaveBeenCalledWith({
        where: { profileId: "p_1", skillId: "sk_9" },
      });
    });
  });
});
