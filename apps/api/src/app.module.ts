import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";

import { AllExceptionsFilter } from "./common/exception.filter";
import { loadEnv } from "./config/env";
import { AccountModule } from "./modules/account/account.module";
import { AdminInternalModule } from "./modules/admin/admin-internal.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BillingModule } from "./modules/billing/billing.module";
import { BookmarksModule } from "./modules/bookmarks/bookmarks.module";
import { CommentsModule } from "./modules/comments/comments.module";
import { CompaniesModule } from "./modules/companies/companies.module";
import { ConnectionsModule } from "./modules/connections/connections.module";
import { FeedModule } from "./modules/feed/feed.module";
import { HealthModule } from "./modules/health/health.module";
import { JobsModule } from "./modules/jobs/jobs.module";
import { KaramaModule } from "./modules/karama/karama.module";
import { MediaModule } from "./modules/media/media.module";
import { MessagingModule } from "./modules/messaging/messaging.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PostsModule } from "./modules/posts/posts.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { ProfilesModule } from "./modules/profiles/profiles.module";
import { RateLimitModule } from "./modules/rate-limit/rate-limit.module";
import { RedisThrottlerStorage } from "./modules/rate-limit/redis-throttler.storage";
import { RatingsModule } from "./modules/ratings/ratings.module";
import { ReactionsModule } from "./modules/reactions/reactions.module";
import { RedisClients } from "./modules/redis/redis.clients";
import { RedisModule } from "./modules/redis/redis.module";
import { RepostsModule } from "./modules/reposts/reposts.module";
import { SafetyModule } from "./modules/safety/safety.module";
import { SearchModule } from "./modules/search/search.module";

const env = loadEnv();
const defaultThrottleLimit =
  env.NODE_ENV === "production" ? 100 : (env.BAYDAR_DEV_RATE_LIMIT ?? 1_000);

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => env] }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.NODE_ENV === "production" ? "info" : "debug",
        transport:
          env.NODE_ENV === "production"
            ? undefined
            : { target: "pino-pretty", options: { singleLine: true } },
        customProps: (req) => ({
          requestId: (req.headers["x-request-id"] as string | undefined) ?? undefined,
        }),
      },
    }),
    // With REDIS_URL set, auth-route limits are exact across instances via
    // RedisThrottlerStorage; unset falls back to the bundled per-instance store.
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisClients],
      useFactory: (redis: RedisClients) => ({
        throttlers: [{ name: "default", ttl: 60_000, limit: defaultThrottleLimit }],
        ...(redis.pub ? { storage: new RedisThrottlerStorage(redis.pub) } : {}),
      }),
    }),
    PrismaModule,
    RedisModule,
    RateLimitModule,
    HealthModule,
    AuthModule,
    BookmarksModule,
    ProfilesModule,
    PostsModule,
    FeedModule,
    ReactionsModule,
    CommentsModule,
    RepostsModule,
    ConnectionsModule,
    SafetyModule,
    SearchModule,
    MediaModule,
    MessagingModule,
    NotificationsModule,
    JobsModule,
    BillingModule,
    CompaniesModule,
    KaramaModule,
    RatingsModule,
    AccountModule,
    AdminInternalModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
