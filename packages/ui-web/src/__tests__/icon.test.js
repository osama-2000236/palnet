// Guards the IconName union against the Icon switch drifting apart.
//
// A name in the union with no matching `case` falls through to `return null`,
// so <Icon name="..." /> renders nothing — no type error, no runtime error,
// just an invisible element. That is how "building" shipped broken to the
// employer nav tab on both shells. Names are read out of the .ts source so
// this list can never go stale.

const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { TextDecoder, TextEncoder } = require("node:util");

global.IS_REACT_ACT_ENVIRONMENT = true;
global.TextDecoder = global.TextDecoder ?? TextDecoder;
global.TextEncoder = global.TextEncoder ?? TextEncoder;

const React = require("react");
const { createRoot } = require("react-dom/client");

const { Icon } = require("../../dist/Icon");

function iconNames(typesPath) {
  const source = readFileSync(typesPath, "utf8");
  const union = source.slice(source.indexOf("export type IconName"));
  return [...union.slice(0, union.indexOf(";")).matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

const WEB_TYPES = join(__dirname, "..", "Icon.types.ts");
const NATIVE_TYPES = join(__dirname, "..", "..", "..", "ui-native", "src", "Icon.types.ts");

describe("Icon", () => {
  const names = iconNames(WEB_TYPES);

  it("parses a non-empty name list out of Icon.types.ts", () => {
    // Guards the regex itself — a silent [] would make every case below vacuous.
    expect(names.length).toBeGreaterThan(20);
    expect(names).toContain("building");
  });

  it.each(names)("renders a glyph for %s", (name) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    React.act(() => {
      root.render(React.createElement(Icon, { name }));
    });

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // A case that returns an <svg> with no shapes is just as invisible.
    expect(svg.children.length).toBeGreaterThan(0);

    React.act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("stays in lockstep with the native twin", () => {
    // Native additionally has "user"; nothing else may diverge.
    const nativeOnly = iconNames(NATIVE_TYPES).filter((n) => !names.includes(n));
    const webOnly = names.filter((n) => !iconNames(NATIVE_TYPES).includes(n));

    expect(nativeOnly).toEqual(["user"]);
    expect(webOnly).toEqual([]);
  });
});
