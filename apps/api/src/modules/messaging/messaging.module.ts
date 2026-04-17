import { Module } from "@nestjs/common";

import { MessagingBus } from "./messaging.bus";
import { MessagingController } from "./messaging.controller";
import { MessagingService } from "./messaging.service";

@Module({
  controllers: [MessagingController],
  providers: [MessagingService, MessagingBus],
  exports: [MessagingService, MessagingBus],
})
export class MessagingModule {}
