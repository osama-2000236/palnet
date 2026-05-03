import { ErrorCode } from "@baydar/shared";
import { Test } from "@nestjs/testing";
import { Reflector } from "@nestjs/core";

import { DomainException } from "./domain-exception";
import { ProfileCompletionGuard } from "./profile-completion.guard";
import { REQUIRE_COMPLETE_PROFILE_KEY } from "./require-complete-profile.decorator";
import { PrismaService } from "../modules/prisma/prisma.service";

type PrismaStub = {
  profile: {
    findUnique: jest.Mock;
  };
};

function executionContext(userId = "user_1") {
  return {
    getHandler: () => "handler",
    getClass: () => "class",
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: userId, email: "qa@baydar.test", role: "USER", locale: "ar-PS" },
      }),
    }),
  } as never;
}

describe("ProfileCompletionGuard", () => {
  let guard: ProfileCompletionGuard;
  let prisma: PrismaStub;
  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    prisma = { profile: { findUnique: jest.fn() } };
    reflector.getAllAndOverride.mockReturnValue(true);
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProfileCompletionGuard,
        { provide: PrismaService, useValue: prisma },
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    guard = moduleRef.get(ProfileCompletionGuard);
  });

  it("allows routes that do not require profile completion", async () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    await expect(guard.canActivate(executionContext())).resolves.toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(REQUIRE_COMPLETE_PROFILE_KEY, [
      "handler",
      "class",
    ]);
    expect(prisma.profile.findUnique).not.toHaveBeenCalled();
  });

  it("blocks authenticated users without a complete profile", async () => {
    prisma.profile.findUnique.mockResolvedValue({
      firstName: "Osama",
      lastName: "Hamad",
      handle: "osama",
      headline: "Full Stack Engineer",
      location: "Ramallah",
      experiences: [],
      educations: [],
    });

    const call = guard.canActivate(executionContext());

    await expect(call).rejects.toBeInstanceOf(DomainException);
    await expect(call).rejects.toMatchObject({
      code: ErrorCode.PROFILE_ONBOARDING_REQUIRED,
    });
  });

  it("allows authenticated users with a complete profile", async () => {
    prisma.profile.findUnique.mockResolvedValue({
      firstName: "Osama",
      lastName: "Hamad",
      handle: "osama",
      headline: "Full Stack Engineer",
      location: "Ramallah",
      experiences: [{ id: "exp_1" }],
      educations: [],
    });

    await expect(guard.canActivate(executionContext())).resolves.toBe(true);
  });
});
