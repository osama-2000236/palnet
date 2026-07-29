import { z } from "zod";

import { MediaKind, ReactionType } from "../enums";

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
    // Per-type breakdown, e.g. `{ LIKE: 4, INSIGHTFUL: 1 }`. Only non-zero
    // types appear. `ReactionType` has had six members since the schema was
    // written and `PUT /posts/:id/reaction` has always accepted all six, but
    // the DTO exposed only a total, so no client could show which reactions a
    // post actually received. Defaulted so a cached or older payload still
    // parses.
    // Zod 4 makes an enum-keyed `record` exhaustive — every ReactionType would be
    // required. The API only sends reactions this post actually received, so the
    // partial form is the one that matches the wire shape.
    byReaction: z.partialRecord(z.enum(ReactionType), z.number().int().nonnegative()).default({}),
  }),
  viewer: z.object({
    reaction: z.string().nullable(),
    reposted: z.boolean(),
    bookmarkId: z.string().cuid().nullable(),
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
