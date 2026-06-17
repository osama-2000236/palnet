import {
  ActiveSession,
  ConfirmVerifyEmailBody,
  ChangePasswordBody,
  ErrorCode,
  ForgotPasswordBody,
  type AuthSession,
  LoginBody,
  LogoutBody,
  RefreshBody,
  RegisterBody,
  ResetPasswordBody,
  SendVerifyEmailBody,
  StreamTokenRequest,
  type StreamTokenResponse,
} from "@baydar/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";

import {
  parseCookieHeader,
  REFRESH_COOKIE_NAME,
  serializeClearedRefreshCookie,
  serializeRefreshCookie,
} from "../../common/cookies";
import { DomainException } from "../../common/domain-exception";
import { ZodValidationPipe } from "../../common/zod-pipe";

import { AuthEmailThrottleService } from "./auth-email-throttle.service";
import { AuthTokensService } from "./auth-tokens.service";
import { AuthService } from "./auth.service";
import { CurrentUser, type AuthUser } from "./decorators/current-user.decorator";
import { Public } from "./decorators/public.decorator";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

const authRouteLimit =
  process.env.NODE_ENV === "production"
    ? 10
    : Number.parseInt(process.env.BAYDAR_DEV_AUTH_RATE_LIMIT ?? "100", 10);
const authRefreshLimit =
  process.env.NODE_ENV === "production"
    ? 30
    : Number.parseInt(process.env.BAYDAR_DEV_AUTH_RATE_LIMIT ?? "300", 10);
const authTokenConsumeLimit =
  process.env.NODE_ENV === "production"
    ? 30
    : Number.parseInt(process.env.BAYDAR_DEV_AUTH_RATE_LIMIT ?? "300", 10);

const TRANSPORT_HEADER = "x-auth-transport";
type Transport = "body" | "cookie";

function readTransport(req: Request): Transport {
  const value = req.header(TRANSPORT_HEADER);
  return value === "body" ? "body" : "cookie";
}

function requestMeta(req: Request): { userAgent?: string; ipAddress?: string } {
  return {
    userAgent: req.get("user-agent"),
    ipAddress: req.ip,
  };
}

function isSecureRequest(req: Request): boolean {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  return req.secure || forwardedProto === "https" || process.env.NODE_ENV === "production";
}

