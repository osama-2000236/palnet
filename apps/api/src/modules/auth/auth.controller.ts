import {
  ConfirmVerifyEmailBody,
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
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";

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
  async register(@Body() body: RegisterBody): Promise<{ data: AuthSession }> {
    const data = await this.auth.register(body, body.deviceId ?? "register-bootstrap");
    return { data };
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: authRouteLimit, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(LoginBody))
  @ApiOkResponse({ description: "Authenticated; returns tokens." })
  async login(@Body() body: LoginBody): Promise<{ data: AuthSession }> {
    const data = await this.auth.login(body);
    return { data };
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: authRefreshLimit, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(RefreshBody))
  @ApiOkResponse({ description: "Rotated refresh + new access token." })
  async refresh(@Body() body: RefreshBody): Promise<{ data: AuthSession }> {
    const data = await this.auth.refresh(body);
    return { data };
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
  ): Promise<void> {
    await this.auth.logout(user.id, body.deviceId);
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
}
