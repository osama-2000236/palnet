import * as crypto from "node:crypto";

import { ErrorCode } from "@baydar/shared";
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";

import { DomainException } from "../../common/domain-exception";
import type { Env } from "../../config/env";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
const TOKEN_BYTES = 32;

interface RequestMeta {
  requestedFromIp?: string;
  requestedFromUa?: string;
}

interface TokenRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  consumedAt: Date | null;
}

interface AuthTokenPrisma {
  user: {
    findUnique(args: unknown): Promise<{ id: string; email: string } | null>;
    update(args: unknown): Promise<unknown>;
  };
  emailVerificationToken: {
    create(args: unknown): Promise<unknown>;
    findFirst(args: unknown): Promise<TokenRecord | null>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  passwordResetToken: {
    create(args: unknown): Promise<unknown>;
    findFirst(args: unknown): Promise<TokenRecord | null>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  refreshToken: {
    updateMany(args: unknown): Promise<unknown>;
  };
}

@Injectable()
export class AuthTokensService {
  private readonly logger = new Logger(AuthTokensService.name);
  private readonly db: AuthTokenPrisma;

  constructor(
    prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly mail: MailService,
  ) {
    this.db = prisma as unknown as AuthTokenPrisma;
  }

  async issueVerifyEmail(userId: string, meta: RequestMeta = {}): Promise<void> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) return;

    const plain = createPlainToken();
    await this.db.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(plain),
        expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
        requestedFromIp: meta.requestedFromIp,
        requestedFromUa: meta.requestedFromUa,
      },
    });

    await this.mail.send("verify-email", user.email, {
      url: this.buildWebUrl(`/auth/verify-email/${plain}`),
    });
  }

  async consumeVerifyEmail(tokenPlain: string): Promise<void> {
    const tokenHash = hashToken(tokenPlain);
    const record = await this.db.emailVerificationToken.findFirst({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, consumedAt: true },
    });
    this.assertTokenCanBeConsumed(record);

    const now = new Date();
    const consumed = await this.db.emailVerificationToken.updateMany({
      where: { id: record.id, consumedAt: null },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) throw this.invalidToken();

    await this.db.user.update({
      where: { id: record.userId },
      data: { emailVerified: now },
    });
  }

  async issuePasswordReset(email: string, meta: RequestMeta = {}): Promise<void> {
    const user = await this.db.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (!user) {
      this.logger.log(`Password reset requested for non-existent account: ${email}`);
      return;
    }

    const plain = createPlainToken();
    await this.db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(plain),
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
        requestedFromIp: meta.requestedFromIp,
        requestedFromUa: meta.requestedFromUa,
      },
    });

    await this.mail.send("password-reset", user.email, {
      url: this.buildWebUrl(`/auth/reset-password/${plain}`),
    });
  }

  async consumePasswordReset(tokenPlain: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(tokenPlain);
    const record = await this.db.passwordResetToken.findFirst({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, consumedAt: true },
    });
    this.assertTokenCanBeConsumed(record);

    const now = new Date();
    const consumed = await this.db.passwordResetToken.updateMany({
      where: { id: record.id, consumedAt: null },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) throw this.invalidToken();

    const passwordHash = await bcrypt.hash(newPassword, this.getBcryptCost());
    await this.db.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
    await this.db.passwordResetToken.updateMany({
      where: { userId: record.userId, consumedAt: null },
      data: { consumedAt: now },
    });
    await this.db.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  private assertTokenCanBeConsumed<T extends { expiresAt: Date; consumedAt: Date | null }>(
    record: T | null,
  ): asserts record is T {
    if (!record) throw this.invalidToken();
    if (record.consumedAt) throw this.invalidToken();
    if (record.expiresAt < new Date()) {
      throw new DomainException(
        ErrorCode.AUTH_TOKEN_EXPIRED,
        "Token expired.",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private invalidToken(): DomainException {
    return new DomainException(
      ErrorCode.AUTH_TOKEN_INVALID,
      "Token invalid.",
      HttpStatus.BAD_REQUEST,
    );
  }

  private buildWebUrl(path: string): string {
    const base =
      process.env.BAYDAR_WEB_URL ?? process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";
    return `${base.replace(/\/$/, "")}/ar-PS${path}`;
  }

  private getBcryptCost(): number {
    const value = this.config.getOrThrow<number | string>("BCRYPT_COST");
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed)) throw new Error("Invalid numeric config value: BCRYPT_COST");
    return parsed;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createPlainToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}
