import {
  type ActiveSession,
  type AuthSession,
  type ChangePasswordBody,
  ErrorCode,
  type LoginBody,
  type RefreshBody,
  type RegisterBody,
} from "@baydar/shared";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";

import { DomainException } from "../../common/domain-exception";
import type { Env } from "../../config/env";
import { isWithinRestoreGrace } from "../account/account-retention";
import { PrismaService } from "../prisma/prisma.service";

import type { AuthUser } from "./decorators/current-user.decorator";
import { hashToken, numberConfig, signTokens } from "./session-tokens";

interface SessionMeta {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async register(
    body: RegisterBody,
    deviceId: string,
    meta: SessionMeta = {},
  ): Promise<AuthSession> {
    const existing = await this.prisma.user.findUnique({
      where: { email: body.email },
    });
    if (existing) {
      throw new DomainException(
        ErrorCode.CONFLICT,
        "An account with this email already exists.",
        409,
      );
    }

    const passwordHash = await bcrypt.hash(body.password, numberConfig(this.config, "BCRYPT_COST"));

    const user = await this.prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        locale: body.locale,
        role: "USER",
      },
    });

    return this.issueSession(user, deviceId, meta);
  }

  async login(body: LoginBody, meta: SessionMeta = {}): Promise<AuthSession> {
    const user =
      (await this.prisma.user.findUnique({
        where: { email: body.email },
      })) ??
      (await this.prisma.user.findFirst({
        where: {
          deletedAt: { not: null },
          pendingDeletionSnapshot: { path: ["email"], equals: body.email },
        } as never,
      }));
    if (!user) throw this.badCredentials();

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) throw this.badCredentials();

    if (user.deletedAt) {
      const inGrace = isWithinRestoreGrace(user.deletedAt, new Date());
      throw new DomainException(
        inGrace ? ErrorCode.ACCOUNT_DELETED_PENDING_RESTORE : ErrorCode.ACCOUNT_DELETED,
        inGrace
          ? "Account is pending deletion and can be restored within the grace period."
          : "Account has been deleted.",
        403,
        inGrace ? { restorePath: "/account/restore" } : undefined,
      );
    }

    return this.issueSession(user, body.deviceId, meta);
  }

  async refresh(body: RefreshBody, meta: SessionMeta = {}): Promise<AuthSession> {
    const hash = hashToken(body.refreshToken);
    // Revoked rows stay in the lookup on purpose: a presented token that was
    // already rotated is the reuse signal, and filtering it out here would make
    // the burn below unreachable — the replay would just 401 like a typo.
    const record = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: hash, deviceId: body.deviceId },
      include: { user: true },
    });
    if (!record || record.expiresAt < new Date()) {
      throw this.refreshUnauthorized();
    }

    if (record.revokedAt) {
      await this.burnUserSessions(record.userId);
      throw this.refreshUnauthorized();
    }

    // ponytail: updateMany claim; count=0 = lost the race → burn all user sessions
    const claimed = await this.prisma.refreshToken.updateMany({
      where: { id: record.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (claimed.count !== 1) {
      await this.burnUserSessions(record.userId);
      throw this.refreshUnauthorized();
    }

    return this.issueSession(record.user, body.deviceId, meta);
  }

  async logout(userId: string, deviceId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, deviceId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async logoutOthers(userId: string, currentDeviceId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, deviceId: { not: currentDeviceId }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async listSessions(userId: string): Promise<ActiveSession[]> {
    const rows = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: {
        deviceId: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
      },
    });

    const seen = new Set<string>();
    const sessions: ActiveSession[] = [];
    for (const row of rows) {
      if (seen.has(row.deviceId)) continue;
      seen.add(row.deviceId);
      sessions.push({
        id: row.deviceId,
        device: row.userAgent ?? row.deviceId,
        lastActiveAt: row.createdAt.toISOString(),
      });
    }
    return sessions;
  }

  async changePassword(userId: string, body: ChangePasswordBody): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) throw this.badCredentials();

    const ok = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!ok) throw this.badCredentials();

    const passwordHash = await bcrypt.hash(
      body.newPassword,
      numberConfig(this.config, "BCRYPT_COST"),
    );
    const now = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId, deviceId: { not: body.deviceId }, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  async me(userId: string): Promise<AuthSession["user"]> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      locale: user.locale,
      emailVerified: user.emailVerified?.toISOString() ?? null,
    };
  }

  async findUserForEmailToken(email: string): Promise<{ id: string } | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
  }

  // --- internals ---

  private badCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      error: {
        code: ErrorCode.AUTH_UNAUTHORIZED,
        message: "Invalid email or password.",
      },
    });
  }

  /** Reuse or a lost rotation race means the token may be stolen: drop every live session. */
  private async burnUserSessions(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private refreshUnauthorized(): UnauthorizedException {
    return new UnauthorizedException({
      error: {
        code: ErrorCode.AUTH_UNAUTHORIZED,
        message: "Refresh token invalid or expired.",
      },
    });
  }

  async issueSession(
    user: { id: string; email: string; role: AuthUser["role"]; locale: string },
    deviceId: string,
    meta: SessionMeta = {},
  ): Promise<AuthSession> {
    const tokens = signTokens(this.config, user);

    // Persist refresh token hash.
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        deviceId,
        tokenHash: hashToken(tokens.refreshToken),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt: new Date(tokens.refreshExpiresAt),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        locale: user.locale,
      },
      tokens,
    };
  }
}
