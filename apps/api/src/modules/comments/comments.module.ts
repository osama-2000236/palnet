import { Module } from "@nestjs/common";

import { SafetyModule } from "../safety/safety.module";

import { CommentsController } from "./comments.controller";
import { CommentsService } from "./comments.service";

@Module({
  imports: [SafetyModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
