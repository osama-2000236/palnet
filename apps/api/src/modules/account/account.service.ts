import { randomBytes } from "node:crypto";
import * as crypto from "node:crypto";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  type ChangeEmailBody,
  type ChangePasswordBody,
  type DeleteAccountBody,
  ErrorCode,
  type AccountExportResponse,
  type RegisterPushTokenBody,
  type RevokeAllSessionsBody,
  type SessionInfo,
} from "@palnet/shared";
import * as bcrypt from "bcrypt";

import { DomainException } from "../../common/domain-exception";
import type { Env } from "../../config/env";
import { getNumberEnv } from "../../config/get-number-env";
import { AuthService } from "../auth/auth.service";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly auth: AuthService,
    private readonly mail: MailService,
  ) {}

  async changeEmail(userId: string, body: ChangeEmailBody): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new DomainException(ErrorCode.NOT_FOUND, "User not found.", 404);
    }
    await this.requirePassword(user.passwordHash, body.currentPassword);

    // Collision check before we touch the row — cleaner error surface.
    const clash = await this.prisma.user.findUnique({
      where: { email: body.newEmail },
    });
    if (clash && clash.id !== userId) {
      throw new DomainException(
        ErrorCode.CONFLICT,
        "Another account already uses this email.",
        409,
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      // Flipping the email invalidates the old verification — force re-verify.
      data: { email: body.newEmail, emailVerified: null },
    });

    // Kick off a fresh verification email so the user isn't stuck at an
    // unverified banner with no path forward.
    void this.auth.sendEmailVerification(userId).catch(() => undefined);
  }

  async changePassword(userId: string, body: ChangePasswordBody): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new DomainException(ErrorCode.NOT_FOUND, "User not found.", 404);
    }
    await this.requirePassword(user.passwordHash, body.currentPassword);

    if (body.currentPassword === body.newPassword) {
      throw new DomainException(
        ErrorCode.VALIDATION_FAILED,
        "New password must differ from the current one.",
        400,
      );
    }

    const newHash = await bcrypt.hash(body.newPassword, getNumberEnv(this.config, "BCRYPT_COST"));
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      }),
      // Changing the password logs every device out — core security guarantee.
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async deleteAccount(userId: string, body: DeleteAccountBody): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new DomainException(ErrorCode.NOT_FOUND, "User not found.", 404);
    }
    await this.requirePassword(user.passwordHash, body.currentPassword);

    // Soft-delete + free the email so the user (or a new user) can re-register.
    const freedEmail = `${randomBytes(8).toString("hex")}+deleted@baydar.invalid`;
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          deletedAt: new Date(),
          email: freedEmail,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async listSessions(userId: string, currentDeviceId: string | null): Promise<SessionInfo[]> {
    const rows = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        deviceId: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      deviceId: r.deviceId,
      userAgent: r.userAgent,
      ipAddress: r.ipAddress,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      current: r.deviceId === currentDeviceId,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const row = await this.prisma.refreshToken.findUnique({
      where: { id: sessionId },
    });
    if (!row || row.userId !== userId) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Session not found.", 404);
    }
    if (row.revokedAt) return; // idempotent
    await this.prisma.refreshToken.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllSessions(userId: string, body: RevokeAllSessionsBody): Promise<void> {
    const keep = body.keepDeviceId ?? null;
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(keep ? { deviceId: { not: keep } } : {}),
      },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Upsert a push token for a (userId, deviceId) pair. Tokens rotate on
   * OS-initiated events (app reinstall, OS restore) so register must be
   * idempotent and overwrite a stale token without leaving duplicate rows.
   */
  async registerPushToken(userId: string, body: RegisterPushTokenBody): Promise<void> {
    await this.prisma.pushToken.upsert({
      where: {
        userId_deviceId: { userId, deviceId: body.deviceId },
      },
      create: {
        userId,
        deviceId: body.deviceId,
        token: body.token,
        platform: body.platform,
      },
      update: {
        token: body.token,
        platform: body.platform,
        lastSeenAt: new Date(),
      },
    });
  }

  /** Remove the push token for a given device (logout path). Idempotent. */
  async revokePushToken(userId: string, deviceId: string): Promise<void> {
    await this.prisma.pushToken.deleteMany({
      where: { userId, deviceId },
    });
  }

  async exportAccountData(userId: string): Promise<AccountExportResponse> {
    const task = this.buildAndSendAccountExport(userId);
    let timer: NodeJS.Timeout | undefined;
    const status = await Promise.race([
      task.then(() => "sent" as const),
      new Promise<"queued">((resolve) => {
        timer = setTimeout(() => resolve("queued"), 30_000);
      }),
    ]);
    // Always release the loser timer so it doesn't hold the event loop
    // open after the request finishes (matters in tests + graceful shutdown).
    if (timer) clearTimeout(timer);
    if (status === "queued") task.catch(() => undefined);
    return { status };
  }

  private async buildAndSendAccountExport(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        phone: true,
        role: true,
        locale: true,
        isActive: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        notificationPrefs: true,
        profile: {
          include: {
            experiences: true,
            educations: true,
            skills: { include: { skill: true } },
          },
        },
      },
    });
    if (!user) {
      throw new DomainException(ErrorCode.NOT_FOUND, "User not found.", 404);
    }

    const [posts, comments, reactions, reposts, connections, reports] = await Promise.all([
      this.prisma.post.findMany({
        where: { authorId: userId },
        include: { media: true },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.comment.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.reaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.repost.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.connection.findMany({
        where: { OR: [{ requesterId: userId }, { receiverId: userId }] },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.report.findMany({
        where: {
          OR: [
            { reporterId: userId },
            { targetUserId: userId },
            { resolvedById: userId },
            { appealReviewedById: userId },
          ],
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      user,
      posts,
      comments,
      reactions,
      reposts,
      connections,
      reports,
    };

    await this.mail.sendAccountExportEmail(user.email, JSON.stringify(payload, null, 2));
  }

  private async requirePassword(hash: string, candidate: string): Promise<void> {
    const ok = await bcrypt.compare(candidate, hash);
    if (!ok) {
      throw new DomainException(ErrorCode.AUTH_UNAUTHORIZED, "Current password is incorrect.", 401);
    }
  }
}

// Silence unused-import warning when the crypto namespace import is retained
// for future password-reset nonces.
void crypto;
