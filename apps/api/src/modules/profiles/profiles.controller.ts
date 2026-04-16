import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UsePipes,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { OnboardProfileBody } from "@palnet/shared";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { ProfilesService } from "./profiles.service";

@ApiTags("profiles")
@Controller("profiles")
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Post("onboard")
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Create or complete the current user's profile." })
  @UsePipes(new ZodValidationPipe(OnboardProfileBody))
  async onboard(
    @CurrentUser() user: AuthUser,
    @Body() body: OnboardProfileBody,
  ) {
    const data = await this.profiles.onboard(user.id, body);
    return { data };
  }

  @Get("me")
  @ApiBearerAuth()
  async me(@CurrentUser() user: AuthUser) {
    const data = await this.profiles.getMine(user.id);
    return { data };
  }

  @Public()
  @Get(":handle")
  async byHandle(@Param("handle") handle: string) {
    const data = await this.profiles.getByHandle(handle);
    return { data };
  }
}
