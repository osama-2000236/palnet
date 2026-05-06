import { Module } from "@nestjs/common";

import { SafetyModule } from "../safety/safety.module";

import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({
  imports: [SafetyModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
