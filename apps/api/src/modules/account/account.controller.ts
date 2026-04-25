import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import {
  AccountExportResponse,
  ChangeEmailBody,
  ChangePasswordBody,
  DeleteAccountBody,
  RegisterPushTokenBody,
  RevokeAllSessionsBody,
  type SessionList,
  type AccountExportResponse as AccountExportResponseType,
} from "@palnet/shared";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";

import { AccountService } from "./account.service";

@ApiTags("account")
@ApiBearerAuth()
@Controller("account")
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Post("email")
  @HttpCode(HttpStatus.NO_CONTENT)
  async changeEmail(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(ChangeEmailBody))
    body: ChangeEmailBody,
  ): Promise<void> {
    await this.account.changeEmail(user.id, body);
  }

  @Post("password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(ChangePasswordBody))
    body: ChangePasswordBody,
  ): Promise<void> {
    await this.account.changePassword(user.id, body);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(DeleteAccountBody))
    body: DeleteAccountBody,
  ): Promise<void> {
    await this.account.deleteAccount(user.id, body);
  }

  @Get("sessions")
  async listSessions(
    @CurrentUser() user: AuthUser,
    @Headers("x-device-id") deviceId: string | undefined,
  ): Promise<{ data: SessionList }> {
    const sessions = await this.account.listSessions(user.id, deviceId ?? null);
    return { data: { sessions } };
  }

  @Post("sessions/:id/revoke")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(
    @CurrentUser() user: AuthUser,
    @Param("id") sessionId: string,
  ): Promise<void> {
    await this.account.revokeSession(user.id, sessionId);
  }

  @Post("sessions/revoke-all")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeAll(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(RevokeAllSessionsBody))
    body: RevokeAllSessionsBody,
  ): Promise<void> {
    await this.account.revokeAllSessions(user.id, body);
  }

  @Post("push-tokens")
  @HttpCode(HttpStatus.NO_CONTENT)
  async registerPushToken(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(RegisterPushTokenBody))
    body: RegisterPushTokenBody,
  ): Promise<void> {
    await this.account.registerPushToken(user.id, body);
  }

  @Delete("push-tokens/:deviceId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokePushToken(
    @CurrentUser() user: AuthUser,
    @Param("deviceId") deviceId: string,
  ): Promise<void> {
    await this.account.revokePushToken(user.id, deviceId);
  }

  @Post("export")
  @Throttle({ default: { limit: 1, ttl: 86_400_000 } })
  async exportAccount(@CurrentUser() user: AuthUser): Promise<{ data: AccountExportResponseType }> {
    const data = await this.account.exportAccountData(user.id);
    return { data: AccountExportResponse.parse(data) };
  }
}
