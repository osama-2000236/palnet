import {
  ConfirmWorkProofBody,
  CreateWorkProofBody,
  DisputeWorkProofBody,
  MyWorkProofsQuery,
  type WorkProof,
} from "@baydar/shared";
import { Body, Controller, Get, Header, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
import { RateLimit } from "../rate-limit/rate-limit.decorator";

import { WorkProofsService } from "./work-proofs.service";

@ApiTags("work-proofs")
@ApiBearerAuth()
@Controller("work-proofs")
export class WorkProofsController {
  constructor(private readonly proofs: WorkProofsService) {}

  @Post()
  @RateLimit("contentCreate")
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateWorkProofBody)) body: CreateWorkProofBody,
  ): Promise<{ data: WorkProof }> {
    return { data: await this.proofs.create(user.id, body) };
  }

  @Get("me")
  // The list is one member's own evidence, in both roles. Never shared cache.
  @Header("Cache-Control", "private, no-store")
  async listMine(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(MyWorkProofsQuery)) query: MyWorkProofsQuery,
  ): Promise<{ data: WorkProof[] }> {
    return { data: await this.proofs.listMine(user.id, query) };
  }

  /**
   * Confirm.
   *
   * Authenticated for an on-platform counterparty; the six-digit code in the
   * body is what authorises an off-platform one, who has no account to sign in
   * to. `otpConfirm` covers both, so a code cannot be sprayed from a session.
   */
  @Post(":id/confirm")
  @RateLimit("otpConfirm")
  async confirm(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(ConfirmWorkProofBody)) body: ConfirmWorkProofBody,
  ): Promise<{ data: WorkProof }> {
    return { data: await this.proofs.confirm(id, body, user.id) };
  }

  @Post(":id/decline")
  async decline(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<{ data: WorkProof }> {
    return { data: await this.proofs.decline(id, user.id) };
  }

  @Post(":id/dispute")
  @RateLimit("safetyAction")
  async dispute(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(DisputeWorkProofBody)) body: DisputeWorkProofBody,
  ): Promise<{ data: WorkProof }> {
    return { data: await this.proofs.dispute(id, user.id, body) };
  }
}
