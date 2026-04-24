import * as crypto from "node:crypto";

import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  type AuthSession,
  type AuthTokens,
  ErrorCode,
  type LoginBody,
  type RefreshBody,
  type RegisterBody,
  type ResetPasswordBody,
  type VerifyEmailBody,
} from "@palnet/shared";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

import { DomainException } from "../../common/domain-exception";
import type { Env } from "../../config/env";
import { getNumberEnv } from "../../config/get-number-env";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";

import type { AuthUser } from "./decorators/current-user.decorator";

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: AuthUser["role"];
  locale: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly mail: MailService,
  ) {}

  async register(body: RegisterBody, deviceId: string): Promise<AuthSession> {
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

    const passwordHash = await bcrypt.hash(
      body.password,
      getNumberEnv(this.config, "BCRYPT_COST"),
    );

    const user = await this.prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        locale: body.locale,
        role: "USER",
        profile: {
          create: {
            handle: await this.generateHandle(body.firstName, body.lastName),
            firstName: body.firstName,
            lastName: body.lastName,
            country: "PS",
            openToWork: false,
            hiring: false,
          },
        },
      },
    });

    const session = await this.issueSession(user, deviceId);
    // Fire-and-forget verification email so registration never hard-fails on
    // a mail provider hiccup.
    void this.sendEmailVerification(user.id).catch(() => undefined);
    return session;
  }

  async login(body: LoginBody): Promise<AuthSession> {
    const user = await this.prisma.user.findUnique({
      where: { email: body.email },
    });
    if (!user) throw this.badCredentials();

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) throw this.badCredentials();

    return this.issueSession(user, body.deviceId);
  }

  async refresh(body: RefreshBody): Promise<AuthSession> {
    const hash = hashToken(body.refreshToken);
    const record = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: hash, deviceId: body.deviceId, revokedAt: null },
      include: { user: true },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException({
        error: {
          code: ErrorCode.AUTH_UNAUTHORIZED,
          message: "Refresh token invalid or expired.",
        },
      });
    }

    // Rotate: revoke old, issue new.
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    return this.issueSession(record.user, body.deviceId);
  }

  async logout(userId: string, deviceId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: { userId, deviceId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      // Drop the push token too — the device is signing out, no more pushes
      // should land on a logged-out screen. Mobile re-registers on next login.
      this.prisma.pushToken.deleteMany({
        where: { userId, deviceId },
      }),
    ]);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Email verification
  // ─────────────────────────────────────────────────────────────────────

  async sendEmailVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (user.emailVerified) return;

    // Per-email throttle: if we sent a link in the last 60s, skip silently so
    // a bad actor holding a user's email can't flood their inbox. The user's
    // UI always reports "sent" regardless.
    const recent = await this.prisma.emailVerificationToken.findFirst({
      where: {
        userId,
        email: user.email,
        createdAt: { gt: new Date(Date.now() - VERIFY_RESEND_COOLDOWN_MS) },
      },
      select: { id: true },
    });
    if (recent) return;

    // Invalidate any outstanding unconsumed tokens for this user's current
    // email so old links can't race against the new one.
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, consumedAt: null, email: user.email },
      data: { consumedAt: new Date() },
    });

    const raw = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        email: user.email,
        tokenHash: hashToken(raw),
        expiresAt,
      },
    });

    const base = this.config.getOrThrow<string>("EMAIL_VERIFY_URL_BASE");
    const link = `${base}?token=${encodeURIComponent(raw)}`;
    const mobileLink = this.buildMobileLink("verify", raw);
    await this.mail.sendVerifyEmail(user.email, link, mobileLink);
  }

  async verifyEmail(body: VerifyEmailBody): Promise<void> {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash: hashToken(body.token) },
      include: { user: true },
    });
    if (
      !record ||
      record.consumedAt ||
      record.expiresAt < new Date() ||
      record.email !== record.user.email
    ) {
      throw new DomainException(
        ErrorCode.VALIDATION_FAILED,
        "This verification link is invalid or has expired.",
        400,
      );
    }
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { consumedAt: now },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: now },
      }),
    ]);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Password reset
  // ─────────────────────────────────────────────────────────────────────

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always no-op silently on unknown users to avoid enumeration.
    if (!user || !user.isActive) return;

    // Per-email throttle: if we sent a reset link in the last 60s, skip
    // silently so the flow can't be used to spam the target's inbox. UI
    // always reports "sent" regardless — consistent with enumeration defence.
    const recent = await this.prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        createdAt: { gt: new Date(Date.now() - RESET_RESEND_COOLDOWN_MS) },
      },
      select: { id: true },
    });
    if (recent) return;

    const raw = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(raw),
        expiresAt,
      },
    });
    const base = this.config.getOrThrow<string>("PASSWORD_RESET_URL_BASE");
    const link = `${base}?token=${encodeURIComponent(raw)}`;
    const mobileLink = this.buildMobileLink("reset", raw);
    await this.mail.sendPasswordResetEmail(user.email, link, mobileLink);
  }

  // Mobile auth links now use explicit base URLs so web and app targets can
  // diverge cleanly. Keep MOBILE_APP_SCHEME as fallback for older env files.
  private buildMobileLink(target: "verify" | "reset", rawToken: string): string | null {
    const baseKey =
      target === "verify"
        ? "EMAIL_VERIFY_MOBILE_URL_BASE"
        : "PASSWORD_RESET_MOBILE_URL_BASE";
    const configuredBase = this.config.get<string>(baseKey);
    if (configuredBase) {
      return `${configuredBase}?token=${encodeURIComponent(rawToken)}`;
    }

    const scheme = this.config.get<string>("MOBILE_APP_SCHEME");
    if (!scheme) return null;
    const legacyPath = target === "verify" ? "verify-email" : "reset-password";
    return `${scheme}://${legacyPath}?token=${encodeURIComponent(rawToken)}`;
  }

  async resetPassword(body: ResetPasswordBody): Promise<void> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(body.token) },
    });
    if (!record || record.consumedAt || record.expiresAt < new Date()) {
      throw new DomainException(
        ErrorCode.VALIDATION_FAILED,
        "This reset link is invalid or has expired.",
        400,
      );
    }
    const now = new Date();
    const passwordHash = await bcrypt.hash(
      body.newPassword,
      getNumberEnv(this.config, "BCRYPT_COST"),
    );
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { consumedAt: now },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      // Force re-login everywhere.
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
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
      emailVerified: user.emailVerified !== null,
      suspendedAt: user.suspendedAt ? user.suspendedAt.toISOString() : null,
      suspendedReason: user.suspendedReason ?? null,
    };
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

  private async issueSession(
    user: {
      id: string;
      email: string;
      role: AuthUser["role"];
      locale: string;
      emailVerified: Date | null;
    },
    deviceId: string,
  ): Promise<AuthSession> {
    const tokens = this.signTokens(user);

    // Persist refresh token hash.
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        deviceId,
        tokenHash: hashToken(tokens.refreshToken),
        expiresAt: new Date(tokens.refreshExpiresAt),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        locale: user.locale,
        emailVerified: user.emailVerified !== null,
      },
      tokens,
    };
  }

  private signTokens(user: {
    id: string;
    email: string;
    role: AuthUser["role"];
    locale: string;
  }): AuthTokens {
    const accessTtl = getNumberEnv(this.config, "JWT_ACCESS_TTL");
    const refreshTtl = getNumberEnv(this.config, "JWT_REFRESH_TTL");
    const accessSecret = this.config.getOrThrow<string>("JWT_ACCESS_SECRET");

    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      locale: user.locale,
    };

    const accessToken = jwt.sign(payload, accessSecret, {
      expiresIn: accessTtl,
    });

    // Refresh tokens are opaque random strings (we store their hash).
    const refreshToken = crypto.randomBytes(48).toString("base64url");

    const now = Date.now();
    return {
      accessToken,
      refreshToken,
      accessExpiresAt: new Date(now + accessTtl * 1000).toISOString(),
      refreshExpiresAt: new Date(now + refreshTtl * 1000).toISOString(),
    };
  }

  private async generateHandle(first: string, last: string): Promise<string> {
    const base = slugifyHandle(`${first}-${last}`).slice(0, 24) || "user";
    for (let i = 0; i < 8; i++) {
      const suffix = i === 0 ? "" : `-${crypto.randomInt(100, 9999)}`;
      const candidate = `${base}${suffix}`.slice(0, 30);
      const taken = await this.prisma.profile.findUnique({
        where: { handle: candidate },
      });
      if (!taken) return candidate;
    }
    return `${base}-${crypto.randomBytes(3).toString("hex")}`.slice(0, 30);
  }
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Short cooldowns so users can click "resend" a few times in a row without
// getting stuck, but fast enough that a stolen request token can't be used to
// flood a target inbox.
const VERIFY_RESEND_COOLDOWN_MS = 60 * 1000;
const RESET_RESEND_COOLDOWN_MS = 60 * 1000;

function slugifyHandle(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .replace(/-+$/g, "");
}
