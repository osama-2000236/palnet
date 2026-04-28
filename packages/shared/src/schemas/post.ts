import { z } from "zod";
import { MediaKind } from "../enums";

export const MediaRef = z.object({
  id: z.string().cuid().optional(),
  url: z.string().url(),
  kind: z.nativeEnum(MediaKind),
  mimeType: z.string().min(1).max(120),
  width: z.number().int().positive().nullish(),
  height: z.number().int().positive().nullish(),
  durationMs: z.number().int().positive().nullish(),
  sizeBytes: z.number().int().positive().nullish(),
  blurhash: z.string().min(6).nullish(),
});
export type MediaRef = z.infer<typeof MediaRef>;

export const CreatePostBody = z.object({
  body: z.string().min(1).max(3000),
  language: z.string().min(2).max(10).default("ar"),
  media: z.array(MediaRef).max(8).default([]),
});
export type CreatePostBody = z.infer<typeof CreatePostBody>;

export const UpdatePostBody = z.object({
  body: z.string().min(1).max(3000),
});
export type UpdatePostBody = z.infer<typeof UpdatePostBody>;

export const Post = z.object({
  id: z.string().cuid(),
  authorId: z.string().cuid(),
  body: z.string(),
  language: z.string(),
  media: z.array(MediaRef).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  counts: z.object({
    reactions: z.number().int().nonnegative(),
    comments: z.number().int().nonnegative(),
    reposts: z.number().int().nonnegative(),
  }),
  viewer: z.object({
    reaction: z.string().nullable(),
    reposted: z.boolean(),
  }),
  author: z.object({
    id: z.string().cuid(),
    handle: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    headline: z.string().nullable(),
    avatarUrl: z.string().url().nullable(),
  }),
});
export type Post = z.infer<typeof Post>;
