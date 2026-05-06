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
    unmount() {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function getButton(container, name) {
  const button = [...container.querySelectorAll("button")].find(
    (item) => item.textContent.trim() === name || item.getAttribute("aria-label") === name,
  );
  if (!button) throw new Error(`Button not found: ${name}`);
  return button;
}

function getText(container, text) {
  const node = [...container.querySelectorAll("*")].find((item) => item.textContent.trim() === text);
  if (!node) throw new Error(`Text not found: ${text}`);
  return node;
}

function queryText(container, text) {
  return [...container.querySelectorAll("*")].find((item) => item.textContent.trim() === text) ?? null;
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
  it("renders ReportDialog when open", () => {
    const html = renderToString(
      React.createElement(ReportDialog, {
        open: true,
        onOpenChange: jest.fn(),
        target: { kind: "post", id: "post_1" },
        onSubmit: jest.fn(),
        labels: reportLabels,
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

    click(container.querySelector('input[value="HARASSMENT"]'));
    inputText(container.querySelector("textarea"), "  abusive reply  ");
    click(getButton(container, "Submit"));

    expect(onSubmit).toHaveBeenCalledWith({
      target,
      reason: "HARASSMENT",
      details: "abusive reply",
    });
    unmount();
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
        React.createElement("button", { type: "button", onClick: () => setOpen(true) }, "Open report"),
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
    const form = container.querySelector("form");
    const dialog = container.querySelector('[role="dialog"]');
    expect(document.activeElement).toBe(form);
    expect(dialog.contains(document.activeElement)).toBe(true);

    click(getButton(container, "Close"));

    expect(document.activeElement).toBe(trigger);
    unmount();
  });
});
