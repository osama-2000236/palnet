import { ErrorCode, JobLocationMode } from "@baydar/shared";
import { Test } from "@nestjs/testing";

import type { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";

import { ProfilesService } from "./profiles.service";

type PrismaStub = {
  profile: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
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
  skill: { create: jest.Mock; findFirst: jest.Mock };
  profileSkill: { upsert: jest.Mock; deleteMany: jest.Mock };
  connection: { findFirst: jest.Mock };
};

function buildPrisma(): PrismaStub {
  return {
    profile: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
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
    skill: { create: jest.fn(), findFirst: jest.fn() },
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
      providers: [ProfilesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(ProfilesService);
  });

  describe("experiences", () => {
    it("creates a new experience (happy path)", async () => {
      prisma.experience.create.mockResolvedValue({ id: "e_1" });

      await service.addExperience("u_1", {
        title: "Engineer",
        companyName: "Baydar",
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
            companyName: "Baydar",
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

  describe("onboard", () => {
    it("creates a profile when the registered user has none", async () => {
      prisma.profile.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prisma.profile.create.mockResolvedValue(
        profileRow({
          handle: "new-user",
          firstName: "New",
          lastName: "User",
          headline: "Full Stack Engineer",
          location: "Ramallah",
        }),
      );

      const result = await service.onboard("u_1", {
        handle: "new-user",
        firstName: "New",
        lastName: "User",
        headline: "Full Stack Engineer",
        location: "Ramallah",
        country: "PS",
      });

      expect(prisma.profile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "u_1",
            handle: "new-user",
          }),
        }),
      );
      expect(result.handle).toBe("new-user");
    });

    it("updates the caller's profile when onboarding is resumed", async () => {
      prisma.profile.findUnique
        .mockResolvedValueOnce(profileRow({ userId: "u_1" }))
        .mockResolvedValueOnce(profileRow({ userId: "u_1" }));
      prisma.profile.update.mockResolvedValue(
        profileRow({
          handle: "resumed",
          firstName: "Resume",
          lastName: "User",
          headline: "Full Stack Engineer",
          location: "Nablus",
        }),
      );

      await service.onboard("u_1", {
        handle: "resumed",
        firstName: "Resume",
        lastName: "User",
        headline: "Full Stack Engineer",
        location: "Nablus",
        country: "PS",
      });

      expect(prisma.profile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "u_1" },
          data: expect.objectContaining({ handle: "resumed" }),
        }),
      );
    });

    it("rejects a handle owned by another user", async () => {
      prisma.profile.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(profileRow({ userId: "u_other" }));

      await expect(
        service.onboard("u_1", {
          handle: "taken",
          firstName: "New",
          lastName: "User",
          headline: "Full Stack Engineer",
          location: "Ramallah",
          country: "PS",
        }),
      ).rejects.toMatchObject({ code: ErrorCode.CONFLICT } as Partial<DomainException>);
    });
  });

  describe("skills", () => {
    it("slugifies the name and creates skill + association", async () => {
      prisma.skill.findFirst.mockResolvedValue(null);
      prisma.skill.create.mockResolvedValue({
        id: "sk_1",
        name: "TypeScript",
        slug: "typescript",
      });
      prisma.profileSkill.upsert.mockResolvedValue({
        profileId: "p_1",
        skillId: "sk_1",
      });

      await service.addSkill("u_1", { name: "  TypeScript  " });

      expect(prisma.skill.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ slug: "typescript" }, { name: "TypeScript" }] },
      });
      expect(prisma.skill.create).toHaveBeenCalledWith({
        data: { name: "TypeScript", slug: "typescript" },
      });
      expect(prisma.profileSkill.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            profileId_skillId: { profileId: "p_1", skillId: "sk_1" },
          },
        }),
      );
    });

    it("normalizes punctuation when matching seeded skill names", async () => {
      prisma.skill.findFirst.mockResolvedValue({
        id: "sk_node",
        name: "Node.js",
        slug: "node-js",
      });
      prisma.profileSkill.upsert.mockResolvedValue({
        profileId: "p_1",
        skillId: "sk_node",
      });

      await service.addSkill("u_1", { name: "Node.js" });

      expect(prisma.skill.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ slug: "node-js" }, { name: "Node.js" }] },
      });
      expect(prisma.skill.create).not.toHaveBeenCalled();
      expect(prisma.profileSkill.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            profileId_skillId: { profileId: "p_1", skillId: "sk_node" },
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
