import { Module } from "@nestjs/common";

import { SafetyModule } from "../safety/safety.module";

import { FeedController } from "./feed.controller";
import { FeedService } from "./feed.service";

@Module({
  imports: [SafetyModule],
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}
