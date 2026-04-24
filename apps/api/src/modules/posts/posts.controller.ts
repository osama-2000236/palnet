import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CreatePostBody, type Post as PostDto, UpdatePostBody } from "@palnet/shared";

import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";

import { PostsService } from "./posts.service";

@ApiTags("posts")
@ApiBearerAuth()
@Controller("posts")
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  // Post creation is user-driven but spammable; 20/min keeps humans happy
  // and flags bursty scripts. The global guard still enforces 100/60s
  // across the account.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOkResponse({ description: "Create a post." })
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreatePostBody))
    body: CreatePostBody,
  ): Promise<{ data: PostDto }> {
    const data = await this.posts.create(user.id, body);
    return { data };
  }

  @Get(":id")
  async get(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<{ data: PostDto }> {
    const data = await this.posts.getById(user.id, id);
    return { data };
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdatePostBody))
    body: UpdatePostBody,
  ): Promise<{ data: PostDto }> {
    const data = await this.posts.update(user.id, id, body);
    return { data };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<void> {
    await this.posts.delete(user.id, id);
  }
}
