import { z } from "zod";

// Cursor-based pagination. Offset pagination is banned by project-spec.md.

export const CursorPageQuery = z.object({
  after: z.string().min(1).max(512).nullish(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type CursorPageQuery = z.infer<typeof CursorPageQuery>;

export const CursorPageMeta = z.object({
  nextCursor: z.string().min(1).max(512).nullable(),
  hasMore: z.boolean(),
  limit: z.number().int().min(1).max(50),
});
export type CursorPageMeta = z.infer<typeof CursorPageMeta>;

export const cursorPage = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    meta: CursorPageMeta,
  });
