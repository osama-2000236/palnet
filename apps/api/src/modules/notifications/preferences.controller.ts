import {
  NotificationPreferences as NotificationPreferencesSchema,
  type NotificationPreferences,
} from "@baydar/shared";
import { Body, Controller, Get, HttpCode, HttpStatus, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";

import { NotificationPreferencesService } from "./preferences.service";

@ApiTags("notifications")
@ApiBearerAuth()
@Controller("me")
export class NotificationPreferencesController {
  constructor(private readonly prefs: NotificationPreferencesService) {}

  @Get("notification-preferences")
  async get(@CurrentUser() user: AuthUser): Promise<{ data: NotificationPreferences }> {
    const data = await this.prefs.get(user.id);
    return { data };
  }

  @Patch("notification-preferences")
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(NotificationPreferencesSchema)) body: NotificationPreferences,
  ): Promise<void> {
    await this.prefs.update(user.id, body);
  }
}
