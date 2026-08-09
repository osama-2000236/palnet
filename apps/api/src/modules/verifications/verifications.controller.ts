import {
  ConfirmEmailDomainVerificationBody,
  ConfirmPhoneVerificationBody,
  RequestBodyVerificationBody,
  StartEmailDomainVerificationBody,
  StartPhoneVerificationBody,
  type EmailDomainChallenge,
  type MyVerifications,
  type OtpChallenge,
  type VerificationState,
} from "@baydar/shared";
import { Body, Controller, Get, Header, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
import { RateLimit } from "../rate-limit/rate-limit.decorator";

import { VerificationsService } from "./verifications.service";

@ApiTags("verifications")
@ApiBearerAuth()
@Controller("verifications")
export class VerificationsController {
  constructor(private readonly verifications: VerificationsService) {}

  @Get("me")
  // Viewer-scoped by definition: this is a list of one person's credentials.
  @Header("Cache-Control", "private, no-store")
  async listMine(@CurrentUser() user: AuthUser): Promise<{ data: MyVerifications }> {
    return { data: await this.verifications.listMine(user.id) };
  }

  @Post("phone/start")
  @RateLimit("otpStart")
  async startPhone(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(StartPhoneVerificationBody)) body: StartPhoneVerificationBody,
  ): Promise<{ data: OtpChallenge }> {
    return { data: await this.verifications.startPhone(user.id, body) };
  }

  @Post("phone/confirm")
  @RateLimit("otpConfirm")
  async confirmPhone(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(ConfirmPhoneVerificationBody)) body: ConfirmPhoneVerificationBody,
  ): Promise<{ data: VerificationState }> {
    return { data: await this.verifications.confirmPhone(user.id, body) };
  }

  @Post("email-domain/start")
  @RateLimit("otpStart")
  async startEmailDomain(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(StartEmailDomainVerificationBody))
    body: StartEmailDomainVerificationBody,
  ): Promise<{ data: EmailDomainChallenge }> {
    return { data: await this.verifications.startEmailDomain(user.id, body) };
  }

  @Post("email-domain/confirm")
  @RateLimit("otpConfirm")
  async confirmEmailDomain(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(ConfirmEmailDomainVerificationBody))
    body: ConfirmEmailDomainVerificationBody,
  ): Promise<{ data: VerificationState }> {
    return { data: await this.verifications.confirmEmailDomain(user.id, body) };
  }

  @Post("body/request")
  @RateLimit("contentCreate")
  async requestBody(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(RequestBodyVerificationBody)) body: RequestBodyVerificationBody,
  ): Promise<{ data: VerificationState }> {
    return { data: await this.verifications.requestBody(user.id, body) };
  }
}
