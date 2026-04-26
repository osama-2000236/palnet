import {
  type Comment as CommentDto,
  CreateCommentBody,
  CursorPageQuery,
  type CursorPageMeta,
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
  UsePipes,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";

import { CommentsService } from "./comments.service";

@ApiTags("comments")
@ApiBearerAuth()
@Controller()
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Post("posts/:id/comments")
  @UsePipes(new ZodValidationPipe(CreateCommentBody))
  async create(
    @CurrentUser() user: AuthUser,
    @Param("id") postId: string,
    @Body() body: CreateCommentBody,
  ): Promise<{ data: CommentDto }> {
    const data = await this.comments.create(user.id, postId, body);
    return { data };
  }

  @Get("posts/:id/comments")
  async list(
    @Param("id") postId: string,
    @Query(new ZodValidationPipe(CursorPageQuery))
    query: CursorPageQuery,
  ): Promise<{ data: CommentDto[]; meta: CursorPageMeta }> {
    return this.comments.list(postId, query.after ?? null, query.limit);
  }

  @Delete("comments/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser() user: AuthUser, @Param("id") commentId: string): Promise<void> {
    await this.comments.delete(user.id, commentId);
  }
}
