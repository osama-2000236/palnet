import { Module } from "@nestjs/common";

import { RepostsController } from "./reposts.controller";
import { RepostsService } from "./reposts.service";

@Module({
  controllers: [RepostsController],
  providers: [RepostsService],
})
export class RepostsModule {}
