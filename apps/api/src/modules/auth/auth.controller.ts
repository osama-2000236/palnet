import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import {
  type AuthSession,
  LoginBody,
  RefreshBody,
  RegisterBody,
  RequestPasswordResetBody,
  ResetPasswordBody,
  VerifyEmailBody,
} from "@palnet/shared";

import { ZodValidationPipe } from "../../common/zod-pipe";

import { AuthService } from "./auth.service";
import { AllowSuspended } from "./decorators/allow-suspended.decorator";
import { CurrentUser, type AuthUser } from "./decorators/current-user.decorator";
import { Public } from "./decorators/public.decorator";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@ApiTags("auth")
@Controller("auth")
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiCreatedResponse({ description: "Account created; returns tokens." })
  async register(
    @Body(new ZodValidationPipe(RegisterBody))
    body: RegisterBody,
  ): Promise<{ data: AuthSession }> {
    // deviceId is not in RegisterBody — generate a stable bootstrap id client-side later.
    // For now, issue session under a synthetic device marker.
    const data = await this.auth.register(body, "register-bootstrap");
    return { data };
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOkResponse({ description: "Authenticated; returns tokens." })
  async login(
    @Body(new ZodValidationPipe(LoginBody))
    body: LoginBody,
  ): Promise<{ data: AuthSession }> {
    const data = await this.auth.login(body);
    return { data };
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOkResponse({ description: "Rotated refresh + new access token." })
  async refresh(
    @Body(new ZodValidationPipe(RefreshBody))
    body: RefreshBody,
  ): Promise<{ data: AuthSession }> {
    const data = await this.auth.refresh(body);
    return { data };
  }

  @Post("logout")
  @AllowSuspended()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  async logout(
    @CurrentUser() user: AuthUser,
    @Body() body: { deviceId: string },
  ): Promise<void> {
    await this.auth.logout(user.id, body.deviceId);
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Current authenticated user summary." })
  async me(
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: AuthSession["user"] }> {
    const data = await this.auth.me(user.id);
    return { data };
  }

  // ─────────── Email verification ───────────

  @Post("email/verify/request")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiBearerAuth()
  async requestEmailVerify(@CurrentUser() user: AuthUser): Promise<void> {
    await this.auth.sendEmailVerification(user.id);
  }

  @Public()
  @Post("email/verify")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async verifyEmail(
    @Body(new ZodValidationPipe(VerifyEmailBody))
    body: VerifyEmailBody,
  ): Promise<void> {
    await this.auth.verifyEmail(body);
  }

  // ─────────── Password reset ───────────

  @Public()
  @Post("password/reset/request")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async requestPasswordReset(
    @Body(new ZodValidationPipe(RequestPasswordResetBody))
    body: RequestPasswordResetBody,
  ): Promise<void> {
    await this.auth.requestPasswordReset(body.email);
  }

  @Public()
  @Post("password/reset")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async resetPassword(
    @Body(new ZodValidationPipe(ResetPasswordBody))
    body: ResetPasswordBody,
  ): Promise<void> {
    await this.auth.resetPassword(body);
  }
}
