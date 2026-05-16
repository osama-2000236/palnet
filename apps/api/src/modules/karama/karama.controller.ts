import { type KaramaBalance, type KaramaRedeemResult, RedeemKaramaBody } from "@baydar/shared";
import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { RequireCompleteProfile } from "../../common/require-complete-profile.decorator";
import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";

import { KaramaService } from "./karama.service";

@ApiTags("karama")
@ApiBearerAuth()
@RequireCompleteProfile()
@Controller("karama")
export class KaramaController {
  constructor(private readonly karama: KaramaService) {}

  @Get("balance")
  async balance(@CurrentUser() user: AuthUser): Promise<KaramaBalance> {
    return this.karama.getBalance(user.id);
  }

  @Post("redeem")
  async redeem(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(RedeemKaramaBody)) body: RedeemKaramaBody,
  ): Promise<KaramaRedeemResult> {
    return this.karama.redeem(user.id, body);
  }
}
