import { ErrorCode, MediaKind } from "@baydar/shared";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { NextFunction, Request, Response } from "express";
import request from "supertest";

import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { RateLimitModule } from "../rate-limit/rate-limit.module";

import { MediaScanService } from "./media-scan.service";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";

describe("MediaController rate limits", () => {
  it("returns RATE_LIMITED after 30 presign requests per user per hour", async () => {
    const presigned = {
      uploadUrl: "https://signed.example/put",
      publicUrl: "https://cdn.example/post_media/user-1/file.png",
      key: "post_media/user-1/file.png",
      headers: { "Content-Type": "image/png" },
      expiresAt: "2026-05-06T12:00:00.000Z",
      blurhash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
    };
    const media = { presign: jest.fn().mockResolvedValue(presigned) };
    const moduleRef = await Test.createTestingModule({
      imports: [RateLimitModule],
      controllers: [MediaController],
      providers: [
        { provide: MediaService, useValue: media },
        {
          provide: MediaScanService,
          useValue: { scanObject: jest.fn() },
        },
      ],
    }).compile();
    const app: INestApplication = moduleRef.createNestApplication();
    app.use((req: Request & { user?: AuthUser }, _res: Response, next: NextFunction) => {
      req.user = { id: "user-1", email: "demo@baydar.ps", role: "USER", locale: "ar-PS" };
      next();
    });
    await app.init();

    const body = {
      purpose: "POST_MEDIA",
      kind: MediaKind.IMAGE,
      mimeType: "image/png",
      sizeBytes: 1024,
    };

    try {
      for (let i = 0; i < 30; i += 1) {
        await request(app.getHttpServer()).post("/media/presign").send(body).expect(201);
      }

      await request(app.getHttpServer())
        .post("/media/presign")
        .send(body)
        .expect(429)
        .expect((res) => {
          expect(res.body.error.code).toBe(ErrorCode.RATE_LIMITED);
        });
    } finally {
      await app.close();
    }
  });
});
