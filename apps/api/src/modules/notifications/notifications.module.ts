import { Global, Module } from "@nestjs/common";

import { RedisModule } from "../redis/redis.module";
import { SafetyModule } from "../safety/safety.module";

import { DevicesController } from "./devices.controller";
import { DevicesService } from "./devices.service";
import { NotificationsBus } from "./notifications.bus";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationPreferencesController } from "./preferences.controller";
import { NotificationPreferencesService } from "./preferences.service";
import { PushService } from "./push.service";

// Global so domain modules (reactions, comments, connections, messaging) can
// inject NotificationsService without importing this module.
@Global()
@Module({
  imports: [SafetyModule, RedisModule],
  controllers: [NotificationsController, DevicesController, NotificationPreferencesController],
  providers: [
    NotificationsService,
    NotificationsBus,
    DevicesService,
    PushService,
    NotificationPreferencesService,
  ],
  exports: [NotificationsService, NotificationsBus, PushService, NotificationPreferencesService],
})
export class NotificationsModule {}
