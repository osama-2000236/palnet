const { TextDecoder, TextEncoder } = require("node:util");

global.IS_REACT_ACT_ENVIRONMENT = true;
global.TextDecoder = global.TextDecoder ?? TextDecoder;
global.TextEncoder = global.TextEncoder ?? TextEncoder;

const React = require("react");
const { createRoot } = require("react-dom/client");

const { Checkbox } = require("../../dist/Checkbox");
const { Dialog } = require("../../dist/Dialog");
const { RadioGroup } = require("../../dist/RadioGroup");

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

function key(element, keyName) {
  React.act(() => {
    element.dispatchEvent(new KeyboardEvent("keydown", { key: keyName, bubbles: true }));
  });
}

describe("new web atoms", () => {
  it("renders Checkbox and reports checked changes", () => {
    const onCheckedChange = jest.fn();
    const { container, unmount } = renderClient(
      React.createElement(Checkbox, {
        label: "Agree to terms",
        checked: false,
        onCheckedChange,
      }),
    );

    click(container.querySelector("input"));

    expect(container.textContent).toContain("Agree to terms");
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    unmount();
  });

  it("exposes Checkbox disabled, checked, error, and ARIA states in RTL", () => {
    document.documentElement.dir = "rtl";
    const onCheckedChange = jest.fn();
    const { container, unmount } = renderClient(
      React.createElement(Checkbox, {
        label: "Agree",
        checked: true,
        disabled: true,
        error: true,
        errorMessage: "Required",
        onCheckedChange,
      }),
    );

    const input = container.querySelector("input");
    click(input);

    expect(input.checked).toBe(true);
    expect(input.disabled).toBe(true);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toContain("-message");
    expect(container.textContent).toContain("Required");
    expect(onCheckedChange).not.toHaveBeenCalled();
    document.documentElement.dir = "";
    unmount();
  });

  it("renders RadioGroup and changes selection", () => {
    const onValueChange = jest.fn();
    const { container, unmount } = renderClient(
      React.createElement(RadioGroup, {
        legend: "Visibility",
        value: "public",
        onValueChange,
        items: [
          { value: "public", label: "Public", testID: "visibility-public" },
          { value: "private", label: "Private" },
        ],
      }),
    );

    click([...container.querySelectorAll("input")].find((input) => input.value === "private"));

    expect(container.textContent).toContain("Visibility");
    expect(onValueChange).toHaveBeenCalledWith("private");
    // Twin of native's `testID` on the Pressable: the pill, not the sr-only input.
    expect(container.querySelector("[data-testid='visibility-public']").tagName).toBe("LABEL");
    unmount();
  });

  it("exposes RadioGroup disabled, error, and ARIA state", () => {
    const onValueChange = jest.fn();
    const { container, unmount } = renderClient(
      React.createElement(RadioGroup, {
        legend: "Visibility",
        value: "public",
        onValueChange,
        error: true,
        errorMessage: "Choose a value",
        items: [
          { value: "public", label: "Public" },
          { value: "private", label: "Private", disabled: true },
        ],
      }),
    );

    const fieldset = container.querySelector("fieldset");
    // A2.2: the inner role="radiogroup" was removed — it produced an ARIA
    // group with no accessible name, because the <legend> names the <fieldset>.
    const group = container.querySelector("fieldset > div");
    const disabledInput = [...container.querySelectorAll("input")].find(
      (input) => input.value === "private",
    );
    click(disabledInput);

    expect(fieldset.getAttribute("aria-invalid")).toBe("true");
    expect(group).toBeTruthy();
    expect(disabledInput.disabled).toBe(true);
    expect(container.textContent).toContain("Choose a value");
    expect(onValueChange).not.toHaveBeenCalled();
    unmount();
  });

  it("renders Dialog footer and closes from the close button", () => {
    const onClose = jest.fn();
    const { container, unmount } = renderClient(
      React.createElement(
        Dialog,
        {
          open: true,
          onClose,
          title: "Delete account",
          closeLabel: "Close dialog",
          footer: React.createElement("button", { type: "button" }, "Confirm"),
        },
        React.createElement("p", null, "This action is serious."),
      ),
    );

    click(
      [...document.body.querySelectorAll("button")].find(
        (button) => button.getAttribute("aria-label") === "Close dialog",
      ),
    );

    // Dialog portals to <body> (A2.15).
    expect(document.body.textContent).toContain("Confirm");
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
  });
});
