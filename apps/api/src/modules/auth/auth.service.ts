import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  type AuthSession,
  type AuthTokens,
  ErrorCode,
  type LoginBody,
  type RefreshBody,
  type RegisterBody,
} from "@palnet/shared";
import * as bcrypt from "bcrypt";
import * as crypto from "node:crypto";
import * as jwt from "jsonwebtoken";

import { DomainException } from "../../common/domain-exception";
import type { Env } from "../../config/env";
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
      this.config.getOrThrow<number>("BCRYPT_COST"),
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

    return this.issueSession(user, deviceId);
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
    await this.prisma.refreshToken.updateMany({
      where: { userId, deviceId, revokedAt: null },
      data: { revokedAt: new Date() },
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
    user: { id: string; email: string; role: AuthUser["role"]; locale: string },
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
    const accessTtl = this.config.getOrThrow<number>("JWT_ACCESS_TTL");
    const refreshTtl = this.config.getOrThrow<number>("JWT_REFRESH_TTL");
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
    const base = slugify(`${first}-${last}`).slice(0, 24) || "user";
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

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}
