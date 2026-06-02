import { z } from "zod";

export const BookmarkType = {
  POST: "post",
  JOB: "job",
  PROFILE: "profile",
} as const;
export type BookmarkType = (typeof BookmarkType)[keyof typeof BookmarkType];

export const Bookmark = z.object({
  id: z.string().cuid(),
  type: z.nativeEnum(BookmarkType),
  title: z.string(),
  description: z.string().optional(),
  url: z.string(),
  // For posts and jobs, we might have an avatar (e.g., author or company)
  avatarUrl: z.string().url().optional(),
  // For profiles, we might have a handle
  handle: z.string().optional(),
  // Timestamp when saved
  savedAt: z.string().datetime(),
});
export type Bookmark = z.infer<typeof Bookmark>;

export const CreateBookmarkBody = z.object({
  type: z.nativeEnum(BookmarkType),
  title: z.string(),
  description: z.string().optional(),
  url: z.string(),
  avatarUrl: z.string().url().optional(),
  handle: z.string().optional(),
});
export type CreateBookmarkBody = z.infer<typeof CreateBookmarkBody>;

export const RemoveBookmarkBody = z.object({
  id: z.string().cuid(),
});
export type RemoveBookmarkBody = z.infer<typeof RemoveBookmarkBody>;
