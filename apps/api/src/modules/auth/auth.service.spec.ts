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
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    findUniqueOrThrow: jest.Mock;
  };
  refreshToken: {
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
};

function buildPrisma(): PrismaStub {
  return {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
}

function buildConfig(): Pick<ConfigService, "getOrThrow"> {
  const values: Record<string, unknown> = {
    // Numbers, not strings: ConfigModule is loaded with the zod-parsed env
    // object (app.module.ts) and these are `z.coerce.number()`, so this is what
    // production actually serves. The string mocks here were the only reason a
    // `numberConfig` re-parse helper existed.
    BCRYPT_COST: 4,
    JWT_ACCESS_TTL: 900,
    JWT_REFRESH_TTL: 2592000,
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

    it("rejects soft-deleted account during grace with restore code", async () => {
      const passwordHash = await bcrypt.hash("correct-pw", 4);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue({
        id: "user_1",
        email: "deleted_user_1@deleted.local",
        role: "USER",
        locale: "ar-PS",
        passwordHash,
        deletedAt: new Date(),
      });

      const call = service.login({
        email: "a@b.co",
        password: "correct-pw",
        deviceId: "device-1",
      });

      await expect(call).rejects.toMatchObject({
        code: ErrorCode.ACCOUNT_DELETED_PENDING_RESTORE,
        status: 403,
      });
    });

    it("rejects soft-deleted account past grace with deleted code", async () => {
      const passwordHash = await bcrypt.hash("correct-pw", 4);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue({
        id: "user_1",
        email: "deleted_user_1@deleted.local",
        role: "USER",
        locale: "ar-PS",
        passwordHash,
        deletedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
      });

      const call = service.login({
        email: "a@b.co",
        password: "correct-pw",
        deviceId: "device-1",
      });

      await expect(call).rejects.toMatchObject({
        code: ErrorCode.ACCOUNT_DELETED,
        status: 403,
      });
    });
  });

  describe("me", () => {
    it("exposes emailVerified as ISO string or null", async () => {
      const verifiedAt = new Date("2026-07-01T10:00:00Z");
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: "user_1",
        email: "a@b.co",
        role: "USER",
        locale: "ar-PS",
        emailVerified: verifiedAt,
      });
      await expect(service.me("user_1")).resolves.toMatchObject({
        emailVerified: verifiedAt.toISOString(),
      });

      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: "user_1",
        email: "a@b.co",
        role: "USER",
        locale: "ar-PS",
        emailVerified: null,
      });
      await expect(service.me("user_1")).resolves.toMatchObject({ emailVerified: null });
    });
  });

  describe("sessions", () => {
    it("lists one active row per device id", async () => {
      prisma.refreshToken.findMany.mockResolvedValue([
        {
          deviceId: "device-1",
          userAgent: "Chrome",
          ipAddress: "127.0.0.1",
          createdAt: new Date("2026-06-14T10:00:00.000Z"),
        },
        {
          deviceId: "device-1",
          userAgent: "Old Chrome",
          ipAddress: "127.0.0.1",
          createdAt: new Date("2026-06-13T10:00:00.000Z"),
        },
        {
          deviceId: "device-2",
          userAgent: null,
          ipAddress: null,
          createdAt: new Date("2026-06-14T09:00:00.000Z"),
        },
      ]);

      const sessions = await service.listSessions("user_1");

      expect(prisma.refreshToken.findMany).toHaveBeenCalledWith({
        where: { userId: "user_1", revokedAt: null, expiresAt: { gt: expect.any(Date) } },
        orderBy: { createdAt: "desc" },
        select: {
          deviceId: true,
          userAgent: true,
          ipAddress: true,
          createdAt: true,
        },
      });
      expect(sessions).toEqual([
        {
          id: "device-1",
          device: "Chrome",
          lastActiveAt: "2026-06-14T10:00:00.000Z",
        },
        {
          id: "device-2",
          device: "device-2",
          lastActiveAt: "2026-06-14T09:00:00.000Z",
        },
      ]);
    });

    it("revokes all sessions except the current device", async () => {
      await service.logoutOthers("user_1", "device-1");

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: "user_1", deviceId: { not: "device-1" }, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe("refresh", () => {
    const user = {
      id: "user_1",
      email: "a@b.co",
      role: "USER" as const,
      locale: "ar-PS",
    };

    it("atomically revokes the presented token and issues a new session", async () => {
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: "rt_1",
        userId: user.id,
        expiresAt: new Date(Date.now() + 60_000),
        user,
      });
      prisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.refreshToken.create.mockResolvedValue({});

      const session = await service.refresh({
        refreshToken: "plain-refresh-token",
        deviceId: "device-1",
      });

      expect(session.user.id).toBe("user_1");
      expect(session.tokens.accessToken).toBeTruthy();
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: "rt_1", revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      // Access tokens are HS256-signed (header.payload.sig).
      const header = JSON.parse(
        Buffer.from(session.tokens.accessToken.split(".")[0]!, "base64url").toString("utf8"),
      ) as { alg: string };
      expect(header.alg).toBe("HS256");
    });

    it("burns all user sessions when an already-rotated token is replayed (reuse)", async () => {
      // The realistic stolen-token shape: the row exists and is already revoked.
      // The lookup must not filter revokedAt, or this never reaches the burn.
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: "rt_1",
        userId: user.id,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: new Date(Date.now() - 1_000),
        user,
      });
      prisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 2 });

      await expect(
        service.refresh({ refreshToken: "stolen", deviceId: "device-1" }),
      ).rejects.toMatchObject({
        response: {
          error: { code: ErrorCode.AUTH_UNAUTHORIZED },
        },
      });

      expect(prisma.refreshToken.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ revokedAt: null }),
        }),
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: "user_1", revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it("burns all user sessions when the rotation claim loses a race", async () => {
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: "rt_1",
        userId: user.id,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        user,
      });
      // Claim returns 0: a concurrent refresh revoked the row first.
      prisma.refreshToken.updateMany
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 2 });

      await expect(
        service.refresh({ refreshToken: "raced", deviceId: "device-1" }),
      ).rejects.toMatchObject({
        response: {
          error: { code: ErrorCode.AUTH_UNAUTHORIZED },
        },
      });

      expect(prisma.refreshToken.updateMany).toHaveBeenNthCalledWith(2, {
        where: { userId: "user_1", revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it("rejects expired or unknown refresh tokens without touching sessions", async () => {
      prisma.refreshToken.findFirst.mockResolvedValue(null);

      await expect(
        service.refresh({ refreshToken: "nope", deviceId: "device-1" }),
      ).rejects.toMatchObject({
        response: {
          error: { code: ErrorCode.AUTH_UNAUTHORIZED },
        },
      });
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("changePassword", () => {
    it("updates the password and revokes other devices", async () => {
      const passwordHash = await bcrypt.hash("OldPassword1", 4);
      prisma.user.findUnique.mockResolvedValue({ passwordHash });
      prisma.user.update.mockResolvedValue({});
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.changePassword("user_1", {
        currentPassword: "OldPassword1",
        newPassword: "NewPassword1",
        deviceId: "device-1",
      });

      const nextHash = prisma.user.update.mock.calls[0][0].data.passwordHash;
      await expect(bcrypt.compare("NewPassword1", nextHash)).resolves.toBe(true);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: "user_1", deviceId: { not: "device-1" }, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it("rejects an incorrect current password", async () => {
      const passwordHash = await bcrypt.hash("OldPassword1", 4);
      prisma.user.findUnique.mockResolvedValue({ passwordHash });

      await expect(
        service.changePassword("user_1", {
          currentPassword: "WrongPassword1",
          newPassword: "NewPassword1",
          deviceId: "device-1",
        }),
      ).rejects.toMatchObject({
        response: {
          error: { code: ErrorCode.AUTH_UNAUTHORIZED },
        },
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });
});
