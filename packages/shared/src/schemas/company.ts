import { z } from "zod";
import { CompanyMemberRole } from "../enums";

export const CompanySlug = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, { message: "INVALID_SLUG" });

export const CreateCompanyBody = z.object({
  slug: CompanySlug,
  name: z.string().min(1).max(120),
  tagline: z.string().max(220).optional(),
  about: z.string().max(8000).optional(),
  website: z.string().url().optional(),
  industry: z.string().max(120).optional(),
  sizeBucket: z.enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001+"]).optional(),
  logoUrl: z.string().url().optional(),
  coverUrl: z.string().url().optional(),
  country: z.string().length(2).default("PS"),
  city: z.string().max(120).optional(),
});
export type CreateCompanyBody = z.infer<typeof CreateCompanyBody>;

export const UpdateCompanyBody = CreateCompanyBody.partial().omit({ slug: true });
export type UpdateCompanyBody = z.infer<typeof UpdateCompanyBody>;

export const Company = CreateCompanyBody.extend({
  id: z.string().cuid(),
  verified: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Company = z.infer<typeof Company>;

export const AddCompanyMemberBody = z.object({
  userId: z.string().cuid(),
  role: z.nativeEnum(CompanyMemberRole).default("EDITOR"),
});
export type AddCompanyMemberBody = z.infer<typeof AddCompanyMemberBody>;
