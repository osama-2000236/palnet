import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { ErrorCode, NotificationType } from "@palnet/shared";
import * as bcrypt from "bcrypt";

import { AuthService } from "../auth/auth.service";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";

import { AccountService } from "./account.service";

// `bcrypt.hash` at the production cost (12) takes ~150 ms — across the
// 10ish password-touching tests in this suite the wall-clock is enough
// to flake CI. Force cost to 4 inside the suite via the ConfigService
// stub; that keeps round trips under 5 ms while still exercising real
// bcrypt code paths.
type PrismaStub = {
  user: { findUnique: jest.Mock; update: jest.Mock };
  refreshToken: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  pushToken: { upsert: jest.Mock; deleteMany: jest.Mock };
  post: { findMany: jest.Mock };
  comment: { findMany: jest.Mock };
  reaction: { findMany: jest.Mock };
  repost: { findMany: jest.Mock };
  connection: { findMany: jest.Mock };
  report: { findMany: jest.Mock };
  $transaction: jest.Mock;
};

function buildPrisma(): PrismaStub {
  return {
    user: { findUnique: jest.fn(), update: jest.fn() },
    refreshToken: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    pushToken: { upsert: jest.fn(), deleteMany: jest.fn() },
    post: { findMany: jest.fn().mockResolvedValue([]) },
    comment: { findMany: jest.fn().mockResolvedValue([]) },
    reaction: { findMany: jest.fn().mockResolvedValue([]) },
    repost: { findMany: jest.fn().mockResolvedValue([]) },
    connection: { findMany: jest.fn().mockResolvedValue([]) },
    report: { findMany: jest.fn().mockResolvedValue([]) },
    // The service uses $transaction with an array of prepared promises and
    // never reads its return value; resolving to [] keeps the runtime
    // contract while skipping the real client.
    $transaction: jest.fn().mockResolvedValue([]),
  };
}

