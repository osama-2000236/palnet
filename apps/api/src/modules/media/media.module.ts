import { Module } from "@nestjs/common";

import { MediaMultipartService } from "./media-multipart.service";
import { MediaScanService } from "./media-scan.service";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";

@Module({
  controllers: [MediaController],
  providers: [MediaService, MediaMultipartService, MediaScanService],
  exports: [MediaService, MediaMultipartService, MediaScanService],
})
export class MediaModule {}
