const { TextDecoder, TextEncoder } = require("node:util");

global.IS_REACT_ACT_ENVIRONMENT = true;
global.TextDecoder = global.TextDecoder ?? TextDecoder;
global.TextEncoder = global.TextEncoder ?? TextEncoder;

const React = require("react");
const { renderToString } = require("react-dom/server.node");
const { createRoot } = require("react-dom/client");

const { BlockButton, BlockedListItem, ReportDialog } = require("../../dist/safety");

const reasons = {
  SPAM: "Spam",
  HARASSMENT: "Harassment",
  HATE: "Hate",
  MISINFORMATION: "Misinformation",
  NUDITY: "Nudity",
  VIOLENCE: "Violence",
  FEE_REQUEST: "Asked me for money",
  GHOST_JOB: "The job does not exist",
  ID_REQUEST: "Asked for my ID",
  OTHER: "Other",
};

const blockLabels = {
  block: "Block",
  unblock: "Unblock",
  confirmTitle: "Confirm block",
  confirmBody: "This hides the member.",
  confirmCta: "Confirm",
  cancel: "Cancel",
};

const reportLabels = {
  title: "Report content",
  detailsLabel: "Details",
  cancel: "Cancel",
  submit: "Submit",
  close: "Close",
  reasons,
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

// Query helpers search the whole document, not just the mount node: Dialog and
// its descendants render through a portal on <body> (A2.15), so "what the
// component rendered" is no longer confined to the container it was mounted in.
// Each test unmounts and removes its container, so the document stays scoped.
function rootOf(scope) {
  return scope && scope.ownerDocument ? scope.ownerDocument.body : scope;
}

function getButton(scope, name) {
  const button = [...rootOf(scope).querySelectorAll("button")].find(
    (item) => item.textContent.trim() === name || item.getAttribute("aria-label") === name,
  );
  if (!button) throw new Error(`Button not found: ${name}`);
  return button;
}

function getText(scope, text) {
  const node = [...rootOf(scope).querySelectorAll("*")].find(
    (item) => item.textContent.trim() === text,
  );
  if (!node) throw new Error(`Text not found: ${text}`);
  return node;
}

function queryText(scope, text) {
  return (
    [...rootOf(scope).querySelectorAll("*")].find((item) => item.textContent.trim() === text) ??
    null
  );
}

function click(element) {
  React.act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function inputText(element, value) {
  React.act(() => {
    const setter = Object.getOwnPropertyDescriptor(element.constructor.prototype, "value")?.set;
    setter?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function flushTimers() {
  await React.act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

describe("safety primitives", () => {
  // A2.15: Dialog renders through a portal now, so it deliberately produces
  // nothing on the server — `createPortal` needs a DOM node and a `position:
  // fixed` overlay is broken by any ancestor with `transform`/`overflow`
  // anyway. A modal has no meaningful server-rendered form; it renders on
  // mount. The client-side coverage below is what asserts its content.
  it("does not server-render ReportDialog (portal, client-only)", () => {
    const html = renderToString(
      React.createElement(ReportDialog, {
        open: true,
        onOpenChange: jest.fn(),
        target: { kind: "post", id: "post_1" },
        onSubmit: jest.fn(),
        labels: reportLabels,
      }),
    );

    expect(html).not.toContain("Report content");
  });

  it("renders ReportDialog content on the client when open", () => {
    function Harness() {
      return React.createElement(ReportDialog, {
        open: true,
        onOpenChange: jest.fn(),
        target: { kind: "post", id: "post_1" },
        onSubmit: jest.fn(),
        labels: reportLabels,
      });
    }
    const { unmount } = renderClient(React.createElement(Harness));
    expect(document.body.textContent).toContain("Report content");
    expect(document.body.textContent).toContain("Spam");
    unmount();
  });

  it("renders BlockButton resting state", () => {
    const html = renderToString(
      React.createElement(BlockButton, {
        userId: "user_1",
        isBlocked: false,
        onChange: jest.fn(),
        labels: blockLabels,
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

  it("confirms a block change and closes the confirmation", () => {
    const onChange = jest.fn();

    const { container, unmount } = renderClient(
      React.createElement(BlockButton, {
        userId: "user_1",
        isBlocked: false,
        onChange,
        labels: blockLabels,
      }),
    );

    click(getButton(container, "Block"));
    expect(getText(container, "Confirm block")).toBeTruthy();

    click(getButton(container, "Confirm"));

    expect(onChange).toHaveBeenCalledWith(true, "user_1");
    expect(queryText(container, "Confirm block")).toBeNull();
    unmount();
  });

  it("cancels a block confirmation without changing state", () => {
    const onChange = jest.fn();

    const { container, unmount } = renderClient(
      React.createElement(BlockButton, {
        userId: "user_1",
        isBlocked: false,
        onChange,
        labels: blockLabels,
      }),
    );

    click(getButton(container, "Block"));
    click(getButton(container, "Cancel"));

    expect(onChange).not.toHaveBeenCalled();
    expect(queryText(container, "Confirm block")).toBeNull();
    unmount();
  });

  it("shows the unblock variant when initially blocked", () => {
    const { container, unmount } = renderClient(
      React.createElement(BlockButton, {
        userId: "user_1",
        isBlocked: true,
        onChange: jest.fn(),
        labels: blockLabels,
      }),
    );

    const button = getButton(container, "Unblock");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    unmount();
  });

  it("submits the selected report reason and trimmed details", () => {
    const onSubmit = jest.fn();
    const target = { kind: "post", id: "post_1" };

    const { container, unmount } = renderClient(
      React.createElement(ReportDialog, {
        open: true,
        onOpenChange: jest.fn(),
        target,
        onSubmit,
        labels: reportLabels,
      }),
    );

    click(document.body.querySelector('input[value="HARASSMENT"]'));
    inputText(document.body.querySelector("textarea"), "  abusive reply  ");
    click(getButton(container, "Submit"));

    expect(onSubmit).toHaveBeenCalledWith({
      target,
      reason: "HARASSMENT",
      details: "abusive reply",
    });
    unmount();
  });

  // Hiring fraud is listed first, but it must not be the default: a post or a
  // comment report opening pre-accusing the author of demanding money is worse
  // than no preselection at all.
  it("defaults to SPAM when no reason is given", () => {
    const onSubmit = jest.fn();
    const target = { kind: "post", id: "post_1" };

    const { container, unmount } = renderClient(
      React.createElement(ReportDialog, {
        open: true,
        onOpenChange: jest.fn(),
        target,
        onSubmit,
        labels: reportLabels,
      }),
    );

    click(getButton(container, "Submit"));

    expect(onSubmit).toHaveBeenCalledWith({ target, reason: "SPAM", details: undefined });
    unmount();
  });

  // The never-pay banner opens this dialog already knowing what is being
  // reported, so the user never hunts for the right radio.
  it("preselects the reason it was opened with", () => {
    const onSubmit = jest.fn();
    const target = { kind: "user", id: "user_1" };

    const { container, unmount } = renderClient(
      React.createElement(ReportDialog, {
        open: true,
        onOpenChange: jest.fn(),
        target,
        onSubmit,
        labels: reportLabels,
        initialReason: "FEE_REQUEST",
      }),
    );

    click(getButton(container, "Submit"));

    expect(onSubmit).toHaveBeenCalledWith({
      target,
      reason: "FEE_REQUEST",
      details: undefined,
    });
    unmount();
  });

  // Two call sites keep this mounted with `open={false}` rather than
  // unmounting it, so without a reset a reopened dialog carried the previous
  // reason and the previous details text into the next report.
  it("resets reason and details when reopened", () => {
    const onSubmit = jest.fn();
    const target = { kind: "user", id: "user_1" };
    const props = {
      onOpenChange: jest.fn(),
      target,
      onSubmit,
      labels: reportLabels,
      initialReason: "FEE_REQUEST",
    };

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    React.act(() => {
      root.render(React.createElement(ReportDialog, { ...props, open: true }));
    });

    click(document.body.querySelector('input[value="HARASSMENT"]'));
    inputText(document.body.querySelector("textarea"), "stale text");

    React.act(() => {
      root.render(React.createElement(ReportDialog, { ...props, open: false }));
    });
    React.act(() => {
      root.render(React.createElement(ReportDialog, { ...props, open: true }));
    });

    click(getButton(container, "Submit"));

    expect(onSubmit).toHaveBeenCalledWith({
      target,
      reason: "FEE_REQUEST",
      details: undefined,
    });

    React.act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("cancels a report without submitting", () => {
    const onOpenChange = jest.fn();
    const onSubmit = jest.fn();

    const { container, unmount } = renderClient(
      React.createElement(ReportDialog, {
        open: true,
        onOpenChange,
        target: { kind: "post", id: "post_1" },
        onSubmit,
        labels: reportLabels,
      }),
    );

    click(getButton(container, "Cancel"));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    unmount();
  });

  it("moves initial focus into the dialog and restores focus on close", async () => {
    function Harness() {
      const [open, setOpen] = React.useState(false);
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(
          "button",
          { type: "button", onClick: () => setOpen(true) },
          "Open report",
        ),
        React.createElement(ReportDialog, {
          open,
          onOpenChange: setOpen,
          target: { kind: "post", id: "post_1" },
          onSubmit: jest.fn(),
          labels: reportLabels,
        }),
      );
    }

    const { container, unmount } = renderClient(React.createElement(Harness));

    const trigger = getButton(container, "Open report");
    trigger.focus();
    click(trigger);

    await flushTimers();
    const form = document.body.querySelector("form");
    const dialog = document.body.querySelector('[role="dialog"]');
    expect(document.activeElement).toBe(form);
    expect(dialog.contains(document.activeElement)).toBe(true);

    click(getButton(container, "Close"));

    expect(document.activeElement).toBe(trigger);
    unmount();
  });
});
