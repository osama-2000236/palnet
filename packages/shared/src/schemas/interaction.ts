import { z } from "zod";

import { ReactionType } from "../enums";

export const SetReactionBody = z.object({
  type: z.nativeEnum(ReactionType),
});
export type SetReactionBody = z.infer<typeof SetReactionBody>;

export const CreateCommentBody = z.object({
  body: z.string().min(1).max(2000),
  parentId: z.string().cuid().optional(),
});
export type CreateCommentBody = z.infer<typeof CreateCommentBody>;

const CommentFields = z.object({
  id: z.string().cuid(),
  postId: z.string().cuid(),
  parentId: z.string().cuid().nullable(),
  body: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  author: z.object({
    id: z.string().cuid(),
    handle: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    avatarUrl: z.string().url().nullable(),
  }),
});
export const Comment = CommentFields.extend({
  /**
   * Set on the comments list only: the live replies, oldest first. Threads are
   * one level deep — a reply to a reply joins its root comment's thread.
   */
  replies: z.array(CommentFields).optional(),
});
export type Comment = z.infer<typeof Comment>;

export const CreateRepostBody = z.object({
  comment: z.string().max(1000).optional(),
});
export type CreateRepostBody = z.infer<typeof CreateRepostBody>;
