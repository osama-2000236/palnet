import { ErrorCode, MediaKind } from "@baydar/shared";
import type { INestApplication } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { ThrottlerModule } from "@nestjs/throttler";
import type { NextFunction, Request, Response } from "express";
import request from "supertest";

import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { BaydarThrottlerGuard } from "../rate-limit/rate-limit.guard";

import { MediaScanService } from "./media-scan.service";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";

describe("MediaController rate limits", () => {
  it("shares one 30/hour budget across both media handlers, per user", async () => {
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
      imports: [
        // The throttler guard reads JWT_ACCESS_SECRET to key a bucket on the
        // caller's user id rather than a header they choose. `app.module.ts`
        // makes ConfigModule global; an isolated test module has to say so.
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ JWT_ACCESS_SECRET: "test-access-secret-at-least-32-chars" })],
        }),
        ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 1_000 }]),
      ],
      controllers: [MediaController],
      providers: [
        { provide: MediaService, useValue: media },
        {
          provide: MediaScanService,
          useValue: { scanObject: jest.fn() },
        },
        { provide: APP_GUARD, useClass: BaydarThrottlerGuard },
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
      // 15 on each of the two `@RateLimit("media")` handlers. They share ONE
      // 30/hour budget, so the 31st request anywhere in the bucket is refused.
      // Throttler keys per handler by default — without the bucket branch in
      // BaydarThrottlerGuard.generateKey this caller would get 30 each and
      // every request below would pass.
      for (let i = 0; i < 15; i += 1) {
        await request(app.getHttpServer()).post("/media/presign").send(body).expect(201);
        await request(app.getHttpServer())
          .post("/media/confirm")
          .send({
            key: "post_media/user-1/file.png",
            publicUrl: "https://cdn.example/post_media/user-1/file.png",
            kind: MediaKind.IMAGE,
            mimeType: "image/png",
          })
          .expect(201);
      }

      await request(app.getHttpServer())
        .post("/media/presign")
        .send(body)
        .expect(429)
        .expect((res) => {
          expect(res.body.error.code).toBe(ErrorCode.RATE_LIMITED);
          expect(res.body.error.details.class).toBe("media");
        });
    } finally {
      await app.close();
    }
  });
});
