import { Global, Module } from "@nestjs/common";

import { DevicesController } from "./devices.controller";
import { DevicesService } from "./devices.service";
import { NotificationsBus } from "./notifications.bus";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { PushService } from "./push.service";

// Global so domain modules (reactions, comments, connections, messaging) can
// inject NotificationsService without importing this module.
@Global()
@Module({
  controllers: [NotificationsController, DevicesController],
  providers: [NotificationsService, NotificationsBus, DevicesService, PushService],
  exports: [NotificationsService, NotificationsBus, PushService],
})
export class NotificationsModule {}
