"use client";

import { AuthSession, type LoginBody, type RegisterBody } from "@baydar/shared";

import { apiFetch, ApiRequestError } from "./api";
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

export { ApiRequestError };
