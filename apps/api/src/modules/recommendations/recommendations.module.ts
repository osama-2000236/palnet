import { Module } from "@nestjs/common";

import { EvidenceModule } from "../evidence/evidence.module";

import { RecommendationsController } from "./recommendations.controller";
import { RecommendationsService } from "./recommendations.service";

@Module({
  imports: [EvidenceModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}
