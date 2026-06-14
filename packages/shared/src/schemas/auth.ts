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
  deviceId: z.string().min(1).max(128).optional(),
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

export const LogoutBody = z.object({
  deviceId: z.string().min(1).max(128),
});
export type LogoutBody = z.infer<typeof LogoutBody>;

export const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: Password,
  deviceId: z.string().min(1).max(128),
});
export type ChangePasswordBody = z.infer<typeof ChangePasswordBody>;

export const StreamTokenScope = z.enum(["messaging", "notifications"]);
export type StreamTokenScope = z.infer<typeof StreamTokenScope>;

export const StreamTokenRequest = z.object({
  scope: StreamTokenScope,
});
export type StreamTokenRequest = z.infer<typeof StreamTokenRequest>;

export const StreamTokenResponse = z.object({
  token: z.string().min(1),
  expiresAt: z.string().datetime(),
});
export type StreamTokenResponse = z.infer<typeof StreamTokenResponse>;

export const SendVerifyEmailBody = z.object({
  email: Email,
});
export type SendVerifyEmailBody = z.infer<typeof SendVerifyEmailBody>;

export const ConfirmVerifyEmailBody = z.object({
  token: z.string().length(64),
});
export type ConfirmVerifyEmailBody = z.infer<typeof ConfirmVerifyEmailBody>;

export const ForgotPasswordBody = z.object({
  email: Email,
});
export type ForgotPasswordBody = z.infer<typeof ForgotPasswordBody>;

export const ResetPassword = z
  .string()
  .min(10, { message: "PASSWORD_TOO_SHORT" })
  .max(200, { message: "PASSWORD_TOO_LONG" })
  .regex(/[a-z]/, { message: "PASSWORD_NEEDS_LOWERCASE" })
  .regex(/[A-Z]/, { message: "PASSWORD_NEEDS_UPPERCASE" })
  .regex(/\d/, { message: "PASSWORD_NEEDS_DIGIT" });

export const ResetPasswordBody = z.object({
  token: z.string().length(64),
  newPassword: ResetPassword,
});
export type ResetPasswordBody = z.infer<typeof ResetPasswordBody>;

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
  }),
  tokens: AuthTokens,
});
export type AuthSession = z.infer<typeof AuthSession>;
