import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { APIRequestContext } from "@playwright/test";
import { AuthSession } from "@baydar/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const WEB_ORIGIN = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export const AUTH_STORAGE_STATE = path.join(process.cwd(), "tests", ".auth", "storageState.json");

export interface A11yAuthState {
  deviceId: string;
  session: string;
}

let cachedAuthState: Promise<A11yAuthState> | null = null;

export function ensureA11yStorageState(request: APIRequestContext): Promise<A11yAuthState> {
  cachedAuthState ??= prepareA11yStorageState(request);
  return cachedAuthState;
}

async function prepareA11yStorageState(request: APIRequestContext): Promise<A11yAuthState> {
  const cached = await readA11yAuthState();
  if (cached) return cached;

  const email = "a11y@baydar.test";
  const password = "Password123";
  const deviceId = "playwright-a11y";

  const register = await request.post(`${API_BASE}/auth/register`, {
    data: {
      email,
      password,
      firstName: "A11y",
      lastName: "Test",
      locale: "ar-PS",
      acceptTerms: true,
    },
  });

  let rawSession: unknown;
  if (register.ok()) {
    rawSession = ((await register.json()) as { data: unknown }).data;
  } else {
    const login = await request.post(`${API_BASE}/auth/login`, {
      data: {
        email,
        password,
        deviceId,
      },
    });
    if (!login.ok()) {
      throw new Error(`Unable to prepare a11y auth fixture: ${login.status()}`);
    }
    rawSession = ((await login.json()) as { data: unknown }).data;
  }

  const session = AuthSession.parse(rawSession);
  const serializedSession = JSON.stringify(session);

  await mkdir(path.dirname(AUTH_STORAGE_STATE), { recursive: true });
  await writeFile(
    AUTH_STORAGE_STATE,
    JSON.stringify(
      {
        cookies: [],
        origins: [
          {
            origin: WEB_ORIGIN,
            localStorage: [
              { name: "baydar.session.v1", value: serializedSession },
              { name: "baydar.deviceId", value: deviceId },
            ],
          },
        ],
      },
      null,
      2,
    ),
  );

  return { deviceId, session: serializedSession };
}

async function readA11yAuthState(): Promise<A11yAuthState | null> {
  try {
    const raw = await readFile(AUTH_STORAGE_STATE, "utf8");
    const parsed = JSON.parse(raw) as {
      origins?: Array<{
        localStorage?: Array<{ name: string; value: string }>;
      }>;
    };
    const values = parsed.origins?.[0]?.localStorage ?? [];
    const session = values.find((entry) => entry.name === "baydar.session.v1")?.value;
    const deviceId = values.find((entry) => entry.name === "baydar.deviceId")?.value;
    return session && deviceId ? { deviceId, session } : null;
  } catch {
    return null;
  }
}
