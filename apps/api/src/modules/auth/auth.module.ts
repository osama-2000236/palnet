import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { ProfileCompletionGuard } from "../../common/profile-completion.guard";
import { MailModule } from "../mail/mail.module";
import { PrismaModule } from "../prisma/prisma.module";

import { AuthEmailThrottleService } from "./auth-email-throttle.service";
import { AuthTokensService } from "./auth-tokens.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Global()
@Module({
  imports: [PrismaModule, MailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokensService,
    AuthEmailThrottleService,
    JwtAuthGuard,
    // Register JwtAuthGuard as a global guard; @Public() opts routes out.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ProfileCompletionGuard },
  ],
  exports: [AuthService, AuthTokensService, JwtAuthGuard],
})
export class AuthModule {}
