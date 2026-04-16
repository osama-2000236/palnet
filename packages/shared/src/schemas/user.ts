import { z } from "zod";
import { UserRole } from "../enums";

export const PublicUser = z.object({
  id: z.string().cuid(),
  role: z.nativeEnum(UserRole),
  locale: z.string(),
  lastSeenAt: z.string().datetime().nullable(),
});
export type PublicUser = z.infer<typeof PublicUser>;

export const PrivateUser = PublicUser.extend({
  email: z.string().email(),
  phone: z.string().nullable(),
  emailVerified: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type PrivateUser = z.infer<typeof PrivateUser>;
