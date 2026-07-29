// Ten screens used to render a bare "loading" line as their whole loading
// state (DESIGN.md §12 wants skeleton items, three minimum). This locks that
// in: every one of them shimmers, and none of them prints the word instead.
//
// The global jest-setup translator returns the key, so a reverted screen shows
// the literal string "common.loading" — which is exactly what these assert is
// gone, while the label stays for screen readers.

import { ToastProvider } from "@baydar/ui-native";
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";

import BlockedUsersScreen from "../../app/(app)/settings/blocked";
import CompanyBillingScreen from "../../app/(app)/employer/[slug]/billing";
import CompanyScreen from "../../app/(app)/company/[slug]";
import EditProfileScreen from "../../app/(app)/me/edit";
import JobDetailScreen from "../../app/(app)/jobs/[id]";
import KaramaScreen from "../../app/(app)/me/karama/index";
import MeScreen from "../../app/(app)/me/index";
import NotificationSettingsScreen from "../../app/(app)/settings/notifications";
import PremiumScreen from "../../app/(app)/me/premium/index";
import ProfileScreen from "../../app/(app)/in/[handle]";

import {
  CardStackSkeleton,
  DetailScreenSkeleton,
  ListSkeleton,
} from "../components/ScreenSkeleton";

// Never resolves — every screen stays in its initial loading branch.
const pending = (): Promise<never> => new Promise<never>(() => undefined);

jest.mock("@/lib/api", () => ({
  ApiRequestError: class ApiRequestError extends Error {},
  apiCall: () => pending(),
  apiFetch: () => pending(),
  apiFetchPage: () => pending(),
}));

jest.mock("@/lib/session", () => ({
  getAccessToken: jest.fn(async () => "access-token"),
  readSession: jest.fn(async () => null),
  clearSession: jest.fn(),
  clearProfileCache: jest.fn(),
  writeProfileCache: jest.fn(),
}));

jest.mock("@/api/safety", () => ({
  useBlockedUsers: () => ({ isLoading: true, data: undefined }),
  useBlock: () => ({ isPending: false, mutate: jest.fn() }),
  useReport: () => ({ isPending: false, mutate: jest.fn() }),
  useUnblock: () => ({ isPending: false, mutate: jest.fn() }),
}));

function renderScreen(ui: ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

const SCREENS: [name: string, element: ReactElement][] = [
  ["company/[slug]", <CompanyScreen key="c" />],
  ["employer/[slug]/billing", <CompanyBillingScreen key="b" />],
  ["in/[handle]", <ProfileScreen key="p" />],
  ["jobs/[id]", <JobDetailScreen key="j" />],
  ["me/edit", <EditProfileScreen key="e" />],
  ["me/index", <MeScreen key="m" />],
  ["me/karama", <KaramaScreen key="k" />],
  ["me/premium", <PremiumScreen key="pr" />],
  ["settings/blocked", <BlockedUsersScreen key="bl" />],
  ["settings/notifications", <NotificationSettingsScreen key="n" />],
];

describe("screen loading states", () => {
  it.each(SCREENS)("%s shimmers instead of printing the loading string", (_name, element) => {
    const screen = renderScreen(element);

    expect(screen.getByLabelText("common.loading")).toBeTruthy();
    expect(screen.queryByText("common.loading")).toBeNull();

    screen.unmount();
  });
});

describe("skeleton shapes", () => {
  it("keeps DESIGN.md's three-item minimum on the list shapes", () => {
    expect(render(<ListSkeleton />).getAllByTestId("skeleton-row")).toHaveLength(3);
    expect(render(<DetailScreenSkeleton />).getAllByTestId("skeleton-row")).toHaveLength(3);
  });

  it("announces itself once, not once per bar", () => {
    expect(render(<CardStackSkeleton />).getAllByLabelText("common.loading")).toHaveLength(1);
    expect(render(<DetailScreenSkeleton />).getAllByLabelText("common.loading")).toHaveLength(1);
  });
});
