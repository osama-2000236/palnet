import { Module } from "@nestjs/common";

import { ModerationModule } from "../moderation/moderation.module";

import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({
  imports: [ModerationModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
