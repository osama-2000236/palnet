import { ErrorCode } from "@baydar/shared";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import * as bcrypt from "bcrypt";

import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";

import { AuthTokensService, hashToken } from "./auth-tokens.service";

type PrismaStub = {
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  emailVerificationToken: {
    create: jest.Mock;
    findFirst: jest.Mock;
    updateMany: jest.Mock;
  };
  passwordResetToken: {
    create: jest.Mock;
    findFirst: jest.Mock;
    updateMany: jest.Mock;
  };
  sseStreamToken: {
    create: jest.Mock;
    findFirst: jest.Mock;
    updateMany: jest.Mock;
  };
  refreshToken: {
    updateMany: jest.Mock;
  };
};

function buildPrisma(): PrismaStub {
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    emailVerificationToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    sseStreamToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn(),
    },
  };
}

describe("AuthTokensService", () => {
  let service: AuthTokensService;
  let prisma: PrismaStub;
  let mail: { send: jest.Mock };

  beforeEach(async () => {
    prisma = buildPrisma();
    mail = { send: jest.fn().mockResolvedValue(undefined) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthTokensService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue("4") },
        },
      ],
    }).compile();
    service = moduleRef.get(AuthTokensService);
  });

  it("issues a verify email token as a hash and queues mail", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "demo@baydar.ps",
      locale: "ar-PS",
    });
    prisma.emailVerificationToken.create.mockResolvedValue({});

    await service.issueVerifyEmail("user-1", {
      requestedFromIp: "127.0.0.1",
      requestedFromUa: "jest",
    });

    expect(prisma.emailVerificationToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        requestedFromIp: "127.0.0.1",
        requestedFromUa: "jest",
      }),
    });
    const tokenHash = prisma.emailVerificationToken.create.mock.calls[0][0].data.tokenHash;
    const url = mail.send.mock.calls[0][2].url as string;
    const plain = url.split("/").pop() ?? "";
    expect(hashToken(plain)).toBe(tokenHash);
    expect(mail.send).toHaveBeenCalledWith(
      "verify-email",
      "demo@baydar.ps",
      expect.objectContaining({
        url: expect.stringContaining("/verify-email/"),
        locale: "ar-PS",
      }),
    );
  });

  it("consumes a verify token once and marks the user verified", async () => {
    const token = "a".repeat(64);
    prisma.emailVerificationToken.findFirst.mockResolvedValue({
      id: "evt-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
    });
    prisma.emailVerificationToken.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.update.mockResolvedValue({});

    await service.consumeVerifyEmail(token);

    expect(prisma.emailVerificationToken.findFirst).toHaveBeenCalledWith({
      where: { tokenHash: hashToken(token) },
      select: { id: true, userId: true, expiresAt: true, consumedAt: true },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { emailVerified: expect.any(Date) },
    });
  });

  it("rejects expired verify tokens", async () => {
    prisma.emailVerificationToken.findFirst.mockResolvedValue({
      id: "evt-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() - 1_000),
      consumedAt: null,
    });

    await expect(service.consumeVerifyEmail("a".repeat(64))).rejects.toMatchObject({
      code: ErrorCode.AUTH_TOKEN_EXPIRED,
    });
    expect(prisma.emailVerificationToken.updateMany).not.toHaveBeenCalled();
  });

  it("rejects already consumed verify tokens", async () => {
    prisma.emailVerificationToken.findFirst.mockResolvedValue({
      id: "evt-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: new Date(),
    });

    await expect(service.consumeVerifyEmail("a".repeat(64))).rejects.toMatchObject({
      code: ErrorCode.AUTH_TOKEN_INVALID,
    });
  });

  it("rejects mismatched token hashes", async () => {
    const goodToken = "b".repeat(64);
    prisma.emailVerificationToken.findFirst.mockImplementation(({ where }) =>
      where.tokenHash === hashToken(goodToken)
        ? Promise.resolve({
            id: "evt-1",
            userId: "user-1",
            expiresAt: new Date(Date.now() + 60_000),
            consumedAt: null,
          })
        : Promise.resolve(null),
    );

    await expect(service.consumeVerifyEmail("c".repeat(64))).rejects.toMatchObject({
      code: ErrorCode.AUTH_TOKEN_INVALID,
    });
  });

  it("updates password and revokes refresh tokens on password reset", async () => {
    const token = "d".repeat(64);
    prisma.passwordResetToken.findFirst.mockResolvedValue({
      id: "prt-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
    });
    prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.update.mockResolvedValue({});
    prisma.refreshToken.updateMany.mockResolvedValue({});

    await service.consumePasswordReset(token, "NewPassword1");

    const passwordHash = prisma.user.update.mock.calls[0][0].data.passwordHash;
    await expect(bcrypt.compare("NewPassword1", passwordHash)).resolves.toBe(true);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("issues a short-lived stream token as a hash", async () => {
    prisma.sseStreamToken.create.mockResolvedValue({});

    const out = await service.issueStreamToken("user-1", "messaging");

    expect(out.token).toMatch(/^[a-f0-9]{64}$/);
    expect(Date.parse(out.expiresAt)).toBeLessThanOrEqual(Date.now() + 60_000);
    expect(prisma.sseStreamToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        scope: "messaging",
        tokenHash: hashToken(out.token),
        expiresAt: expect.any(Date),
      }),
    });
  });

  it("consumes a stream token once and returns the token user", async () => {
    const token = "e".repeat(64);
    const user = { id: "user-1", email: "demo@baydar.ps", role: "USER", locale: "ar-PS" };
    prisma.sseStreamToken.findFirst.mockResolvedValue({
      id: "sst-1",
      userId: "user-1",
      scope: "messaging",
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      user,
    });
    prisma.sseStreamToken.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.consumeStreamToken(token, "messaging")).resolves.toEqual(user);
    expect(prisma.sseStreamToken.findFirst).toHaveBeenCalledWith({
      where: { tokenHash: hashToken(token), scope: "messaging" },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        consumedAt: true,
        scope: true,
        user: { select: { id: true, email: true, role: true, locale: true } },
      },
    });
    expect(prisma.sseStreamToken.updateMany).toHaveBeenCalledWith({
      where: { id: "sst-1", consumedAt: null },
      data: { consumedAt: expect.any(Date) },
    });
  });

  it("rejects stream token replay when the single-use update loses the race", async () => {
    prisma.sseStreamToken.findFirst.mockResolvedValue({
      id: "sst-1",
      userId: "user-1",
      scope: "notifications",
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      user: { id: "user-1", email: "demo@baydar.ps", role: "USER", locale: "ar-PS" },
    });
    prisma.sseStreamToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.consumeStreamToken("f".repeat(64), "notifications")).rejects.toMatchObject(
      {
        code: ErrorCode.STREAM_TOKEN_INVALID,
      },
    );
  });

  it("rejects reset replay when single-use update loses the race", async () => {
    prisma.passwordResetToken.findFirst.mockResolvedValue({
      id: "prt-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
    });
    prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.consumePasswordReset("d".repeat(64), "NewPassword1"),
    ).rejects.toMatchObject({
      code: ErrorCode.AUTH_TOKEN_INVALID,
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
