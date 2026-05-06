import { Module } from "@nestjs/common";

import { SafetyModule } from "../safety/safety.module";

import { PostsController } from "./posts.controller";
import { PostsService } from "./posts.service";

@Module({
  imports: [SafetyModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
