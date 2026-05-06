import { AuthSession, type LoginBody, type RegisterBody } from "@baydar/shared";
import { z } from "zod";

import { apiCall, apiFetch, ApiRequestError } from "./api";
import { track } from "./analytics";
import { clearProfileCache, getDeviceId, writeSession } from "./session";

export async function registerAction(
  body: Omit<RegisterBody, "acceptTerms"> & { acceptTerms: true },
): Promise<AuthSession> {
  const session = await apiFetch("/auth/register", AuthSession, {
    method: "POST",
    body: { ...body, deviceId: await getDeviceId() },
    skipAuth: true,
  });
  await writeSession(session);
  await clearProfileCache();
  track("auth.register", { method: "password" });
  return session;
}

export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<AuthSession> {
  const body: LoginBody = {
    email: input.email,
    password: input.password,
    deviceId: await getDeviceId(),
  };
  const session = await apiFetch("/auth/login", AuthSession, {
    method: "POST",
    body,
    skipAuth: true,
  });
  await writeSession(session);
  track("auth.login", { method: "password" });
  return session;
}

export async function confirmVerifyEmailAction(token: string): Promise<{ emailVerified: true }> {
  return apiFetch("/auth/verify-email/confirm", z.object({ emailVerified: z.literal(true) }), {
    method: "POST",
    body: { token },
    skipAuth: true,
  });
}

export async function forgotPasswordAction(email: string): Promise<void> {
  await apiCall("/auth/forgot-password", {
    method: "POST",
    body: { email },
    skipAuth: true,
  });
}

export async function resetPasswordAction(
  token: string,
  newPassword: string,
): Promise<{ reset: true }> {
  return apiFetch("/auth/reset-password", z.object({ reset: z.literal(true) }), {
    method: "POST",
    body: { token, newPassword },
    skipAuth: true,
  });
}

export { ApiRequestError };
