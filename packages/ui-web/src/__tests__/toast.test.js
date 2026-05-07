const { TextDecoder, TextEncoder } = require("node:util");

global.IS_REACT_ACT_ENVIRONMENT = true;
global.TextDecoder = global.TextDecoder ?? TextDecoder;
global.TextEncoder = global.TextEncoder ?? TextEncoder;

const React = require("react");
const { createRoot } = require("react-dom/client");
const { renderToString } = require("react-dom/server.node");

const { Toast, ToastProvider, useToast } = require("../../dist/Toast");

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

describe("Toast", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("renders a message and dismiss button", () => {
    const html = renderToString(
      React.createElement(Toast, {
        message: "Saved",
        kind: "success",
        onDismiss: jest.fn(),
        dismissLabel: "Dismiss toast",
      }),
    );

    expect(html).toContain("Saved");
    expect(html).toContain("Dismiss toast");
  });

  it("auto-dismisses shown toasts after the timer", () => {
    function Harness() {
      const { showToast } = useToast();
      return React.createElement(
        "button",
        {
          type: "button",
          onClick: () => showToast({ message: "Profile saved", kind: "success", durationMs: 1000 }),
        },
        "Show toast",
      );
    }

    const { container, unmount } = renderClient(
      React.createElement(ToastProvider, null, React.createElement(Harness)),
    );

    click(container.querySelector("button"));
    expect(container.textContent).toContain("Profile saved");

    React.act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(container.textContent).not.toContain("Profile saved");
    unmount();
  });
});
