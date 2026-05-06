const React = require("react");
const { renderToString } = require("react-dom/server");

const { BlockButton, BlockedListItem, ReportDialog } = require("../../dist/safety");

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
  it("renders ReportDialog when open", () => {
    const html = renderToString(
      React.createElement(ReportDialog, {
        open: true,
        onOpenChange: jest.fn(),
        target: { kind: "post", id: "post_1" },
        onSubmit: jest.fn(),
        labels: {
          title: "Report content",
          detailsLabel: "Details",
          cancel: "Cancel",
          submit: "Submit",
          close: "Close",
          reasons,
        },
      }),
    );

    expect(html).toContain("Report content");
    expect(html).toContain("Spam");
  });

  it("renders BlockButton resting state", () => {
    const html = renderToString(
      React.createElement(BlockButton, {
        userId: "user_1",
        isBlocked: false,
        onChange: jest.fn(),
        labels: {
          block: "Block",
          unblock: "Unblock",
          confirmTitle: "Confirm",
          confirmBody: "Body",
          confirmCta: "Confirm",
          cancel: "Cancel",
        },
      }),
    );

    expect(html).toContain("Block");
  });

  it("renders BlockedListItem identity and action", () => {
    const html = renderToString(
      React.createElement(BlockedListItem, {
        item: {
          id: "block_1",
          blockedUserId: "user_1",
          blockedHandle: "blocked-user",
          blockedDisplayName: "Blocked User",
          blockedAvatarUrl: null,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        labels: { unblock: "Unblock" },
        onUnblock: jest.fn(),
      }),
    );

    expect(html).toContain("Blocked User");
    expect(html).toContain("blocked-user");
    expect(html).toContain("Unblock");
  });
});
