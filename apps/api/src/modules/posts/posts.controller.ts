import { CreatePostBody, type Post as PostDto, UpdatePostBody } from "@baydar/shared";
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
  UsePipes,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";

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
  @UsePipes(new ZodValidationPipe(CreatePostBody))
  @ApiOkResponse({ description: "Create a post." })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() body: CreatePostBody,
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
  @UsePipes(new ZodValidationPipe(UpdatePostBody))
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: UpdatePostBody,
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
