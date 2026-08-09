import { Controller, Get, Header, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
import { RateLimit } from "../rate-limit/rate-limit.decorator";

import { CvService } from "./cv.service";

@ApiTags("cv")
@ApiBearerAuth()
@Controller("cv")
export class CvController {
  constructor(private readonly cv: CvService) {}

  /**
   * The CV document, print-sized and self-contained.
   *
   * Returns HTML rather than PDF bytes on purpose — the platform renderer is
   * what shapes Arabic correctly, and it is fed exactly this. GAP-09 records
   * what a server-side PDF would have cost.
   *
   * Always private, never cached: this is the most complete document about one
   * person that Baydar holds.
   */
  @Get(":handle")
  @RateLimit("cvRender")
  @Header("Content-Type", "text/html; charset=utf-8")
  @Header("Cache-Control", "private, no-store")
  @Header("X-Content-Type-Options", "nosniff")
  async render(
    @CurrentUser() user: AuthUser,
    @Param("handle") handle: string,
    @Query("locale") locale?: string,
  ): Promise<string> {
    return this.cv.render(handle, user.id, locale ?? "ar");
  }
}
