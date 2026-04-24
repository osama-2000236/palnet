import { Global, Module } from "@nestjs/common";

import { MailModule } from "../mail/mail.module";

import { NotificationsBus } from "./notifications.bus";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

// Global so domain modules (reactions, comments, connections, messaging) can
// inject NotificationsService without importing this module.
@Global()
@Module({
  imports: [MailModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsBus],
  exports: [NotificationsService, NotificationsBus],
})
export class NotificationsModule {}
