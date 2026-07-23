import { z } from "zod";

import { BookmarkType, JobLocationMode, JobType } from "../enums";
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
  /** Job-only: enums the client localizes. Null for post bookmarks. */
  jobMeta: z
    .object({
      city: z.string().nullable(),
      locationMode: z.nativeEnum(JobLocationMode),
      type: z.nativeEnum(JobType),
    })
    .nullable(),
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
