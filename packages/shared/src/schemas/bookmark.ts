import { z } from "zod";

import { BookmarkType } from "../enums";
import { CursorPageQuery } from "../pagination";

export const Bookmark = z.object({
  id: z.string().cuid(),
  type: z.nativeEnum(BookmarkType),
  targetId: z.string().cuid(),
  title: z.string(),
  subtitle: z.string().nullable(),
  description: z.string().nullable(),
  href: z.string(),
  imageUrl: z.string().url().nullable(),
  savedAt: z.string().datetime(),
});
export type Bookmark = z.infer<typeof Bookmark>;

export const BookmarkListQuery = CursorPageQuery.extend({
  type: z.nativeEnum(BookmarkType).optional(),
});
export type BookmarkListQuery = z.infer<typeof BookmarkListQuery>;

export const CreateBookmarkBody = z.object({
  type: z.nativeEnum(BookmarkType),
  targetId: z.string().cuid(),
});
export type CreateBookmarkBody = z.infer<typeof CreateBookmarkBody>;

export const BookmarkState = z.object({
  bookmarked: z.boolean(),
  bookmarkId: z.string().cuid().nullable(),
});
export type BookmarkState = z.infer<typeof BookmarkState>;
