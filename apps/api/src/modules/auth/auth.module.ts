import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { ProfileCompletionGuard } from "../../common/profile-completion.guard";
import { PrismaModule } from "../prisma/prisma.module";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Register JwtAuthGuard as a global guard; @Public() opts routes out.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ProfileCompletionGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
