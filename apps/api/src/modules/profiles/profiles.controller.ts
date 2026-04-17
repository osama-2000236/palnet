import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UsePipes,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  OnboardProfileBody,
  UpdateProfileBody,
  type Profile as ProfileDto,
} from "@palnet/shared";

import { ZodValidationPipe } from "../../common/zod-pipe";
import {
  CurrentUser,
  type AuthUser,
} from "../auth/decorators/current-user.decorator";
import { OptionalAuth } from "../auth/decorators/optional-auth.decorator";
import { OptionalUser } from "../auth/decorators/optional-user.decorator";
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
  ): Promise<{ data: ProfileDto }> {
    const data = await this.profiles.onboard(user.id, body);
    return { data };
  }

  @Patch("me")
  @ApiBearerAuth()
  @UsePipes(new ZodValidationPipe(UpdateProfileBody))
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateProfileBody,
  ): Promise<{ data: ProfileDto }> {
    const data = await this.profiles.updateMine(user.id, body);
    return { data };
  }

  @Get("me")
  @ApiBearerAuth()
  async me(@CurrentUser() user: AuthUser): Promise<{ data: ProfileDto }> {
    const data = await this.profiles.getMine(user.id);
    return { data };
  }

  // Public: anyone can view a profile, but we attach viewer state when a
  // token is supplied.
  @OptionalAuth()
  @Get(":handle")
  async byHandle(
    @Param("handle") handle: string,
    @OptionalUser() viewer: AuthUser | null,
  ): Promise<{ data: ProfileDto }> {
    const data = await this.profiles.getByHandle(handle, viewer?.id);
    return { data };
  }
}
