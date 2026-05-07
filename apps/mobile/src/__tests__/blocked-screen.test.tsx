import { ToastProvider } from "@baydar/ui-native";
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";

import BlockedUsersScreen from "../../app/(app)/settings/blocked";

jest.mock("@/api/safety", () => ({
  useBlockedUsers: () => ({
    isLoading: false,
    data: {
      data: [
        {
          id: "block_1",
          blockedUserId: "user_1",
          blockedHandle: "blocked-user",
          blockedDisplayName: "Blocked User",
          blockedAvatarUrl: null,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      meta: { hasMore: false, nextCursor: null },
    },
  }),
  useUnblock: () => ({ isPending: false, mutate: jest.fn() }),
}));

function renderWithToast(ui: ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe("BlockedUsersScreen", () => {
  it("renders the blocked users list", () => {
    const screen = renderWithToast(<BlockedUsersScreen />);

    expect(screen.getByText("Blocked User")).toBeTruthy();
  });
});
