import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { MailModule } from "../mail/mail.module";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { SuspensionGuard } from "./guards/suspension.guard";

@Module({
  imports: [MailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Register JwtAuthGuard as a global guard; @Public() opts routes out.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // SuspensionGuard runs after JwtAuthGuard and blocks mutating calls
    // from suspended accounts. @AllowSuspended() on the handler opts out.
    { provide: APP_GUARD, useClass: SuspensionGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
