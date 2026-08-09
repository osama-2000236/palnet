import { Module } from "@nestjs/common";

import { ProfileSectionsController } from "./profile-sections.controller";
import { ProfileSectionsService } from "./profile-sections.service";
import { ProfileViewsService } from "./profile-views.service";
import { ProfilesController } from "./profiles.controller";
import { ProfilesService } from "./profiles.service";

@Module({
  controllers: [ProfilesController, ProfileSectionsController],
  providers: [ProfilesService, ProfileSectionsService, ProfileViewsService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
