const { TextDecoder, TextEncoder } = require("node:util");

global.IS_REACT_ACT_ENVIRONMENT = true;
global.TextDecoder = global.TextDecoder ?? TextDecoder;
global.TextEncoder = global.TextEncoder ?? TextEncoder;

const React = require("react");
const { createRoot } = require("react-dom/client");
const { renderToString } = require("react-dom/server.node");

const { Checkbox } = require("../../dist/Checkbox");
const { Composer } = require("../../dist/Composer");
const { Dialog } = require("../../dist/Dialog");
const { Input } = require("../../dist/Input");
const { Menu } = require("../../dist/Menu");
const { Popover } = require("../../dist/Popover");
const { RadioGroup } = require("../../dist/RadioGroup");
const { Switch } = require("../../dist/Switch");
const { Tabs, Tab } = require("../../dist/Tabs");
const { Tooltip } = require("../../dist/Tooltip");

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

  it("links Input error text without requiring a caller-provided id", () => {
    const { container, unmount } = renderClient(
      React.createElement(Input, {
        "aria-label": "Email",
        "aria-describedby": "email-format",
        error: true,
        errorMessage: "Enter a valid email address",
      }),
    );

    const input = container.querySelector("input");
    const describedBy = input.getAttribute("aria-describedby").split(" ");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(describedBy[0]).toBe("email-format");
    const helper = container.querySelector('[id$="-helper"]');
    expect(helper.id).toBe(describedBy[1]);
    expect(helper.textContent).toBe("Enter a valid email address");
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
          { value: "public", label: "Public" },
          { value: "private", label: "Private" },
        ],
      }),
    );

    click([...container.querySelectorAll("input")].find((input) => input.value === "private"));

    expect(container.textContent).toContain("Visibility");
    expect(onValueChange).toHaveBeenCalledWith("private");
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
    const group = container.querySelector('[role="radiogroup"]');
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

  it("renders Tooltip on the server", () => {
    const html = renderToString(
      React.createElement(
        Tooltip,
        { content: "More actions" },
        React.createElement("button", { type: "button" }, "⋯"),
      ),
    );

    expect(html).toContain("More actions");
    expect(html).toContain('role="tooltip"');
  });

  it("opens Popover content", () => {
    const { container, unmount } = renderClient(
      React.createElement(
        Popover,
        { label: "Profile preview", trigger: React.createElement("span", null, "Open") },
        React.createElement("p", null, "Preview body"),
      ),
    );

    click(container.querySelector("button"));

    expect(container.textContent).toContain("Preview body");
    unmount();
  });

  it("labels Popover and returns focus to its trigger on Escape", () => {
    const { container, unmount } = renderClient(
      React.createElement(
        Popover,
        { label: "Profile preview", trigger: React.createElement("span", null, "Open") },
        React.createElement("button", { type: "button" }, "Edit profile"),
      ),
    );

    const trigger = container.querySelector("button");
    click(trigger);
    const panel = container.querySelector('[role="dialog"]');
    const action = [...container.querySelectorAll("button")][1];
    expect(panel.getAttribute("aria-label")).toBe("Profile preview");

    key(action, "Escape");

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    unmount();
  });

  it("supports Tabs arrow, Home, and End keyboard navigation", () => {
    const onChange = jest.fn();
    const { container, unmount } = renderClient(
      React.createElement(
        Tabs,
        { value: "one", onChange, label: "Sections" },
        React.createElement(Tab, { value: "one" }, "One"),
        React.createElement(Tab, { value: "two" }, "Two"),
        React.createElement(Tab, { value: "three" }, "Three"),
      ),
    );

    const tabs = [...container.querySelectorAll('[role="tab"]')];
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
    key(tabs[0], "ArrowRight");
    expect(onChange).toHaveBeenLastCalledWith("two");
    expect(document.activeElement).toBe(tabs[1]);
    key(tabs[1], "End");
    expect(onChange).toHaveBeenLastCalledWith("three");
    expect(document.activeElement).toBe(tabs[2]);
    key(tabs[2], "Home");
    expect(onChange).toHaveBeenLastCalledWith("one");
    expect(document.activeElement).toBe(tabs[0]);
    key(tabs[0], "ArrowLeft");
    expect(onChange).toHaveBeenLastCalledWith("three");
    expect(document.activeElement).toBe(tabs[2]);
    unmount();
  });

  it("moves Tabs in the physical arrow direction in RTL", () => {
    const onChange = jest.fn();
    const { container, unmount } = renderClient(
      React.createElement(
        "div",
        { dir: "rtl" },
        React.createElement(
          Tabs,
          { value: "one", onChange },
          React.createElement(Tab, { value: "one" }, "One"),
          React.createElement(Tab, { value: "two" }, "Two"),
        ),
      ),
    );

    const tabs = [...container.querySelectorAll('[role="tab"]')];
    key(tabs[0], "ArrowRight");
    expect(onChange).toHaveBeenLastCalledWith("two");
    key(tabs[1], "ArrowLeft");
    expect(onChange).toHaveBeenLastCalledWith("one");
    unmount();
  });

  it("keeps Composer media controls keyboard accessible with adequate targets", () => {
    const { container, unmount } = renderClient(
      React.createElement(Composer, {
        me: null,
        body: "",
        labels: {
          collapsedPlaceholder: "Write a post",
          expandedPlaceholder: "Post body",
          audienceHint: "Public",
          addImage: "Add image",
          addVideo: "Add video",
          uploading: "Uploading",
          removeMedia: "Remove media",
          cancel: "Cancel",
          submit: "Publish",
        },
        onPickMedia: jest.fn(),
        onRemoveMedia: jest.fn(),
        media: [{ id: "image-1", kind: "IMAGE", url: "https://example.test/image.png" }],
      }),
    );

    click(container.querySelector("button"));
    const input = container.querySelector('input[type="file"]');
    const remove = [...container.querySelectorAll("button")].find(
      (button) => button.getAttribute("aria-label") === "Remove media",
    );

    expect(container.querySelector("textarea").getAttribute("aria-label")).toBe("Post body");
    expect(input.getAttribute("aria-label")).toBe("Add image");
    expect(input.className).not.toContain("hidden");
    expect(input.tabIndex).toBe(0);
    expect(remove.className).toContain("h-11");
    expect(remove.className).toContain("w-11");
    unmount();
  });

  it("supports Menu keyboard navigation, select, shortcuts, and danger items", () => {
    const onArchive = jest.fn();
    const onDelete = jest.fn();
    const { container, unmount } = renderClient(
      React.createElement(Menu, {
        label: "Actions",
        trigger: React.createElement("span", null, "Actions"),
        items: [
          { id: "archive", label: "Archive", onSelect: onArchive },
          { type: "separator", id: "sep" },
          { id: "delete", label: "Delete", shortcut: "Del", danger: true, onSelect: onDelete },
        ],
      }),
    );

    click(container.querySelector("button"));
    const menu = container.querySelector('[role="menu"]');
    expect(container.querySelector('[role="separator"]')).toBeTruthy();
    expect(container.textContent).toContain("Del");
    key(menu, "ArrowDown");
    const deleteItem = [...container.querySelectorAll('[role="menuitem"]')][1];
    key(deleteItem, "Enter");

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(deleteItem.className).toContain("text-danger");
    unmount();
  });

  it("closes Menu on Escape and outside pointer", () => {
    const { container, unmount } = renderClient(
      React.createElement(Menu, {
        label: "Actions",
        trigger: React.createElement("span", null, "Actions"),
        placement: "bottom-start",
        items: [{ id: "archive", label: "Archive", onSelect: jest.fn() }],
      }),
    );

    click(container.querySelector("button"));
    const menu = container.querySelector('[role="menu"]');
    expect(menu.className).toContain("start-0");
    key(menu, "Escape");
    expect(container.querySelector('[role="menu"]')).toBeNull();

    click(container.querySelector("button"));
    React.act(() => {
      document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(container.querySelector('[role="menu"]')).toBeNull();
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
      [...container.querySelectorAll("button")].find(
        (button) => button.getAttribute("aria-label") === "Close dialog",
      ),
    );

    expect(container.textContent).toContain("Confirm");
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("toggles Switch and keeps disabled+checked track classes separate", () => {
    const onChange = jest.fn();
    const { container, unmount } = renderClient(
      React.createElement(Switch, {
        checked: true,
        disabled: true,
        onChange,
        ariaLabel: "Moderation alerts",
      }),
    );

    const control = container.querySelector('[role="switch"]');
    click(control);

    expect(control.getAttribute("aria-checked")).toBe("true");
    expect(control.disabled).toBe(true);
    expect(control.className).toContain("opacity-55");
    expect(control.className).toContain("bg-brand-600");
    // Regression: disabled + checked used to glue into "opacity-55bg-brand-600".
    expect(control.className).not.toMatch(/opacity-55bg-/);
    expect(onChange).not.toHaveBeenCalled();
    unmount();
  });

  it("fires Switch onChange when enabled", () => {
    const onChange = jest.fn();
    const { container, unmount } = renderClient(
      React.createElement(Switch, {
        checked: false,
        onChange,
        ariaLabel: "Weekly digest",
      }),
    );

    click(container.querySelector('[role="switch"]'));

    expect(onChange).toHaveBeenCalledWith(true);
    unmount();
  });
});
