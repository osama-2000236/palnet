import { type RegisterDeviceTokenBody } from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

export interface RegisteredDeviceToken {
  token: string;
  platform: RegisterDeviceTokenBody["platform"];
}

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async register(userId: string, body: RegisterDeviceTokenBody): Promise<RegisteredDeviceToken> {
    const row = await this.prisma.deviceToken.upsert({
      where: { token: body.token },
      update: {
        userId,
        platform: body.platform,
      },
      create: {
        userId,
        platform: body.platform,
        token: body.token,
      },
      select: {
        token: true,
        platform: true,
      },
    });

    return row;
  }
}
