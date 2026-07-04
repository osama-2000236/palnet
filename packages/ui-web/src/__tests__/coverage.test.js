const { TextDecoder, TextEncoder } = require("node:util");

global.IS_REACT_ACT_ENVIRONMENT = true;
global.TextDecoder = global.TextDecoder ?? TextDecoder;
global.TextEncoder = global.TextEncoder ?? TextEncoder;

const React = require("react");
const { createRoot } = require("react-dom/client");
const { renderToString } = require("react-dom/server.node");

const { Alert } = require("../../dist/Alert");
const { AppShell } = require("../../dist/AppShell");
const { Avatar } = require("../../dist/Avatar");
const { Banner } = require("../../dist/Banner");
const { Button } = require("../../dist/Button");
const { Checkbox } = require("../../dist/Checkbox");
const { Chip } = require("../../dist/Chip");
const { Dialog } = require("../../dist/Dialog");
const { EmptyState } = require("../../dist/EmptyState");
const { Icon } = require("../../dist/Icon");
const { Illustration } = require("../../dist/Illustration");
const { Input } = require("../../dist/Input");
const { OnboardingProgress } = require("../../dist/OnboardingProgress");
const { PostCardSkeleton } = require("../../dist/PostCardSkeleton");
const { RadioGroup } = require("../../dist/RadioGroup");
const { RetryChip } = require("../../dist/RetryChip");
const { Skeleton } = require("../../dist/Skeleton");
const { Surface } = require("../../dist/Surface");
const { Switch } = require("../../dist/Switch");
const { Tab, Tabs } = require("../../dist/Tabs");
const { Toast } = require("../../dist/Toast");
const { TypingIndicator } = require("../../dist/TypingIndicator");

const user = {
  id: "u1",
  handle: "layan",
  firstName: "Layan",
  lastName: "Khalil",
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

function click(element) {
  React.act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("public web component coverage", () => {
  it("server-renders exported display and layout primitives", () => {
    const cases = [
      React.createElement(Alert, { title: "Heads up" }, "Body"),
      React.createElement(Avatar, { user, online: true, ring: true }),
      React.createElement(
        Button,
        { leading: React.createElement(Icon, { name: "check" }) },
        "Save",
      ),
      React.createElement(EmptyState, {
        motif: "search",
        title: "Nothing found",
        body: "Try again",
      }),
      React.createElement(Icon, { name: "home", title: "Home" }),
      React.createElement(Illustration, { motif: "messages", size: "sm" }),
      React.createElement(Input, {
        id: "email",
        "aria-label": "Email",
        error: true,
        errorMessage: "Required",
      }),
      React.createElement(OnboardingProgress, {
        current: 2,
        total: 4,
        labels: ["One", "Two", "Three", "Four"],
      }),
      React.createElement(PostCardSkeleton),
      React.createElement(Skeleton, { width: 16, height: 16, kind: "circle" }),
      React.createElement(Surface, { variant: "card" }, "Surface body"),
      React.createElement(TypingIndicator, { label: "Layan is typing" }),
    ];

    const html = cases.map((element) => renderToString(element)).join("");

    expect(html).toContain("Heads up");
    expect(html).toContain("Layan");
    expect(html).toContain("Nothing found");
    expect(html).toContain("progressbar");
    expect(html).toContain("Layan is typing");
  });

  it("renders app shell and composition atoms without crashing", () => {
    const html = renderToString(
      React.createElement(
        AppShell,
        {
          currentRoute: "feed",
          me: user,
          labels: {
            logoAlt: "Baydar",
            searchPlaceholder: "Search",
            searchLabel: "Search",
            nav: {
              feed: "Feed",
              network: "Network",
              jobs: "Jobs",
              messages: "Messages",
              notifications: "Notifications",
              saved: "Saved",
              employer: "Employer",
            },
            mainNavLabel: "Main",
            myProfile: "Me",
            viewProfile: "View profile",
            settings: "Settings",
            signOut: "Sign out",
            unreadTemplate: {
              messages: "{count} unread messages",
              notifications: "{count} unread notifications",
            },
            bellDisconnected: "Notifications disconnected",
          },
          onNavigate: jest.fn(),
        },
        React.createElement("main", null, "App body"),
      ),
    );

    expect(html).toContain("Baydar");
    expect(html).toContain("App body");
  });

  it("covers simple interactive callbacks and ARIA states", () => {
    const onChange = jest.fn();
    const onDismiss = jest.fn();
    const onRetry = jest.fn();
    const { container, unmount } = renderClient(
      React.createElement(
        "div",
        null,
        React.createElement(Banner, { kind: "success", dismissible: true, onDismiss }, "Saved"),
        React.createElement(Checkbox, {
          label: "Agree",
          checked: false,
          onCheckedChange: onChange,
        }),
        React.createElement(Chip, { active: true, onClick: onRetry }, "Remote"),
        React.createElement(RadioGroup, {
          legend: "Visibility",
          value: "public",
          onValueChange: onChange,
          items: [
            { value: "public", label: "Public" },
            { value: "private", label: "Private" },
          ],
        }),
        React.createElement(RetryChip, { label: "Retry", onRetry }),
        React.createElement(Switch, { checked: false, onChange, ariaLabel: "Enabled" }),
        React.createElement(
          Tabs,
          { value: "one", onChange, label: "Sections" },
          React.createElement(Tab, { value: "one", count: 2 }, "One"),
          React.createElement(Tab, { value: "two" }, "Two"),
        ),
        React.createElement(
          Dialog,
          { open: true, onClose: onDismiss, title: "Confirm", closeLabel: "Close" },
          React.createElement("button", { type: "button", "data-autofocus": true }, "Inside"),
        ),
        React.createElement(Toast, { message: "Saved", kind: "success", onDismiss }),
      ),
    );

    click(container.querySelector('[aria-label="إغلاق"]'));
    click(container.querySelector('[aria-label="Close"]'));
    click(container.querySelector('input[type="checkbox"]'));
    click(container.querySelector('[role="switch"][aria-checked="true"]'));
    click(container.querySelector('button[aria-label="Enabled"]'));
    click(
      [...container.querySelectorAll("button")].find((button) => button.textContent === "Retry"),
    );
    click([...container.querySelectorAll('[role="tab"]')].find((tab) => tab.textContent === "Two"));

    expect(onDismiss).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenCalled();
    expect(onRetry).toHaveBeenCalled();
    expect(container.querySelector('[role="tab"][aria-selected="true"]').textContent).toContain(
      "One",
    );
    unmount();
  });
});
