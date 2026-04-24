import { AuthSession, type LoginBody, type RegisterBody } from "@palnet/shared";

import { apiCall, apiFetch, ApiRequestError } from "./api";
import { registerForPush, unregisterForPush } from "./push";
import { clearSession, getAccessToken, getDeviceId, writeSession } from "./session";

export async function registerAction(
  body: Omit<RegisterBody, "acceptTerms"> & { acceptTerms: true },
): Promise<AuthSession> {
  const session = await apiFetch("/auth/register", AuthSession, {
    method: "POST",
    body,
  });
  await writeSession(session);
  // Fire-and-forget push registration. Failures are swallowed inside.
  void registerForPush();
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
  });
  await writeSession(session);
  void registerForPush();
  return session;
}

/**
 * Full logout: drop the push token on the server, revoke the refresh token
 * pair, wipe the secure-store session. Callers should then router.replace to
 * /(auth)/login.
 *
 * Order matters: push-token call has to run while the access token is still
 * in SecureStore. Once clearSession runs we have no way to authenticate the
 * revoke.
 */
export async function logoutAction(): Promise<void> {
  const deviceId = await getDeviceId();
  const token = await getAccessToken();

  // Best-effort push deregister — the server's logout transaction also drops
  // the row, so a failure here just means Expo keeps one stale token until
  // its next push attempt prunes via DeviceNotRegistered.
  await unregisterForPush().catch(() => undefined);

  if (token) {
    await apiCall("/auth/logout", {
      method: "POST",
      token,
      body: { deviceId },
    }).catch(() => undefined);
  }

  await clearSession();
}

export { ApiRequestError };
