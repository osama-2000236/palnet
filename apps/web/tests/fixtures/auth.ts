import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { APIRequestContext } from "@playwright/test";
import { AuthSession } from "@baydar/shared";

import { qaRunStatePath, type QaRunState } from "../../e2e/qa-run";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const WEB_ORIGIN = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export const AUTH_STORAGE_STATE = path.join(process.cwd(), "tests", ".auth", "storageState.json");

export interface A11yAuthState {
  deviceId: string;
  session: string;
  handle: string;
}

const ACCESS_TOKEN_EXPIRY_SKEW_MS = 60_000;

let cachedAuthState: Promise<A11yAuthState> | null = null;

export function ensureA11yStorageState(request: APIRequestContext): Promise<A11yAuthState> {
  cachedAuthState ??= prepareA11yStorageState(request);
  return cachedAuthState;
}

async function prepareA11yStorageState(request: APIRequestContext): Promise<A11yAuthState> {
  const cached = await readA11yAuthState();
  if (cached) return cached;

  const runId = await readQaRunId();
  const suffix = runId.replace(/^qa-/, "").slice(0, 18);
  const email = `qa+${runId}.a11y@baydar.test`;
  const password = "Password123";
  const deviceId = `playwright-${runId}`;
  const handle = `${suffix}-a11y`.slice(0, 30);

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
  const accessToken = session.tokens.accessToken;

  // Complete the profile so this fixture can hit any RequireCompleteProfile-
  // guarded endpoint (safety, posts, comments, reactions, connections, jobs,
  // notifications, search, feed, reposts). The completion guard requires
  // basics + at least one experience or education — onboard sets basics,
  // then we add an experience to satisfy the background check.
  await request.post(`${API_BASE}/profiles/onboard`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      handle,
      firstName: "A11y",
      lastName: "Test",
      headline: "Accessibility smoke profile",
      location: "Ramallah",
      country: "PS",
    },
  });
  await request.post(`${API_BASE}/profiles/me/experiences`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      title: "QA Engineer",
      companyName: "Baydar Test",
      locationMode: "REMOTE",
      startDate: new Date("2024-01-01T00:00:00.000Z").toISOString(),
    },
  });

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

  return { deviceId, session: serializedSession, handle };
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
    if (!session || !deviceId) return null;
    const runId = await readQaRunId();
    if (deviceId !== `playwright-${runId}`) return null;

    const parsedSession = AuthSession.parse(JSON.parse(session));
    const accessExpiresAt = Date.parse(parsedSession.tokens.accessExpiresAt);
    if (!Number.isFinite(accessExpiresAt)) return null;
    if (accessExpiresAt - Date.now() <= ACCESS_TOKEN_EXPIRY_SKEW_MS) return null;

    const handle = `${runId.replace(/^qa-/, "").slice(0, 18)}-a11y`.slice(0, 30);
    return { deviceId, session: JSON.stringify(parsedSession), handle };
  } catch {
    return null;
  }
}

async function readQaRunId(): Promise<string> {
  if (process.env.BAYDAR_QA_RUN_ID) return process.env.BAYDAR_QA_RUN_ID;
  try {
    const state = JSON.parse(await readFile(qaRunStatePath, "utf8")) as QaRunState;
    return state.runId;
  } catch {
    return "qa-local";
  }
}
