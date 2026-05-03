import { ErrorCode } from "@baydar/shared";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import * as bcrypt from "bcrypt";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";

import { AuthService } from "./auth.service";

type PrismaStub = {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
    findUniqueOrThrow: jest.Mock;
  };
  refreshToken: {
    create: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
};

function buildPrisma(): PrismaStub {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
}

function buildConfig(): Pick<ConfigService, "getOrThrow"> {
  const values: Record<string, unknown> = {
    BCRYPT_COST: "4", // string mirrors ConfigService values from process.env in dev.
    JWT_ACCESS_TTL: "900",
    JWT_REFRESH_TTL: "2592000",
    JWT_ACCESS_SECRET: "x".repeat(48),
    JWT_REFRESH_SECRET: "y".repeat(48),
  };
  return {
    getOrThrow: ((key: string) => values[key]) as ConfigService["getOrThrow"],
  };
}

describe("AuthService", () => {
  let service: AuthService;
  let prisma: PrismaStub;

  beforeEach(async () => {
    prisma = buildPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: buildConfig() },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  describe("register", () => {
    it("creates a user without a profile and issues tokens", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: "user_1",
        email: "a@b.co",
        role: "USER",
        locale: "ar-PS",
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.register(
        {
          email: "a@b.co",
          password: "Password1",
          firstName: "Osama",
          lastName: "Hamad",
          locale: "ar-PS",
          acceptTerms: true,
        },
        "device-1",
      );

      expect(result.user.id).toBe("user_1");
      expect(result.tokens.accessToken).toBeTruthy();
      expect(result.tokens.refreshToken).toBeTruthy();
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: "a@b.co",
          passwordHash: expect.any(String),
          locale: "ar-PS",
          role: "USER",
        },
      });
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });

    it("rejects duplicate email with CONFLICT", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "existing" });

      const call = service.register(
        {
          email: "a@b.co",
          password: "Password1",
          firstName: "O",
          lastName: "H",
          locale: "ar-PS",
          acceptTerms: true,
        },
        "device-1",
      );

      await expect(call).rejects.toBeInstanceOf(DomainException);
      await expect(call).rejects.toMatchObject({ code: ErrorCode.CONFLICT });
    });
  });

  describe("login", () => {
    it("rejects invalid password with AUTH_UNAUTHORIZED", async () => {
      const passwordHash = await bcrypt.hash("correct-pw", 4);
      prisma.user.findUnique.mockResolvedValue({
        id: "user_1",
        email: "a@b.co",
        role: "USER",
        locale: "ar-PS",
        passwordHash,
      });

      const call = service.login({
        email: "a@b.co",
        password: "wrong-pw",
        deviceId: "device-1",
      });

      await expect(call).rejects.toMatchObject({
        response: {
          error: { code: ErrorCode.AUTH_UNAUTHORIZED },
        },
      });
    });
  });
});
