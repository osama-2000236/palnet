import {
  BookmarkListQuery,
  type Bookmark as BookmarkDto,
  type CursorPageMeta,
  CreateBookmarkBody,
} from "@baydar/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { RequireCompleteProfile } from "../../common/require-complete-profile.decorator";
import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";

import { BookmarksService } from "./bookmarks.service";

@ApiTags("bookmarks")
@ApiBearerAuth()
@RequireCompleteProfile()
@Controller("bookmarks")
export class BookmarksController {
  constructor(private readonly bookmarks: BookmarksService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(BookmarkListQuery)) query: BookmarkListQuery,
  ): Promise<{ data: BookmarkDto[]; meta: CursorPageMeta }> {
    return this.bookmarks.list(user.id, {
      after: query.after ?? null,
      limit: query.limit,
      type: query.type ?? null,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateBookmarkBody)) body: CreateBookmarkBody,
  ): Promise<{ data: BookmarkDto }> {
    const data = await this.bookmarks.create(user.id, body);
    return { data };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<void> {
    await this.bookmarks.remove(user.id, id);
  }
}
