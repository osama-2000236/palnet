import { Module } from "@nestjs/common";

import { AdminModule } from "../admin/admin.module";

import { ModerationController } from "./moderation.controller";
import { ModerationService } from "./moderation.service";

@Module({
  imports: [AdminModule],
  controllers: [ModerationController],
  providers: [ModerationService],
  // Exported so FeedModule/SearchModule/MessagingModule can reuse
  // `blockedIds(viewerId)` without duplicating the query.
  exports: [ModerationService],
})
export class ModerationModule {}
