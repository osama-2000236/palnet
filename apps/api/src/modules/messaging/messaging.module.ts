import { Module } from "@nestjs/common";

import { SafetyModule } from "../safety/safety.module";

import { MessagingBus } from "./messaging.bus";
import { MessagingController } from "./messaging.controller";
import { MessagingService } from "./messaging.service";

@Module({
  imports: [SafetyModule],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingBus],
  exports: [MessagingService, MessagingBus],
})
export class MessagingModule {}
