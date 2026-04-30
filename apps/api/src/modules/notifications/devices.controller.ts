import { RegisterDeviceTokenBody } from "@baydar/shared";
import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";

import { DevicesService, type RegisteredDeviceToken } from "./devices.service";

@ApiTags("notifications")
@ApiBearerAuth()
@Controller("notifications/devices")
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: "Registered the caller's Expo push token." })
  async register(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(RegisterDeviceTokenBody)) body: RegisterDeviceTokenBody,
  ): Promise<{ data: RegisteredDeviceToken }> {
    const data = await this.devices.register(user.id, body);
    return { data };
  }
}
