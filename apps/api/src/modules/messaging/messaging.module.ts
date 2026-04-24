import { Module } from "@nestjs/common";

import { ModerationModule } from "../moderation/moderation.module";

import { MessagingBus } from "./messaging.bus";
import { MessagingController } from "./messaging.controller";
import { MessagingService } from "./messaging.service";

@Module({
  imports: [ModerationModule],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingBus],
  exports: [MessagingService, MessagingBus],
})
export class MessagingModule {}
