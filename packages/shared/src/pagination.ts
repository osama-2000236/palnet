import { z } from "zod";

// Cursor-based pagination. Offset pagination is banned by project-spec.md.

export const CursorPageQuery = z.object({
  after: z.string().cuid().nullish(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type CursorPageQuery = z.infer<typeof CursorPageQuery>;

export const CursorPageMeta = z.object({
  nextCursor: z.string().cuid().nullable(),
  hasMore: z.boolean(),
  limit: z.number().int().min(1).max(50),
});
export type CursorPageMeta = z.infer<typeof CursorPageMeta>;

export const cursorPage = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    meta: CursorPageMeta,
  });

/**
 * Trim a `limit + 1` overfetch into the page rows + CursorPageMeta.
 * Cursor is the last kept row's `id` — the convention every list endpoint uses.
 */
export function takePage<T extends { id: string }>(
  rows: T[],
  limit: number,
): { rows: T[]; meta: CursorPageMeta } {
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    rows: page,
    meta: {
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
      hasMore,
      limit,
    },
  };
}
