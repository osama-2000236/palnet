import { type AuthSession, LoginBody, RefreshBody, RegisterBody } from "@baydar/shared";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { ZodValidationPipe } from "../../common/zod-pipe";

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
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ auth: { limit: authRouteLimit, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(RegisterBody))
  @ApiCreatedResponse({ description: "Account created; returns tokens." })
  async register(@Body() body: RegisterBody): Promise<{ data: AuthSession }> {
    const data = await this.auth.register(body, body.deviceId ?? "register-bootstrap");
    return { data };
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: authRouteLimit, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(LoginBody))
  @ApiOkResponse({ description: "Authenticated; returns tokens." })
  async login(@Body() body: LoginBody): Promise<{ data: AuthSession }> {
    const data = await this.auth.login(body);
    return { data };
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: authRefreshLimit, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(RefreshBody))
  @ApiOkResponse({ description: "Rotated refresh + new access token." })
  async refresh(@Body() body: RefreshBody): Promise<{ data: AuthSession }> {
    const data = await this.auth.refresh(body);
    return { data };
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  async logout(@CurrentUser() user: AuthUser, @Body() body: { deviceId: string }): Promise<void> {
    await this.auth.logout(user.id, body.deviceId);
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Current authenticated user summary." })
  async me(@CurrentUser() user: AuthUser): Promise<{ data: AuthSession["user"] }> {
    const data = await this.auth.me(user.id);
    return { data };
  }
}
