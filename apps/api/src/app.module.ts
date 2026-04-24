import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";

import { AllExceptionsFilter } from "./common/exception.filter";
import { loadEnv } from "./config/env";
import { createThrottlerOptions } from "./config/throttler";
import { AccountModule } from "./modules/account/account.module";
import { AdminModule } from "./modules/admin/admin.module";
import { ApplicationsModule } from "./modules/applications/applications.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CommentsModule } from "./modules/comments/comments.module";
import { CompaniesModule } from "./modules/companies/companies.module";
import { ConnectionsModule } from "./modules/connections/connections.module";
import { FeedModule } from "./modules/feed/feed.module";
import { HealthModule } from "./modules/health/health.module";
import { JobsModule } from "./modules/jobs/jobs.module";
import { MediaModule } from "./modules/media/media.module";
import { MessagingModule } from "./modules/messaging/messaging.module";
import { ModerationModule } from "./modules/moderation/moderation.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PostsModule } from "./modules/posts/posts.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { ProfilesModule } from "./modules/profiles/profiles.module";
import { ReactionsModule } from "./modules/reactions/reactions.module";
import { RepostsModule } from "./modules/reposts/reposts.module";
import { SearchModule } from "./modules/search/search.module";

const env = loadEnv();

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
    ThrottlerModule.forRoot(createThrottlerOptions(env)),
    PrismaModule,
    HealthModule,
    AuthModule,
    AccountModule,
    CompaniesModule,
    ApplicationsModule,
    ProfilesModule,
    PostsModule,
    FeedModule,
    ReactionsModule,
    CommentsModule,
    RepostsModule,
    ConnectionsModule,
    SearchModule,
    MediaModule,
    MessagingModule,
    ModerationModule,
    NotificationsModule,
    JobsModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
