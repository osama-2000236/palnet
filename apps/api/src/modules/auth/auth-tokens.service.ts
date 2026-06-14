import * as crypto from "node:crypto";

import { ErrorCode, type StreamTokenResponse, type StreamTokenScope } from "@baydar/shared";
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";

import { DomainException } from "../../common/domain-exception";
import type { Env } from "../../config/env";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
const STREAM_TTL_MS = 60 * 1000;
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

export interface StreamTokenUser {
  id: string;
  email: string;
  role: "USER" | "COMPANY_ADMIN" | "MODERATOR" | "ADMIN";
  locale: string;
}

interface StreamTokenRecord extends TokenRecord {
  scope: string;
  user: StreamTokenUser;
}

interface RawStreamTokenRow {
  id: string;
  userId: string;
  expiresAt: Date;
  consumedAt: Date | null;
  scope: string;
  userEmail: string;
  userRole: StreamTokenUser["role"];
  userLocale: string;
}

type RawCommand = <T = unknown>(query: TemplateStringsArray, ...values: unknown[]) => Promise<T>;

interface AuthTokenPrisma {
  $executeRaw?: RawCommand;
  $queryRaw?: RawCommand;
  user: {
    findUnique(args: unknown): Promise<{ id: string; email: string; locale?: string } | null>;
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
  sseStreamToken?: {
    create(args: unknown): Promise<unknown>;
    findFirst(args: unknown): Promise<StreamTokenRecord | null>;
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
      select: { id: true, email: true, locale: true },
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

    const locale = normalizeLocale(user.locale);
    await this.mail.send("verify-email", user.email, {
      url: this.buildWebUrl(`/verify-email/${plain}`, locale),
      locale,
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
      select: { id: true, email: true, locale: true },
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

    const locale = normalizeLocale(user.locale);
    await this.mail.send("password-reset", user.email, {
      url: this.buildWebUrl(`/reset-password/${plain}`, locale),
      locale,
    });
  }

  async issueStreamToken(userId: string, scope: StreamTokenScope): Promise<StreamTokenResponse> {
    const plain = createPlainToken();
    const expiresAt = new Date(Date.now() + STREAM_TTL_MS);
    const tokenHash = hashToken(plain);
    if (this.db.sseStreamToken) {
      await this.db.sseStreamToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt,
          scope,
        },
      });
    } else {
      const executeRaw = this.getExecuteRaw();
      await executeRaw`
        INSERT INTO "SseStreamToken" ("id", "userId", "tokenHash", "expiresAt", "scope")
        VALUES (${crypto.randomUUID()}, ${userId}, ${tokenHash}, ${expiresAt}, ${scope})
      `;
    }

    return {
      token: plain,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async consumeStreamToken(tokenPlain: string, scope: StreamTokenScope): Promise<StreamTokenUser> {
    const tokenHash = hashToken(tokenPlain);
    const record = this.db.sseStreamToken
      ? await this.db.sseStreamToken.findFirst({
          where: { tokenHash, scope },
          select: {
            id: true,
            userId: true,
            expiresAt: true,
            consumedAt: true,
            scope: true,
            user: { select: { id: true, email: true, role: true, locale: true } },
          },
        })
      : await this.findStreamTokenRaw(tokenHash, scope);
    this.assertStreamTokenCanBeConsumed(record);

    const consumedCount = this.db.sseStreamToken
      ? (
          await this.db.sseStreamToken.updateMany({
            where: { id: record.id, consumedAt: null },
            data: { consumedAt: new Date() },
          })
        ).count
      : await this.consumeStreamTokenRaw(record.id);
    if (consumedCount !== 1) throw this.invalidStreamToken();

    return record.user;
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

  private assertStreamTokenCanBeConsumed<T extends { expiresAt: Date; consumedAt: Date | null }>(
    record: T | null,
  ): asserts record is T {
    if (!record) throw this.invalidStreamToken();
    if (record.consumedAt) throw this.invalidStreamToken();
    if (record.expiresAt < new Date()) throw this.invalidStreamToken();
  }

  private invalidToken(): DomainException {
    return new DomainException(
      ErrorCode.AUTH_TOKEN_INVALID,
      "Token invalid.",
      HttpStatus.BAD_REQUEST,
    );
  }

  private invalidStreamToken(): DomainException {
    return new DomainException(
      ErrorCode.STREAM_TOKEN_INVALID,
      "Stream token invalid.",
      HttpStatus.UNAUTHORIZED,
    );
  }

  private async findStreamTokenRaw(
    tokenHash: string,
    scope: StreamTokenScope,
  ): Promise<StreamTokenRecord | null> {
    const queryRaw = this.getQueryRaw();
    const rows = await queryRaw<RawStreamTokenRow[]>`
      SELECT
        s."id",
        s."userId",
        s."expiresAt",
        s."consumedAt",
        s."scope",
        u."email" AS "userEmail",
        u."role" AS "userRole",
        u."locale" AS "userLocale"
      FROM "SseStreamToken" s
      INNER JOIN "User" u ON u."id" = s."userId"
      WHERE s."tokenHash" = ${tokenHash} AND s."scope" = ${scope}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      expiresAt: row.expiresAt,
      consumedAt: row.consumedAt,
      scope: row.scope,
      user: {
        id: row.userId,
        email: row.userEmail,
        role: row.userRole,
        locale: row.userLocale,
      },
    };
  }

  private async consumeStreamTokenRaw(id: string): Promise<number> {
    const executeRaw = this.getExecuteRaw();
    return executeRaw<number>`
      UPDATE "SseStreamToken"
      SET "consumedAt" = ${new Date()}
      WHERE "id" = ${id} AND "consumedAt" IS NULL
    `;
  }

  private getExecuteRaw(): RawCommand {
    const executeRaw = this.db.$executeRaw?.bind(this.db);
    if (!executeRaw) throw this.invalidStreamToken();
    return executeRaw;
  }

  private getQueryRaw(): RawCommand {
    const queryRaw = this.db.$queryRaw?.bind(this.db);
    if (!queryRaw) throw this.invalidStreamToken();
    return queryRaw;
  }

  private buildWebUrl(path: string, locale: "ar-PS" | "en" = "ar-PS"): string {
    const base =
      process.env.BAYDAR_WEB_URL ?? process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";
    return `${base.replace(/\/$/, "")}/${locale}${path}`;
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

function normalizeLocale(value: string | null | undefined): "ar-PS" | "en" {
  return value === "en" ? "en" : "ar-PS";
}
