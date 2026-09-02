// The web half of Avatar's accessibility contract.
//
// `packages/ui-native/src/Avatar.tsx` was converged onto this component's
// behaviour (PR #182) and carries tests for all three rules. This side had
// none, so the reference the native twin was corrected against was itself
// unpinned — a later "cleanup" here would silently re-open the drift and only
// the native suite would notice, pointing at the wrong platform.
//
// The three rules, and what each one prevents:
//   1. exactly one node announces the person — not the wrapper AND the photo
//   2. a nameless avatar is hidden, not announced as an unlabelled image
//   3. the decorative parts (initials, presence dot) never announce
const { TextDecoder, TextEncoder } = require("node:util");

global.IS_REACT_ACT_ENVIRONMENT = true;
global.TextDecoder = global.TextDecoder ?? TextDecoder;
global.TextEncoder = global.TextEncoder ?? TextEncoder;

const React = require("react");
const { createRoot } = require("react-dom/client");

const { Avatar } = require("../../dist/Avatar");

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

describe("Avatar accessibility contract", () => {
  it("announces the person exactly once, with or without a photo", () => {
    for (const avatarUrl of [null, "https://media.baydar.ps/avatar.jpg"]) {
      const { container, unmount } = renderClient(
        React.createElement(Avatar, { user: { ...user, avatarUrl } }),
      );

      const labelled = container.querySelectorAll('[aria-label="Layan Khalil"]');
      expect(labelled).toHaveLength(1);
      expect(labelled[0].getAttribute("role")).toBe("img");

      // The photo must not repeat the name the wrapper already carries.
      const img = container.querySelector("img");
      if (avatarUrl) {
        expect(img).not.toBeNull();
        expect(img.getAttribute("alt")).toBe("");
      }

      unmount();
    }
  });

  it("hides an avatar that has no name rather than announcing an unlabelled image", () => {
    const { container, unmount } = renderClient(
      React.createElement(Avatar, { user: { id: "u3" } }),
    );

    const root = container.firstElementChild;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    // An `img` role with nothing to announce is noise, not information.
    expect(root.getAttribute("role")).toBeNull();
    expect(root.getAttribute("aria-label")).toBeNull();

    unmount();
  });

  it("keeps the initials and the presence dot out of the accessibility tree", () => {
    const { container, unmount } = renderClient(
      React.createElement(Avatar, { user, online: true }),
    );

    const root = container.firstElementChild;
    // Every child of the labelled wrapper is decorative: the initials repeat
    // the name and the dot has no text at all.
    for (const child of root.children) {
      expect(child.getAttribute("aria-hidden")).toBe("true");
    }
    expect(root.children.length).toBeGreaterThan(1); // initials + dot

    unmount();
  });
});