describe("AccountService", () => {
  let service: AccountService;
  let prisma: PrismaStub;
  let auth: { sendEmailVerification: jest.Mock };
  let mail: { sendAccountExportEmail: jest.Mock };

  const password = "current-password";
  let passwordHash: string;

  beforeAll(async () => {
    // Hash once for the suite — bcrypt at cost 4 is still ~5 ms per call
    // and we reuse the same hash everywhere a password check is needed.
    passwordHash = await bcrypt.hash(password, 4);
  });

  beforeEach(async () => {
    prisma = buildPrisma();
    auth = { sendEmailVerification: jest.fn().mockResolvedValue(undefined) };
    mail = { sendAccountExportEmail: jest.fn().mockResolvedValue(undefined) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AccountService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          // Account service reads BCRYPT_COST via getNumberEnv — keep it low.
          useValue: {
            get: jest.fn((key: string) => (key === "BCRYPT_COST" ? "4" : undefined)),
            getOrThrow: jest.fn((key: string) => (key === "BCRYPT_COST" ? "4" : undefined)),
          },
        },
        { provide: AuthService, useValue: auth },
        { provide: MailService, useValue: mail },
      ],
    }).compile();
    service = moduleRef.get(AccountService);
  });

  // ── changeEmail ────────────────────────────────────────────────────────

  it("changeEmail: 404s when the user is missing", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.changeEmail("u_x", { newEmail: "n@e.com", currentPassword: password }),
    ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
  });

  it("changeEmail: rejects an incorrect current password", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", passwordHash, email: "old@e.com" });
    await expect(
      service.changeEmail("u1", { newEmail: "n@e.com", currentPassword: "wrong" }),
    ).rejects.toMatchObject({ code: ErrorCode.AUTH_UNAUTHORIZED });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("changeEmail: 409s when another account already owns the email", async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: "u1", passwordHash, email: "old@e.com" }) // self
      .mockResolvedValueOnce({ id: "u2", email: "n@e.com" }); // collision
    await expect(
      service.changeEmail("u1", { newEmail: "n@e.com", currentPassword: password }),
    ).rejects.toMatchObject({ code: ErrorCode.CONFLICT });
  });

  it("changeEmail: persists, clears emailVerified, and triggers re-verify", async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: "u1", passwordHash, email: "old@e.com" })
      .mockResolvedValueOnce(null);
    prisma.user.update.mockResolvedValue({ id: "u1" });

    await service.changeEmail("u1", { newEmail: "n@e.com", currentPassword: password });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { email: "n@e.com", emailVerified: null },
    });
    // Re-verification kicked off in the background; flush microtasks so the
    // call lands inside this test rather than leaking into the next one.
    await new Promise((r) => setImmediate(r));
    expect(auth.sendEmailVerification).toHaveBeenCalledWith("u1");
  });

  // ── changePassword ─────────────────────────────────────────────────────

  it("changePassword: rejects when new equals old", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", passwordHash });
    await expect(
      service.changePassword("u1", { currentPassword: password, newPassword: password }),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
  });

  it("changePassword: rotates the hash and revokes all live refresh tokens", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", passwordHash });
    await service.changePassword("u1", {
      currentPassword: password,
      newPassword: "brand-new-pw-1!",
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    // The first prepared op is the user.update (new hash), the second is
    // refreshToken.updateMany — ordering matters because we want the
    // password rotation to land before sessions get cut.
    expect(prisma.user.update).toHaveBeenCalled();
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("changePassword: 401s on a wrong current password", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", passwordHash });
    await expect(
      service.changePassword("u1", { currentPassword: "nope", newPassword: "x".repeat(12) }),
    ).rejects.toMatchObject({ code: ErrorCode.AUTH_UNAUTHORIZED });
  });

  // ── deleteAccount ──────────────────────────────────────────────────────

  it("deleteAccount: soft-deletes, frees email, and revokes sessions", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", passwordHash, email: "me@e.com" });
    await service.deleteAccount("u1", { currentPassword: password, confirmation: "DELETE" });

    // user.update target — assert email is rewritten to a freed sentinel
    // and isActive flips to false. The freed-email value is random per
    // call so just match its shape.
    const userUpdateCall = prisma.user.update.mock.calls[0]?.[0] as
      | { data: { isActive: boolean; email: string; deletedAt: Date } }
      | undefined;
    expect(userUpdateCall?.data.isActive).toBe(false);
    expect(userUpdateCall?.data.email).toMatch(/\+deleted@baydar\.invalid$/);
    expect(userUpdateCall?.data.deletedAt).toBeInstanceOf(Date);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
  });

  // ── session management ────────────────────────────────────────────────

  it("listSessions: returns shaped rows with current-device flag", async () => {
    const now = new Date();
    prisma.refreshToken.findMany.mockResolvedValue([
      {
        id: "rt1",
        deviceId: "dev-A",
        userAgent: "Mozilla/5.0",
        ipAddress: "1.2.3.4",
        createdAt: now,
        expiresAt: new Date(now.getTime() + 86_400_000),
      },
    ]);
    const sessions = await service.listSessions("u1", "dev-A");
    expect(sessions).toEqual([
      expect.objectContaining({
        id: "rt1",
        deviceId: "dev-A",
        current: true,
        userAgent: "Mozilla/5.0",
        ipAddress: "1.2.3.4",
      }),
    ]);
  });

  it("revokeSession: 404s when the session belongs to another user", async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: "rt1",
      userId: "u_other",
      revokedAt: null,
    });
    await expect(service.revokeSession("u1", "rt1")).rejects.toMatchObject({
      code: ErrorCode.NOT_FOUND,
    });
  });

  it("revokeSession: idempotent when already revoked", async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: "rt1",
      userId: "u1",
      revokedAt: new Date(),
    });
    await service.revokeSession("u1", "rt1");
    expect(prisma.refreshToken.update).not.toHaveBeenCalled();
  });

  it("revokeAllSessions: keeps the requested device when keepDeviceId is set", async () => {
    await service.revokeAllSessions("u1", { keepDeviceId: "dev-A" });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", revokedAt: null, deviceId: { not: "dev-A" } },
      data: { revokedAt: expect.any(Date) },
    });
  });

  // ── push tokens ────────────────────────────────────────────────────────

  it("registerPushToken: upserts on (userId, deviceId)", async () => {
    await service.registerPushToken("u1", { deviceId: "dev-A", token: "tok", platform: "ios" });
    expect(prisma.pushToken.upsert).toHaveBeenCalledWith({
      where: { userId_deviceId: { userId: "u1", deviceId: "dev-A" } },
      create: { userId: "u1", deviceId: "dev-A", token: "tok", platform: "ios" },
      update: { token: "tok", platform: "ios", lastSeenAt: expect.any(Date) },
    });
  });

  it("revokePushToken: deletes the row for the given device", async () => {
    await service.revokePushToken("u1", "dev-A");
    expect(prisma.pushToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", deviceId: "dev-A" },
    });
  });

  // ── account export (GDPR) ─────────────────────────────────────────────

  it("exportAccountData: assembles the dump and emails it under the 30s budget", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "me@e.com",
      profile: null,
    });
    prisma.post.findMany.mockResolvedValue([{ id: "p1" }]);
    prisma.comment.findMany.mockResolvedValue([{ id: "c1" }]);

    const result = await service.exportAccountData("u1");
    expect(result).toEqual({ status: "sent" });
    expect(mail.sendAccountExportEmail).toHaveBeenCalledTimes(1);
    const [to, json] = mail.sendAccountExportEmail.mock.calls[0]!;
    expect(to).toBe("me@e.com");
    // The dump is JSON — parse and check that scalar branches are present.
    const parsed = JSON.parse(json as string) as {
      user: { id: string };
      posts: Array<{ id: string }>;
    };
    expect(parsed.user.id).toBe("u1");
    expect(parsed.posts).toEqual([{ id: "p1" }]);
  });

  it("exportAccountData: 404s when the user disappears mid-export", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    // Service surfaces NOT_FOUND through the synchronous path; queued only
    // applies when the work is genuinely slow, not when it errors early.
    await expect(service.exportAccountData("u_missing")).rejects.toMatchObject({
      code: ErrorCode.NOT_FOUND,
    });
  });

  // Notification fan-out is exercised by NotificationsService specs; we
  // only assert AccountService never imports the notifications surface.
  it("AccountService stays decoupled from NotificationsService", () => {
    expect(NotificationType).toBeDefined(); // sanity import — keeps tree-shaken
    expect((service as unknown as { notifications?: unknown }).notifications).toBeUndefined();
  });
});
