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
    const row = await this.prisma.pushToken.upsert({
      where: {
        userId_deviceId: {
          userId,
          deviceId: body.token,
        },
      },
      update: {
        platform: body.platform,
        token: body.token,
        lastSeenAt: new Date(),
      },
      create: {
        userId,
        deviceId: body.token,
        platform: body.platform,
        token: body.token,
      },
      select: {
        token: true,
        platform: true,
      },
    });

    return {
      token: row.token,
      platform: body.platform,
    };
  }
}
