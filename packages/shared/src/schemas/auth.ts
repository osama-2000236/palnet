import { z } from "zod";

// Password: min 8, at least one letter, one number. Keep rule stable across clients.
export const Password = z
  .string()
  .min(8, { message: "PASSWORD_TOO_SHORT" })
  .regex(/[A-Za-z]/, { message: "PASSWORD_NEEDS_LETTER" })
  .regex(/\d/, { message: "PASSWORD_NEEDS_DIGIT" });

export const Email = z.string().email().toLowerCase().trim();

export const RegisterBody = z.object({
  email: Email,
  password: Password,
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  locale: z.string().default("ar-PS"),
  acceptTerms: z.literal(true),
});
export type RegisterBody = z.infer<typeof RegisterBody>;

export const LoginBody = z.object({
  email: Email,
  password: z.string().min(1),
  deviceId: z.string().min(1).max(128),
});
export type LoginBody = z.infer<typeof LoginBody>;

export const RefreshBody = z.object({
  refreshToken: z.string().min(1),
  deviceId: z.string().min(1).max(128),
});
export type RefreshBody = z.infer<typeof RefreshBody>;

export const AuthTokens = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  accessExpiresAt: z.string().datetime(),
  refreshExpiresAt: z.string().datetime(),
});
export type AuthTokens = z.infer<typeof AuthTokens>;

export const AuthSession = z.object({
  user: z.object({
    id: z.string().cuid(),
    email: Email,
    role: z.enum(["USER", "COMPANY_ADMIN", "MODERATOR", "ADMIN"]),
    locale: z.string(),
    emailVerified: z.boolean(),
    // Populated only while an admin has the account suspended. UI renders
    // a read-only banner and blocks mutation forms when this is set.
    suspendedAt: z.string().datetime().nullable().optional(),
    suspendedReason: z.string().nullable().optional(),
  }),
  tokens: AuthTokens,
});
export type AuthSession = z.infer<typeof AuthSession>;

// Body for POST /auth/email/verify — single-use token from the verification
// email.
export const VerifyEmailBody = z.object({
  token: z.string().min(16).max(256),
});
export type VerifyEmailBody = z.infer<typeof VerifyEmailBody>;

// Body for POST /auth/password/reset/request — user types their email. We
// never leak whether the address exists (always 204).
export const RequestPasswordResetBody = z.object({
  email: Email,
});
export type RequestPasswordResetBody = z.infer<typeof RequestPasswordResetBody>;

// Body for POST /auth/password/reset — consume token, set new password.
export const ResetPasswordBody = z.object({
  token: z.string().min(16).max(256),
  newPassword: Password,
});
export type ResetPasswordBody = z.infer<typeof ResetPasswordBody>;
