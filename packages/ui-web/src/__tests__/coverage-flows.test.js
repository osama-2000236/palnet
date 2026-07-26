const { TextDecoder, TextEncoder } = require("node:util");

global.IS_REACT_ACT_ENVIRONMENT = true;
global.TextDecoder = global.TextDecoder ?? TextDecoder;
global.TextEncoder = global.TextEncoder ?? TextEncoder;

const React = require("react");
const { createRoot } = require("react-dom/client");

const { Composer } = require("../../dist/Composer");
const { MessageBubble } = require("../../dist/MessageBubble");
const { PostCard } = require("../../dist/PostCard");
const { RoomRow } = require("../../dist/RoomRow");
const { ToastProvider, useToast } = require("../../dist/Toast");
const { BlockButton, BlockedListItem, ReportDialog } = require("../../dist/safety");

const user = {
  id: "u1",
  handle: "layan",
  firstName: "Layan",
  lastName: "Khalil",
};

const postLabels = {
  like: "Like",
  liked: "Liked",
  comment: "Comment",
  repost: "Repost",
  send: "Send",
  commentsCount: (n) => `${n} comments`,
  repostsCount: (n) => `${n} reposts`,
  authorLabel: "Layan Khalil",
  moreOptions: "More options",
  report: "Report",
  publicAudience: "Public",
};

const messageLabels = {
  ownPrefix: (time) => `You at ${time}`,
  otherPrefix: (name, time) => `${name} at ${time}`,
  failedHint: "Retry",
  statusSending: "Sending",
  statusSent: "Sent",
  statusDelivered: "Delivered",
  statusRead: "Read",
  statusFailed: "Failed",
  editedSuffix: "edited",
  deletedBody: "Deleted",
};

const reportLabels = {
  title: "Report",
  detailsLabel: "Details",
  cancel: "Cancel",
  submit: "Submit",
  close: "Close",
  reasons: {
    SPAM: "Spam",
    HARASSMENT: "Harassment",
    HATE: "Hate",
    MISINFORMATION: "Misinformation",
    NUDITY: "Nudity",
    VIOLENCE: "Violence",
    OTHER: "Other",
  },
};

function renderClient(element) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(element);
  });

  return {
    container,
    // Dialog renders through a portal on <body> (A2.15), so anything asserting
    // on dialog content has to look there rather than at the mount container.
    portalScope: document.body,
    unmount() {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function click(element) {
  React.act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("web feed and safety component coverage", () => {
  it("covers feed, messaging, composer, and safety components", () => {
    const onSubmit = jest.fn();
    const onToggle = jest.fn();
    const onUnblock = jest.fn();
    const { container, unmount } = renderClient(
      React.createElement(
        "div",
        null,
        React.createElement(Composer, {
          me: user,
          labels: {
            startPrompt: "Start a post",
            expandedPlaceholder: "What is new?",
            audienceHint: "Public",
            addImage: "Image",
            addVideo: "Video",
            addEvent: "Event",
            cancel: "Cancel",
            submit: "Post",
            uploading: "Uploading",
            removeMedia: "Remove media",
            uploadFailed: "Upload failed",
          },
          media: [],
          onSubmit,
        }),
        React.createElement(PostCard, {
          id: "p1",
          author: user,
          body: "Hello world",
          timestamp: "09:41",
          counts: { reactions: 1, comments: 2, reposts: 3 },
          liked: false,
          labels: postLabels,
          onToggleReaction: onToggle,
          commentsSlot: React.createElement("p", null, "Comments"),
        }),
        React.createElement(
          MessageBubble,
          {
            side: "mine",
            timestamp: "09:41",
            status: "failed",
            onRetry: onToggle,
            labels: messageLabels,
          },
          "Message",
        ),
        React.createElement(RoomRow, {
          user,
          preview: "Preview",
          timestamp: "Now",
          unreadCount: 4,
          active: true,
          onClick: onToggle,
        }),
        React.createElement(BlockButton, {
          userId: "u2",
          isBlocked: false,
          onChange: onToggle,
          labels: {
            block: "Block",
            unblock: "Unblock",
            confirmTitle: "Confirm",
            confirmBody: "Are you sure?",
            confirmCta: "Confirm block",
            cancel: "Cancel",
          },
        }),
        React.createElement(BlockedListItem, {
          item: {
            id: "b1",
            blockedUserId: "u2",
            blockedHandle: "samir",
            blockedDisplayName: "Samir",
            blockedAvatarUrl: null,
            createdAt: new Date().toISOString(),
          },
          labels: { unblock: "Unblock" },
          onUnblock,
        }),
        React.createElement(ReportDialog, {
          open: true,
          target: { kind: "post", id: "p1" },
          labels: reportLabels,
          onOpenChange: jest.fn(),
          onSubmit,
        }),
      ),
    );

    click(
      [...document.body.querySelectorAll("button")].find((button) => button.textContent === "Like"),
    );
    click(
      [...document.body.querySelectorAll("button")].find((button) =>
        button.textContent.includes("Preview"),
      ),
    );
    click(
      [...document.body.querySelectorAll("button")].find(
        (button) => button.textContent === "Unblock",
      ),
    );

    expect(container.textContent).toContain("Hello world");
    // ReportDialog portals to <body> (A2.15), so it is not inside `container`.
    expect(document.body.textContent).toContain("Report");
    expect(onToggle).toHaveBeenCalled();
    expect(onUnblock).toHaveBeenCalledWith("u2");
    unmount();
  });

  it("provides toast context to consumers", () => {
    function Probe() {
      const { showToast } = useToast();
      return React.createElement(
        "button",
        { type: "button", onClick: () => showToast({ message: "Queued" }) },
        "Queue",
      );
    }

    const { container, unmount } = renderClient(
      React.createElement(ToastProvider, null, React.createElement(Probe)),
    );

    click(container.querySelector("button"));

    expect(container.textContent).toContain("Queued");
    unmount();
  });
});
