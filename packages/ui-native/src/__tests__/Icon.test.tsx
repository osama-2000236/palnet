import { render } from "@testing-library/react-native";
import { processColor } from "react-native";

import { Icon, type IconName } from "../Icon";
import { nativeTokens } from "../tokens";

type TestNode = {
  type: string;
  props: Record<string, unknown>;
  children?: Array<TestNode | string> | null;
};

function asNode(json: unknown): TestNode {
  expect(json).toBeTruthy();
  expect(Array.isArray(json)).toBe(false);
  return json as TestNode;
}

function collectNodes(node: TestNode | string | null | undefined): TestNode[] {
  if (!node || typeof node === "string") {
    return [];
  }

  return [node, ...(node.children ?? []).flatMap((child) => collectNodes(child))];
}

describe("Icon", () => {
  it("renders representative glyphs without crashing", () => {
    const names: IconName[] = ["bell", "home", "search", "user", "x"];

    for (const name of names) {
      const screen = render(<Icon name={name} />);

      expect(screen.toJSON()).toBeTruthy();
      screen.unmount();
    }
  });

  it("defaults to decorative accessibility hiding", () => {
    const icon = asNode(render(<Icon name="bell" />).toJSON());

    expect(icon.props.accessibilityElementsHidden).toBe(true);
  });

  it("applies size to the underlying svg width and height", () => {
    const icon = asNode(render(<Icon name="bell" size={32} />).toJSON());

    expect(icon.props.width).toBe(32);
    expect(icon.props.height).toBe(32);
  });

  it("forwards color to stroked svg glyphs", () => {
    const color = nativeTokens.color.brand700;
    const icon = asNode(render(<Icon name="search" color={color} />).toJSON());
    const nodes = collectNodes(icon);
    const strokeValues = nodes.map((node) => node.props.stroke).filter(Boolean);

    expect(icon.props.stroke).toBe(color);
    expect(strokeValues).toEqual(
      expect.arrayContaining([color, { type: 0, payload: processColor(color) }]),
    );
  });

  it("forwards color to filled svg glyphs", () => {
    const color = nativeTokens.color.danger;
    const icon = asNode(render(<Icon name="more" color={color} />).toJSON());
    const nodes = collectNodes(icon);
    const fillNodes = nodes.filter((node) => node.props.fill);

    expect(icon.props.stroke).toBe(color);
    expect(fillNodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          props: expect.objectContaining({
            fill: { type: 0, payload: processColor(color) },
          }),
        }),
      ]),
    );
  });

  it("respects custom strokeWidth values", () => {
    const defaultIcon = asNode(render(<Icon name="home" />).toJSON());
    const customIcon = asNode(render(<Icon name="home" strokeWidth={3.25} />).toJSON());

    expect(defaultIcon.props.strokeWidth).toBe(1.8);
    expect(customIcon.props.strokeWidth).toBe(3.25);
    expect(customIcon.props.strokeWidth).not.toBe(defaultIcon.props.strokeWidth);
  });
});
