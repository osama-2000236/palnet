import { Module } from "@nestjs/common";

import { MediaScanService } from "./media-scan.service";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";

@Module({
  controllers: [MediaController],
  providers: [MediaService, MediaScanService],
  exports: [MediaService, MediaScanService],
})
export class MediaModule {}
