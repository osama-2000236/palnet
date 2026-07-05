import {
  DeleteAccountBody,
  RestoreAccountBody,
  type AuthSession,
  type DeleteAccountBody as DeleteAccountBodyType,
  type RestoreAccountBody as RestoreAccountBodyType,
} from "@baydar/shared";
import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UsePipes,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { applyAuthTransport } from "../auth/auth-transport";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";

import { AccountService } from "./account.service";

@ApiTags("account")
@Controller("account")
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Post("delete")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  async delete(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(DeleteAccountBody)) _body: DeleteAccountBodyType,
  ): Promise<void> {
    await this.account.delete(user.id);
  }

  @Get("export")
  @Header("Content-Type", "application/json")
  @ApiBearerAuth()
  async export(@CurrentUser() user: AuthUser, @Res() res: Response): Promise<void> {
    const data = await this.account.export(user.id);
    res.setHeader("Content-Disposition", `attachment; filename="baydar-export-${user.id}.json"`);
    res.status(HttpStatus.OK).json(data);
  }

  @Public()
  @Post("restore")
  @HttpCode(HttpStatus.OK)
  // Credential-testing surface (email+password), same brute-force posture as auth routes.
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @UsePipes(new ZodValidationPipe(RestoreAccountBody))
  @ApiOkResponse({ description: "Restored account; returns tokens." })
  async restore(
    @Body() body: RestoreAccountBodyType,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: AuthSession }> {
    const data = await this.account.restore(body);
    // Same transport contract as login: web gets an HttpOnly refresh cookie,
    // mobile keeps body transport.
    return { data: applyAuthTransport(req, res, data) };
  }
}
