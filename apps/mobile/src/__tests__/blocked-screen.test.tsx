import { render } from "@testing-library/react-native";

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

describe("BlockedUsersScreen", () => {
  it("renders the blocked users list", () => {
    const screen = render(<BlockedUsersScreen />);

    expect(screen.getByText("Blocked User")).toBeTruthy();
  });
});
