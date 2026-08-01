import { Controller, Get, INestApplication } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { Throttle, ThrottlerModule } from "@nestjs/throttler";
import * as jwt from "jsonwebtoken";
import request from "supertest";

import { BaydarThrottlerGuard } from "./rate-limit.guard";

const LIMIT = 3;
const SECRET = "test-access-secret-at-least-32-chars-long";

@Controller("probe")
class ProbeController {
  @Get("route")
  @Throttle({ default: { limit: LIMIT, ttl: 60_000 } })
  route(): { ok: true } {
    return { ok: true };
  }
}

/** A real access token for `userId`, freshly signed — as after every refresh. */
function accessTokenFor(userId: string): string {
  return jwt.sign(
    { sub: userId, email: `${userId}@example.com`, role: "USER", locale: "ar" },
    SECRET,
    {
      algorithm: "HS256",
      expiresIn: 900,
    },
  );
}

async function bootstrap(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [() => ({ JWT_ACCESS_SECRET: SECRET })],
      }),
      ThrottlerModule.forRoot({
        throttlers: [{ name: "default", ttl: 60_000, limit: 100 }],
      }),
    ],
    controllers: [ProbeController],
    providers: [{ provide: APP_GUARD, useClass: BaydarThrottlerGuard }],
  }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe("BaydarThrottlerGuard tracker", () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootstrap();
  });

  afterEach(async () => {
    await app.close();
  });

  it("throttles an anonymous caller by IP", async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < LIMIT; i += 1) {
      await request(server).get("/probe/route").expect(200);
    }
    await request(server).get("/probe/route").expect(429);
  });

  // The bug: the tracker hashed the raw Authorization header, so a caller on an
  // unauthenticated route (/auth/login, /auth/register, /auth/refresh) minted a
  // fresh bucket per request just by varying a header nobody had verified —
  // an unlimited brute-force budget against the 10/min login limit.
  it("gives an unverifiable Authorization header no bucket of its own", async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < LIMIT; i += 1) {
      await request(server)
        .get("/probe/route")
        .set("Authorization", `Bearer junk-${i}`)
        .expect(200);
    }
    await request(server).get("/probe/route").set("Authorization", "Bearer junk-final").expect(429);
  });

  // A token signed with the wrong key, or with `alg: none`, is junk too — it
  // must not be able to claim another user's bucket or a private one.
  it("ignores a token signed with the wrong secret", async () => {
    const server = app.getHttpServer();
    const forged = jwt.sign({ sub: "victim" }, "not-the-access-secret", { algorithm: "HS256" });
    for (let i = 0; i < LIMIT; i += 1) {
      await request(server)
        .get("/probe/route")
        .set("Authorization", `Bearer ${forged}`)
        .expect(200);
    }
    // Same IP, no valid identity: it spent the anonymous budget, not "victim"'s.
    await request(server).get("/probe/route").expect(429);
  });

  it("keys an authenticated caller by user id, not by access token", async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < LIMIT; i += 1) {
      await request(server)
        .get("/probe/route")
        .set("Authorization", `Bearer ${accessTokenFor("u1")}`)
        .expect(200);
    }
    await request(server)
      .get("/probe/route")
      .set("Authorization", `Bearer ${accessTokenFor("u1")}`)
      .expect(429);
  });

  it("keeps separate budgets for separate users behind one IP", async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < LIMIT; i += 1) {
      await request(server)
        .get("/probe/route")
        .set("Authorization", `Bearer ${accessTokenFor("u1")}`)
        .expect(200);
    }
    await request(server)
      .get("/probe/route")
      .set("Authorization", `Bearer ${accessTokenFor("u2")}`)
      .expect(200);
  });

  it("does not let an expired token keep spending its old budget", async () => {
    const server = app.getHttpServer();
    const expired = jwt.sign({ sub: "u1" }, SECRET, { algorithm: "HS256", expiresIn: -10 });
    await request(server).get("/probe/route").set("Authorization", `Bearer ${expired}`).expect(200);
    // Fell through to the IP bucket, so the anonymous budget is now down one.
    for (let i = 1; i < LIMIT; i += 1) {
      await request(server).get("/probe/route").expect(200);
    }
    await request(server).get("/probe/route").expect(429);
  });
});
