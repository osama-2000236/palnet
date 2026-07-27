import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AccountRetentionService } from "../modules/account/account-retention.service";
import { AdminInternalController } from "../modules/admin/admin-internal.controller";
import { BillingService } from "../modules/billing/billing.service";
import { KaramaService } from "../modules/karama/karama.service";
import { MediaScanService } from "../modules/media/media-scan.service";

// `admin/internal` carries `@Public()`, so the global JWT guard lets every
// request through by design — cron and CI call these with a shared token, not a
// user session. `InternalTokenGuard` is the *only* thing between the internet
// and four destructive automation endpoints: run account retention, run karama
// decay, act on any invoice, rescan media.
//
// It had no test. Deleting `@UseGuards(InternalTokenGuard)` and its import left
// eslint clean and all 331 API tests passing, which is how a security boundary
// disappears in a refactor nobody reviews closely.
//
// So these go through HTTP against the real guard rather than calling
// `canActivate` on a hand-built context: the question is not "does the guard
// work" but "is the guard reached", and only the request answers that.

const TOKEN = "c".repeat(24);

async function createApp(token: string | undefined): Promise<INestApplication> {
  const noop = {};
  const moduleRef = await Test.createTestingModule({
    controllers: [AdminInternalController],
    providers: [
      { provide: ConfigService, useValue: { get: (): string | undefined => token } },
      { provide: AccountRetentionService, useValue: { runRetention: jest.fn() } },
      { provide: KaramaService, useValue: { runMonthlyDecay: jest.fn() } },
      { provide: BillingService, useValue: noop },
      { provide: MediaScanService, useValue: noop },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe("InternalTokenGuard on admin/internal", () => {
  let app: INestApplication;

  afterEach(async () => {
    await app?.close();
  });

  it("rejects a request with no token", async () => {
    app = await createApp(TOKEN);
    await request(app.getHttpServer())
      .post("/admin/internal/account-retention/run")
      .send({ dryRun: true })
      .expect(401);
  });

  it("rejects a wrong token of the same length", async () => {
    app = await createApp(TOKEN);
    await request(app.getHttpServer())
      .post("/admin/internal/account-retention/run")
      .set("x-internal-token", "d".repeat(24))
      .send({ dryRun: true })
      .expect(401);
  });

  // A prefix of the real token has a different length. `timingSafeEqual` throws
  // on mismatched lengths instead of returning false, so the length check in
  // front of it is load-bearing: without it this is a 500, not a 401.
  it("rejects a truncated token without throwing", async () => {
    app = await createApp(TOKEN);
    await request(app.getHttpServer())
      .post("/admin/internal/account-retention/run")
      .set("x-internal-token", "c".repeat(12))
      .send({ dryRun: true })
      .expect(401);
  });

  it("rejects everything when the token is not configured", async () => {
    app = await createApp(undefined);
    await request(app.getHttpServer())
      .post("/admin/internal/account-retention/run")
      .set("x-internal-token", TOKEN)
      .send({ dryRun: true })
      .expect(401);
  });

  it("admits the configured token", async () => {
    app = await createApp(TOKEN);
    await request(app.getHttpServer())
      .post("/admin/internal/account-retention/run")
      .set("x-internal-token", TOKEN)
      .send({ dryRun: true })
      .expect(200);
  });

  // Every route on the controller, not just the one above: `@UseGuards` sits on
  // the class, and moving it to a single method would still pass a one-route
  // check while opening the other three.
  it.each([
    ["/admin/internal/account-retention/run", { dryRun: true }],
    ["/admin/internal/karama-decay/run", { dryRun: true }],
    ["/admin/internal/billing/invoices/inv-1/action", { action: "MARK_PAID" }],
    ["/admin/internal/media/scan", { mediaId: "m_1" }],
  ])("guards %s", async (path, body) => {
    app = await createApp(TOKEN);
    await request(app.getHttpServer()).post(path).send(body).expect(401);
  });
});
