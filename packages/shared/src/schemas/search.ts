import { z } from "zod";

// GET /search/people?q=<term>&limit=20&after=<cursor>
export const PeopleSearchQuery = z.object({
  q: z.string().trim().min(1).max(80),
  after: z.string().cuid().nullish(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type PeopleSearchQuery = z.infer<typeof PeopleSearchQuery>;

export const SearchPersonHit = z.object({
  userId: z.string().cuid(),
  handle: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  headline: z.string().nullable(),
  location: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
});
export type SearchPersonHit = z.infer<typeof SearchPersonHit>;
