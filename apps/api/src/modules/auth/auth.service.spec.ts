import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { ErrorCode } from "@palnet/shared";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

import { DomainException } from "../../common/domain-exception";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";

import { AuthService } from "./auth.service";

type PrismaStub = {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
    findUniqueOrThrow: jest.Mock;
  };
  profile: { findUnique: jest.Mock };
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
    profile: { findUnique: jest.fn() },
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
    // Runtime env vars arrive as strings; services must coerce where required.
    BCRYPT_COST: "10",
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
    const mail = {
      sendVerifyEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: buildConfig() },
        { provide: MailService, useValue: mail },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  describe("register", () => {
    it("creates a user + profile and issues tokens (happy path)", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.profile.findUnique.mockResolvedValue(null);
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
      const decoded = jwt.decode(result.tokens.accessToken) as {
        exp: number;
        iat: number;
      };
      expect(decoded.exp - decoded.iat).toBe(900);
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
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

    it("generates an ascii-safe handle when the signup name is non-latin", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.profile.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: "user_2",
        email: "arabic@palnet.ps",
        role: "USER",
        locale: "ar-PS",
      });
      prisma.refreshToken.create.mockResolvedValue({});

      await service.register(
        {
          email: "arabic@palnet.ps",
          password: "Password1",
          firstName: "أسامة",
          lastName: "حماد",
          locale: "ar-PS",
          acceptTerms: true,
        },
        "device-1",
      );

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            profile: {
              create: expect.objectContaining({
                handle: expect.stringMatching(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),
              }),
            },
          }),
        }),
      );
    });
  });

  describe("login", () => {
    it("rejects invalid password with AUTH_UNAUTHORIZED", async () => {
      const passwordHash = await bcrypt.hash("correct-pw", 10);
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
