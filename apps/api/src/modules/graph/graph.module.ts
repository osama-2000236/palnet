import { Module } from "@nestjs/common";

import { GraphController } from "./graph.controller";
import { GraphService } from "./graph.service";

@Module({
  controllers: [GraphController],
  providers: [GraphService],
  // The feed reads mutes, messaging reads restrictions, and discovery reads
  // degrees — all of them through this rather than through their own copy.
  exports: [GraphService],
})
export class GraphModule {}
