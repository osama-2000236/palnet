const { TextDecoder, TextEncoder } = require("node:util");

global.IS_REACT_ACT_ENVIRONMENT = true;
global.TextDecoder = global.TextDecoder ?? TextDecoder;
global.TextEncoder = global.TextEncoder ?? TextEncoder;

const React = require("react");
const { createRoot } = require("react-dom/client");

const {
  Illustration,
  ILLUSTRATION_MOTIFS,
  ILLUSTRATION_DIRECTIONS,
} = require("../../dist/Illustration");

function render(element) {
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

describe("Illustration", () => {
  // Regression: `error` had no case in any direction and `saved` only in
  // outline, so those motifs rendered an empty (harvest: symbol-less) svg.
  for (const direction of ILLUSTRATION_DIRECTIONS) {
    for (const motif of ILLUSTRATION_MOTIFS) {
      it(`draws a symbol for ${motif} / ${direction}`, () => {
        const { container, unmount } = render(
          React.createElement(Illustration, { motif, direction }),
        );
        const svg = container.querySelector("svg");

        // harvest always draws baseline + wheat; the motif symbol is the 3rd child.
        const drawn =
          direction === "harvest" ? svg.firstChild.children.length : svg.children.length;
        expect(drawn).toBe(direction === "harvest" ? 3 : 1);

        unmount();
      });
    }
  }
});
