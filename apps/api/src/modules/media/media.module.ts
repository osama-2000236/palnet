import { Module } from "@nestjs/common";

import { MediaController } from "./media.controller";
import { MediaScanService } from "./media-scan.service";
import { MediaService } from "./media.service";

@Module({
  controllers: [MediaController],
  providers: [MediaService, MediaScanService],
  exports: [MediaService, MediaScanService],
})
export class MediaModule {}
