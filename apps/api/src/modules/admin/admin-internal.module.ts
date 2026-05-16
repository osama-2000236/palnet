import { Module } from "@nestjs/common";

import { AccountRetentionService } from "../account/account-retention.service";
import { BillingModule } from "../billing/billing.module";
import { KaramaModule } from "../karama/karama.module";
import { MediaModule } from "../media/media.module";
import { PrismaModule } from "../prisma/prisma.module";

import { AdminBillingController } from "./admin-billing.controller";
import { AdminInternalController } from "./admin-internal.controller";
import { AdminModerationController } from "./admin-moderation.controller";
import { AdminModerationService } from "./admin-moderation.service";

@Module({
  imports: [PrismaModule, KaramaModule, BillingModule, MediaModule],
  controllers: [AdminInternalController, AdminModerationController, AdminBillingController],
  providers: [AccountRetentionService, AdminModerationService],
})
export class AdminInternalModule {}
