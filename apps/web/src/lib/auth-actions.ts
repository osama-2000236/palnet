"use client";

import { AuthSession, type LoginBody, type RegisterBody } from "@baydar/shared";
import { z } from "zod";

import { apiCall, apiFetch, ApiRequestError } from "./api";
import { getDeviceId, writeSession } from "./session";

export async function registerAction(
  body: Omit<RegisterBody, "acceptTerms"> & { acceptTerms: true },
): Promise<AuthSession> {
  const session = await apiFetch("/auth/register", AuthSession, {
    method: "POST",
    body,
  });
  writeSession(session);
  return session;
}

export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<AuthSession> {
  const body: LoginBody = {
    email: input.email,
    password: input.password,
    deviceId: getDeviceId(),
  };
  const session = await apiFetch("/auth/login", AuthSession, {
    method: "POST",
    body,
  });
  writeSession(session);
  return session;
}

export async function sendVerifyEmailAction(email: string): Promise<void> {
  await apiCall("/auth/verify-email/send", {
    method: "POST",
    body: { email },
  });
}

export async function confirmVerifyEmailAction(token: string): Promise<{ emailVerified: true }> {
  return apiFetch("/auth/verify-email/confirm", z.object({ emailVerified: z.literal(true) }), {
    method: "POST",
    body: { token },
  });
}

export async function forgotPasswordAction(email: string): Promise<void> {
  await apiCall("/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export async function resetPasswordAction(
  token: string,
  newPassword: string,
): Promise<{ reset: true }> {
  return apiFetch("/auth/reset-password", z.object({ reset: z.literal(true) }), {
    method: "POST",
    body: { token, newPassword },
  });
}

export { ApiRequestError };
