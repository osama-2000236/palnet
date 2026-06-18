import { render, waitFor } from "@testing-library/react-native";
import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { ReactNode } from "react";

import AppTabsLayout from "../../app/(app)/_layout";
import {
  HIDDEN_APP_TAB_ROUTES,
  HIDDEN_FULL_SCREEN_APP_TAB_ROUTES,
} from "../navigation/app-tab-routes";

const visibleScreens: string[] = [];
const hiddenScreens: string[] = [];
let defaultTabBarButton: (() => ReactNode) | undefined;
let mockIsConnected = true;
let mockPathname = "/feed";

function discoverAppRoutes(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) return discoverAppRoutes(fullPath);
    if (!/\.(?:ts|tsx)$/.test(entry.name)) return [];
    return relative(join(__dirname, "../../app/(app)"), fullPath)
      .split(sep)
      .join("/")
      .replace(/\.(?:ts|tsx)$/, "");
  });
}

jest.mock("expo-router", () => {
  const Tabs = function MockTabs({
    children,
    screenOptions,
  }: {
    children: ReactNode;
    screenOptions?: { tabBarButton?: () => ReactNode };
  }) {
    defaultTabBarButton = screenOptions?.tabBarButton;
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
    usePathname: () => mockPathname,
  };
});

jest.mock("@/components/LoadingIntro", () => ({
  LoadingIntro: ({ testID }: { testID?: string }) => {
    const { Text } = jest.requireActual("react-native") as typeof import("react-native");
    return <Text testID={testID}>Loading</Text>;
  },
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
  useNetworkStore: jest.fn(() => mockIsConnected),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const { router: mockRouter } = jest.requireMock("expo-router") as {
  router: { replace: jest.Mock; push: jest.Mock };
};
const { cachedProfileStatus: mockCachedProfileStatus, fetchProfileStatus: mockFetchProfileStatus } =
  jest.requireMock("@/lib/profile-state") as {
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
    mockPathname = "/feed";
    mockIsConnected = true;
    jest.clearAllMocks();
    mockCachedProfileStatus.mockResolvedValue({ status: "complete" });
    mockFetchProfileStatus.mockResolvedValue({ status: "complete" });
  });

  it("exposes the five design-doc tabs and hides secondary routes", async () => {
    render(<AppTabsLayout />);

    await waitFor(() => {
      expect(visibleScreens.length).toBeGreaterThan(0);
    });

    expect([...new Set(visibleScreens)]).toEqual([
      "feed",
      "network",
      "messages/index",
      "notifications",
      "me/index",
    ]);
    expect(defaultTabBarButton).toBeUndefined();
    expect([...new Set(hiddenScreens)].sort()).toEqual(
      [...HIDDEN_APP_TAB_ROUTES, ...HIDDEN_FULL_SCREEN_APP_TAB_ROUTES].sort(),
    );
    expect([...new Set([...visibleScreens, ...hiddenScreens])].sort()).toEqual(
      discoverAppRoutes(join(__dirname, "../../app/(app)"))
        .filter((route) => route !== "_layout")
        .sort(),
    );
  });

  it("redirects expired sessions to login instead of showing a profile gate error", async () => {
    mockCachedProfileStatus.mockResolvedValueOnce(null);
    mockFetchProfileStatus.mockRejectedValueOnce(new MockApiRequestError(401, "AUTH_UNAUTHORIZED"));

    render(<AppTabsLayout />);

    await waitFor(() => {
      expect(mockClearSession).toHaveBeenCalledTimes(1);
      expect(mockRouter.replace).toHaveBeenCalledWith("/(auth)/login");
    });
  });

  it("does not let cached completion bypass onboarding while online", async () => {
    mockCachedProfileStatus.mockResolvedValueOnce({ status: "complete" });
    mockFetchProfileStatus.mockResolvedValueOnce({ status: "required" });

    render(<AppTabsLayout />);

    await waitFor(() => {
      expect(mockFetchProfileStatus).toHaveBeenCalledWith("access-token");
      expect(mockRouter.replace).toHaveBeenCalledWith("/(app)/onboarding");
    });
  });

  it("keeps the app shell mounted while rechecking secondary app routes", async () => {
    const view = render(<AppTabsLayout />);

    await waitFor(() => {
      expect(view.queryByTestId("app-gate-loading")).toBeNull();
    });

    mockFetchProfileStatus.mockImplementationOnce(() => new Promise(() => undefined));
    mockPathname = "/composer";
    view.rerender(<AppTabsLayout />);

    await waitFor(() => {
      expect(mockFetchProfileStatus).toHaveBeenCalledTimes(2);
    });
    expect(view.queryByTestId("app-gate-loading")).toBeNull();
  });
});
