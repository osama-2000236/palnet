import { Module } from "@nestjs/common";

import { JobAlertsService } from "./job-alerts.service";
import { JobsController } from "./jobs.controller";
import { JobsService } from "./jobs.service";

@Module({
  controllers: [JobsController],
  providers: [JobsService, JobAlertsService],
  // JobAlertsService is exported so job creation (companies module) can fan
  // out alert notifications.
  exports: [JobAlertsService],
})
export class JobsModule {}