@ApiTags("auth")
@Controller("auth")
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly authTokens: AuthTokensService,
    private readonly emailThrottle: AuthEmailThrottleService,
  ) {}

  @Public()
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: authRouteLimit, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(RegisterBody))
  @ApiCreatedResponse({ description: "Account created; returns tokens." })
  async register(
    @Body() body: RegisterBody,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: AuthSession }> {
    const session = await this.auth.register(
      body,
      body.deviceId ?? "register-bootstrap",
      requestMeta(req),
    );
    return { data: this.applyTransport(req, res, session) };
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: authRouteLimit, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(LoginBody))
  @ApiOkResponse({ description: "Authenticated; returns tokens." })
  async login(
    @Body() body: LoginBody,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: AuthSession }> {
    const session = await this.auth.login(body, requestMeta(req));
    return { data: this.applyTransport(req, res, session) };
  }

  /**
   * Refresh accepts the rotated token via either:
   *   1. Body (mobile / SDKs that opt in with `X-Auth-Transport: body`).
   *   2. HttpOnly cookie (the default; web). In this case the request body
   *      only needs `{ deviceId }`.
   *
   * The body schema (`RefreshBody`) still requires both fields; for the
   * cookie path we splice the token in before validation so the rest of the
   * pipeline stays unchanged.
   */
  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: authRefreshLimit, ttl: 60_000 } })
  @ApiOkResponse({ description: "Rotated refresh + new access token." })
  async refresh(
    @Body() rawBody: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: AuthSession }> {
    const transport = readTransport(req);
    const candidate = (rawBody ?? {}) as { deviceId?: unknown; refreshToken?: unknown };

    if (transport === "cookie") {
      const cookieToken = parseCookieHeader(req.headers.cookie, REFRESH_COOKIE_NAME);
      if (!cookieToken) {
        throw new DomainException(
          ErrorCode.AUTH_UNAUTHORIZED,
          "Missing refresh cookie.",
          HttpStatus.UNAUTHORIZED,
        );
      }
      candidate.refreshToken = cookieToken;
    }

    const parsed = RefreshBody.safeParse(candidate);
    if (!parsed.success) {
      throw new DomainException(
        ErrorCode.VALIDATION_FAILED,
        parsed.error.issues[0]?.message ?? "Invalid refresh payload.",
        HttpStatus.BAD_REQUEST,
      );
    }
    const session = await this.auth.refresh(parsed.data, requestMeta(req));
    return { data: this.applyTransport(req, res, session) };
  }

  @Public()
  @Post("verify-email/send")
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @UsePipes(new ZodValidationPipe(SendVerifyEmailBody))
  async sendVerifyEmail(@Body() body: SendVerifyEmailBody, @Req() req: Request): Promise<void> {
    this.emailThrottle.check(body.email, "verify-email");
    const user = await this.auth.findUserForEmailToken(body.email);
    if (user) {
      await this.authTokens.issueVerifyEmail(user.id, {
        requestedFromIp: req.ip,
        requestedFromUa: req.get("user-agent"),
      });
    }
  }

  @Public()
  @Post("verify-email/confirm")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: authTokenConsumeLimit, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(ConfirmVerifyEmailBody))
  async confirmVerifyEmail(
    @Body() body: ConfirmVerifyEmailBody,
  ): Promise<{ data: { emailVerified: true } }> {
    await this.authTokens.consumeVerifyEmail(body.token);
    return { data: { emailVerified: true } };
  }

  @Public()
  @Post("forgot-password")
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @UsePipes(new ZodValidationPipe(ForgotPasswordBody))
  async forgotPassword(@Body() body: ForgotPasswordBody, @Req() req: Request): Promise<void> {
    this.emailThrottle.check(body.email, "forgot-password");
    await this.authTokens.issuePasswordReset(body.email, {
      requestedFromIp: req.ip,
      requestedFromUa: req.get("user-agent"),
    });
  }

  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: authTokenConsumeLimit, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(ResetPasswordBody))
  async resetPassword(@Body() body: ResetPasswordBody): Promise<{ data: { reset: true } }> {
    await this.authTokens.consumePasswordReset(body.token, body.newPassword);
    return { data: { reset: true } };
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  async logout(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(LogoutBody)) body: LogoutBody,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(user.id, body.deviceId);
    if (readTransport(req) === "cookie") {
      res.setHeader(
        "Set-Cookie",
        serializeClearedRefreshCookie({
          secure: isSecureRequest(req),
        }),
      );
    }
  }

  @Post("change-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(ChangePasswordBody)) body: ChangePasswordBody,
  ): Promise<void> {
    await this.auth.changePassword(user.id, body);
  }

  @Get("sessions")
  @ApiBearerAuth()
  async sessions(@CurrentUser() user: AuthUser): Promise<{ data: ActiveSession[] }> {
    const data = await this.auth.listSessions(user.id);
    return { data };
  }

  @Delete("sessions/others")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  async logoutOtherSessions(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(LogoutBody)) body: LogoutBody,
  ): Promise<void> {
    await this.auth.logoutOthers(user.id, body.deviceId);
  }

  @Delete("sessions/:deviceId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  async logoutSession(
    @CurrentUser() user: AuthUser,
    @Param("deviceId") deviceId: string,
  ): Promise<void> {
    await this.auth.logout(user.id, deviceId);
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Current authenticated user summary." })
  async me(@CurrentUser() user: AuthUser): Promise<{ data: AuthSession["user"] }> {
    const data = await this.auth.me(user.id);
    return { data };
  }

  @Post("stream-token")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  async streamToken(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(StreamTokenRequest)) body: StreamTokenRequest,
  ): Promise<{ data: StreamTokenResponse }> {
    const data = await this.authTokens.issueStreamToken(user.id, body.scope);
    return { data };
  }

  /**
   * For the cookie transport (web), the refresh token must NEVER reach the
   * JSON response body — that's the entire point of HttpOnly. We set the
   * cookie and return the session with the refresh field redacted to an
   * empty string (clients shouldn't read it; the cookie is the source of
   * truth). The mobile transport leaves the body intact.
   */
  private applyTransport(req: Request, res: Response, session: AuthSession): AuthSession {
    if (readTransport(req) === "body") return session;
    const refreshExpiresMs = Date.parse(session.tokens.refreshExpiresAt) - Date.now();
    const maxAgeSeconds = Math.max(0, Math.floor(refreshExpiresMs / 1000));
    res.setHeader(
      "Set-Cookie",
      serializeRefreshCookie(session.tokens.refreshToken, {
        maxAgeSeconds,
        secure: isSecureRequest(req),
      }),
    );
    return {
      ...session,
      tokens: { ...session.tokens, refreshToken: "" },
    };
  }
}
