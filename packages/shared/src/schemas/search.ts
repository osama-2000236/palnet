import { z } from "zod";

import { JobLocationMode, JobType } from "../enums";

// GET /search/people?q=<term>&limit=20&after=<cursor>
export const PeopleSearchQuery = z.object({
  q: z.string().trim().min(1).max(80),
  after: z.string().cuid().nullish(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type PeopleSearchQuery = z.infer<typeof PeopleSearchQuery>;

// GET /search/posts?q=<term>&limit=20&after=<cursor>
export const PostsSearchQuery = z.object({
  q: z.string().trim().min(1).max(80),
  after: z.string().cuid().nullish(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type PostsSearchQuery = z.infer<typeof PostsSearchQuery>;

// GET /search/jobs?q=<term>&limit=20&after=<cursor>
export const JobsSearchQuery = z.object({
  q: z.string().trim().min(1).max(80),
  after: z.string().cuid().nullish(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type JobsSearchQuery = z.infer<typeof JobsSearchQuery>;

// GET /search/companies?q=<term>&limit=20&after=<cursor>
export const CompaniesSearchQuery = z.object({
  q: z.string().trim().min(1).max(80),
  after: z.string().cuid().nullish(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type CompaniesSearchQuery = z.infer<typeof CompaniesSearchQuery>;

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

export const SearchPostHit = z.object({
  id: z.string().cuid(),
  authorId: z.string().cuid(),
  authorHandle: z.string(),
  authorDisplayName: z.string(),
  authorAvatarUrl: z.string().url().nullable(),
  bodyExcerpt: z.string(),
  matchStart: z.number().int().min(0).nullable(),
  matchEnd: z.number().int().min(0).nullable(),
  createdAt: z.string().datetime(),
});
export type SearchPostHit = z.infer<typeof SearchPostHit>;

export const SearchCompanyHit = z.object({
  id: z.string().cuid(),
  slug: z.string(),
  name: z.string(),
  tagline: z.string().nullable(),
  industry: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string(),
  logoUrl: z.string().url().nullable(),
  verified: z.boolean(),
  activeJobs: z.number().int().nonnegative(),
});
export type SearchCompanyHit = z.infer<typeof SearchCompanyHit>;

export const SearchJobHit = z.object({
  id: z.string().cuid(),
  title: z.string(),
  companyName: z.string(),
  companyLogoUrl: z.string().url().nullable(),
  locationMode: z.nativeEnum(JobLocationMode),
  city: z.string().nullable(),
  country: z.string(),
  type: z.nativeEnum(JobType),
  createdAt: z.string().datetime(),
});
export type SearchJobHit = z.infer<typeof SearchJobHit>;
