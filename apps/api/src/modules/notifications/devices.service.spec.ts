import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";

import { DevicesService } from "./devices.service";

describe("DevicesService", () => {
  let service: DevicesService;
  let prisma: {
    pushToken: {
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      pushToken: {
        upsert: jest.fn(),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [DevicesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(DevicesService);
  });

  it("upserts the caller's Expo token", async () => {
    prisma.pushToken.upsert.mockResolvedValue({
      token: "ExponentPushToken[test-token]",
      platform: "ios",
    });

    const out = await service.register("u_1", {
      token: "ExponentPushToken[test-token]",
      platform: "ios",
    });

    expect(out).toEqual({ token: "ExponentPushToken[test-token]", platform: "ios" });
    expect(prisma.pushToken.upsert).toHaveBeenCalledWith({
      where: {
        userId_deviceId: {
          userId: "u_1",
          deviceId: "ExponentPushToken[test-token]",
        },
      },
      update: {
        platform: "ios",
        token: "ExponentPushToken[test-token]",
        lastSeenAt: expect.any(Date),
      },
      create: {
        userId: "u_1",
        deviceId: "ExponentPushToken[test-token]",
        platform: "ios",
        token: "ExponentPushToken[test-token]",
      },
      select: { token: true, platform: true },
    });
  });
});
