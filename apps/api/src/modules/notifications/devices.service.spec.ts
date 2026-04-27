import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";

import { DevicesService } from "./devices.service";

describe("DevicesService", () => {
  let service: DevicesService;
  let prisma: {
    deviceToken: {
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      deviceToken: {
        upsert: jest.fn(),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [DevicesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(DevicesService);
  });

  it("upserts the caller's Expo token", async () => {
    prisma.deviceToken.upsert.mockResolvedValue({
      token: "ExponentPushToken[test-token]",
      platform: "ios",
    });

    const out = await service.register("u_1", {
      token: "ExponentPushToken[test-token]",
      platform: "ios",
    });

    expect(out).toEqual({ token: "ExponentPushToken[test-token]", platform: "ios" });
    expect(prisma.deviceToken.upsert).toHaveBeenCalledWith({
      where: { token: "ExponentPushToken[test-token]" },
      update: { userId: "u_1", platform: "ios" },
      create: {
        userId: "u_1",
        platform: "ios",
        token: "ExponentPushToken[test-token]",
      },
      select: { token: true, platform: true },
    });
  });
});
