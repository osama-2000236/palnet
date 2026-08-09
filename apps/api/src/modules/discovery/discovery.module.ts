import { Module } from "@nestjs/common";

import { GraphModule } from "../graph/graph.module";
import { SafetyModule } from "../safety/safety.module";

import { DiscoveryController } from "./discovery.controller";
import { DiscoveryService } from "./discovery.service";
import { SecondDegreeService } from "./second-degree.service";

@Module({
  imports: [SafetyModule, GraphModule],
  controllers: [DiscoveryController],
  providers: [DiscoveryService, SecondDegreeService],
  exports: [DiscoveryService, SecondDegreeService],
})
export class DiscoveryModule {}
