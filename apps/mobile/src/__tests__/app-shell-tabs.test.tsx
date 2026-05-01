import { render, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import AppTabsLayout from "../../app/(app)/_layout";

const visibleScreens: string[] = [];
const hiddenScreens: string[] = [];

jest.mock("expo-router", () => {
  const Tabs = function MockTabs({ children }: { children: ReactNode }) {
    return <>{children}</>;
  };
  Tabs.Screen = function MockTabsScreen({
    name,
    options,
  }: {
    name: string;
    options?: { href?: null };
  }) {
    if (options?.href === null) hiddenScreens.push(name);
    else visibleScreens.push(name);
    return null;
  };
  return {
    Tabs,
    router: { replace: jest.fn(), push: jest.fn() },
    usePathname: () => "/feed",
  };
});

jest.mock("@/components/LoadingIntro", () => ({
  LoadingIntro: () => null,
}));

jest.mock("@/lib/profile-state", () => ({
  cachedProfileStatus: jest.fn(async () => ({ status: "complete" })),
  fetchProfileStatus: jest.fn(),
}));

jest.mock("@/lib/push", () => ({
  registerForPushAsync: jest.fn(async () => undefined),
}));

jest.mock("@/lib/session", () => ({
  clearSession: jest.fn(async () => undefined),
  getAccessToken: jest.fn(async () => "access-token"),
  readSession: jest.fn(async () => ({
    user: { id: "user-1", email: "qa@baydar.test", role: "USER", locale: "ar-PS" },
    tokens: { accessToken: "access-token", refreshToken: "refresh-token" },
  })),
}));

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  apiFetch: jest.fn(async () => ({ count: 0 })),
}));

jest.mock("@/lib/sse", () => ({
  subscribeSse: jest.fn(() => jest.fn()),
}));

jest.mock("@/store/network", () => ({
  useNetworkStore: jest.fn(() => true),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const { router: mockRouter } = jest.requireMock("expo-router") as {
  router: { replace: jest.Mock; push: jest.Mock };
};
const {
  cachedProfileStatus: mockCachedProfileStatus,
  fetchProfileStatus: mockFetchProfileStatus,
} = jest.requireMock("@/lib/profile-state") as {
  cachedProfileStatus: jest.Mock;
  fetchProfileStatus: jest.Mock;
};
const { clearSession: mockClearSession } = jest.requireMock("@/lib/session") as {
  clearSession: jest.Mock;
};
const { ApiRequestError: MockApiRequestError } = jest.requireMock("@/lib/api") as {
  ApiRequestError: new (status: number, code: string, details?: unknown) => Error;
};

describe("AppTabsLayout", () => {
  beforeEach(() => {
    visibleScreens.length = 0;
    hiddenScreens.length = 0;
    jest.clearAllMocks();
    mockCachedProfileStatus.mockResolvedValue({ status: "complete" });
  });

  it("exposes the five design-doc tabs and hides secondary routes", async () => {
    render(<AppTabsLayout />);

    await waitFor(() => {
      expect(visibleScreens.length).toBeGreaterThan(0);
    });

    expect([...new Set(visibleScreens)]).toEqual([
      "feed",
      "network",
      "composer",
      "messages/index",
      "me/index",
    ]);
    expect(hiddenScreens).toEqual(
      expect.arrayContaining(["jobs/index", "notifications", "search", "me/edit"]),
    );
  });

  it("redirects expired sessions to login instead of showing a profile gate error", async () => {
    mockCachedProfileStatus.mockResolvedValueOnce(null);
    mockFetchProfileStatus.mockRejectedValueOnce(
      new MockApiRequestError(401, "AUTH_UNAUTHORIZED"),
    );

    render(<AppTabsLayout />);

    await waitFor(() => {
      expect(mockClearSession).toHaveBeenCalledTimes(1);
      expect(mockRouter.replace).toHaveBeenCalledWith("/(auth)/login");
    });
  });
});
