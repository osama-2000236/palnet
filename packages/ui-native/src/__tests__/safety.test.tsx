import { render } from "@testing-library/react-native";

import { BlockButton, BlockedListItem, ReportSheet } from "../safety";

const reasons = {
  SPAM: "Spam",
  HARASSMENT: "Harassment",
  HATE: "Hate",
  MISINFORMATION: "Misinformation",
  NUDITY: "Nudity",
  VIOLENCE: "Violence",
  OTHER: "Other",
};

describe("safety primitives", () => {
  it("renders ReportSheet content", () => {
    const screen = render(
      <ReportSheet
        open
        onOpenChange={jest.fn()}
        target={{ kind: "post", id: "post_1" }}
        onSubmit={jest.fn()}
        labels={{
          title: "Report content",
          detailsLabel: "Details",
          cancel: "Cancel",
          submit: "Submit",
          close: "Close",
          reasons,
        }}
      />,
    );

    expect(screen.toJSON()).toMatchSnapshot();
    expect(screen.getByText("Report content")).toBeTruthy();
  });

  it("renders BlockButton resting state", () => {
    const screen = render(
      <BlockButton
        userId="user_1"
        isBlocked={false}
        onChange={jest.fn()}
        labels={{
          block: "Block",
          unblock: "Unblock",
          confirmTitle: "Confirm",
          confirmBody: "Body",
          confirmCta: "Confirm",
          cancel: "Cancel",
        }}
      />,
    );

    expect(screen.toJSON()).toMatchSnapshot();
  });

  it("renders BlockedListItem identity", () => {
    const screen = render(
      <BlockedListItem
        item={{
          id: "block_1",
          blockedUserId: "user_1",
          blockedHandle: "blocked-user",
          blockedDisplayName: "Blocked User",
          blockedAvatarUrl: null,
          createdAt: "2026-01-01T00:00:00.000Z",
        }}
        labels={{ unblock: "Unblock" }}
        onUnblock={jest.fn()}
      />,
    );

    expect(screen.toJSON()).toMatchSnapshot();
    expect(screen.getByText("Blocked User")).toBeTruthy();
  });
});
