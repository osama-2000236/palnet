import { expect, type APIRequestContext, type Page } from "@playwright/test";

const SESSION_KEY = "palnet.session.v1";
const API_BASE = "http://localhost:4000/api/v1";
const DEFAULT_PASSWORD = "Password123";

type Session = {
  user: {
    id: string;
    email: string;
    role: string;
    locale: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    accessExpiresAt: string;
    refreshExpiresAt: string;
  };
};

type ChatRoomSummary = {
  id: string;
  unreadCount: number;
  lastMessage: { body: string } | null;
};

type JobSummary = {
  id: string;
  title: string;
};

export type TestUser = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  handle: string;
  session: Session;
};

async function apiJson<T>(
  request: APIRequestContext,
  path: string,
  {
    method = "GET",
    session,
    data,
  }: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    session?: Session;
    data?: unknown;
  } = {},
): Promise<T> {
  let lastError = "";

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await request.fetch(`${API_BASE}${path}`, {
      method,
      data,
      headers: session ? { Authorization: `Bearer ${session.tokens.accessToken}` } : undefined,
    });

    const text = await response.text();
    lastError = text;

    if (response.ok()) {
      if (!text) {
        return null as T;
      }

      const json = JSON.parse(text) as { data?: T };
      return (json.data ?? json) as T;
    }

    if (response.status() === 429 && attempt < 9) {
      await sleep(1000 * (attempt + 1));
      continue;
    }

    break;
  }

  expect(false, `${method} ${path} failed: ${lastError}`).toBeTruthy();
  return null as T;
}

export async function loginViaApi(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<Session> {
  return apiJson<Session>(request, "/auth/login", {
    method: "POST",
    data: {
      email,
      password,
      deviceId: `playwright-${email}`,
    },
  });
}

export async function registerViaApi(
  request: APIRequestContext,
  input: {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    locale?: string;
  },
): Promise<Session> {
  return apiJson<Session>(request, "/auth/register", {
    method: "POST",
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      password: input.password ?? DEFAULT_PASSWORD,
      locale: input.locale ?? "en",
      acceptTerms: true,
    },
  });
}

export async function onboardViaApi(
  request: APIRequestContext,
  session: Session,
  input: {
    handle: string;
    firstName: string;
    lastName: string;
    headline?: string;
    location?: string;
    country?: string;
  },
): Promise<void> {
  await apiJson(request, "/profiles/onboard", {
    method: "POST",
    session,
    data: {
      handle: input.handle,
      firstName: input.firstName,
      lastName: input.lastName,
      headline: input.headline ?? "Playwright tester",
      location: input.location ?? "Ramallah",
      country: input.country ?? "PS",
    },
  });
}

export async function createUserViaApi(
  request: APIRequestContext,
  prefix: string,
): Promise<TestUser> {
  const tag = uniqueTag(prefix);
  const firstName = capitalize(prefix);
  const lastName = "Playwright";
  const email = `${tag}@e2e.palnet.test`;
  const handle = `${prefix}-${tag.slice(-8)}`;

  const session = await registerViaApi(request, {
    firstName,
    lastName,
    email,
  });

  await onboardViaApi(request, session, {
    handle,
    firstName,
    lastName,
    headline: `${firstName} from Playwright`,
  });
  await waitForProfileViaApi(request, handle);

  return {
    firstName,
    lastName,
    email,
    password: DEFAULT_PASSWORD,
    handle,
    session,
  };
}

export async function setSession(page: Page, session: Session): Promise<void> {
  await page.goto("/en/login");
  await page.evaluate(
    ([key, value]) => {
      window.localStorage.clear();
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    [SESSION_KEY, session] as const,
  );
}

export async function signOutViaUi(page: Page): Promise<void> {
  await page.locator("button[data-nav-profile]").click();
  await page.getByRole("menuitem", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/en\/login$/);
}

export async function signInViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/en/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/en\/feed$/);
}

export async function createOrGetDmViaApi(
  request: APIRequestContext,
  session: Session,
  otherUserId: string,
): Promise<ChatRoomSummary> {
  return apiJson<ChatRoomSummary>(request, "/messaging/rooms", {
    method: "POST",
    session,
    data: { otherUserId },
  });
}

export async function findJobByTitleViaApi(
  request: APIRequestContext,
  title: string,
  session?: Session,
): Promise<JobSummary> {
  const jobs = await apiJson<JobSummary[]>(request, "/jobs?limit=50", {
    session,
  });
  const match = jobs.find((job) => job.title === title);
  expect(match, `job titled "${title}" not found`).toBeTruthy();
  return match!;
}

export async function applyToJobViaApi(
  request: APIRequestContext,
  session: Session,
  jobId: string,
  coverLetter?: string,
): Promise<void> {
  await apiJson(request, `/jobs/${jobId}/apply`, {
    method: "POST",
    session,
    data: coverLetter ? { coverLetter } : {},
  });
}

export async function unreadNotifications(
  request: APIRequestContext,
  session: Session,
): Promise<number> {
  const payload = await apiJson<{ count: number }>(request, "/notifications/unread-count", {
    session,
  });
  return payload.count;
}

export async function listRooms(
  request: APIRequestContext,
  session: Session,
): Promise<ChatRoomSummary[]> {
  return apiJson<ChatRoomSummary[]>(request, "/messaging/rooms", { session });
}

export async function waitForNotificationsUnread(
  request: APIRequestContext,
  session: Session,
  expected: number,
): Promise<void> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if ((await unreadNotifications(request, session)) === expected) {
      return;
    }
    await sleep(500);
  }
  expect(await unreadNotifications(request, session)).toBe(expected);
}

export async function waitForRoomUnread(
  request: APIRequestContext,
  session: Session,
  roomId: string,
  expected: number,
): Promise<void> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const room = (await listRooms(request, session)).find((item) => item.id === roomId);
    if (room?.unreadCount === expected) {
      return;
    }
    await sleep(500);
  }

  const room = (await listRooms(request, session)).find((item) => item.id === roomId);
  expect(room?.unreadCount).toBe(expected);
}

async function waitForProfileViaApi(request: APIRequestContext, handle: string): Promise<void> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      await apiJson(request, `/profiles/${handle}`);
      return;
    } catch {
      await sleep(500);
    }
  }

  expect(false, `profile ${handle} did not become available`).toBeTruthy();
}

function uniqueTag(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
