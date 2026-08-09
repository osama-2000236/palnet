import { Module } from "@nestjs/common";

import { FollowsController } from "./follows.controller";
import { FollowsService } from "./follows.service";

@Module({
  controllers: [FollowsController],
  providers: [FollowsService],
  // ConnectionsService accepts a connection by creating two follows, so it
  // needs this service rather than a second copy of the counter logic.
  exports: [FollowsService],
})
export class FollowsModule {}
