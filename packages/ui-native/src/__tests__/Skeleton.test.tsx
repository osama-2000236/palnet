import { render } from "@testing-library/react-native";
import { Animated, StyleSheet, type ViewStyle } from "react-native";

import { Skeleton } from "../Skeleton";
import { nativeTokens } from "../tokens";

type TestNode = {
  props: Record<string, unknown>;
  children?: Array<TestNode | string> | null;
};

function mockAnimatedLoop(): void {
  jest.spyOn(Animated, "loop").mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
    reset: jest.fn(),
  } as unknown as ReturnType<typeof Animated.loop>);
}

function asNode(json: unknown): TestNode {
  expect(json).toBeTruthy();
  expect(Array.isArray(json)).toBe(false);
  return json as TestNode;
}

function styleOf(json: unknown): ViewStyle {
  return StyleSheet.flatten(asNode(json).props.style) as ViewStyle;
}

describe("Skeleton", () => {
  beforeEach(() => {
    mockAnimatedLoop();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders a single decorative placeholder with token background", () => {
    const screen = render(
      <Skeleton width={nativeTokens.space[8]} height={nativeTokens.space[3]} />,
    );
    const node = asNode(screen.toJSON());
    const style = styleOf(node);

    expect(node.children).toBeNull();
    expect(node.props.accessibilityElementsHidden).toBe(true);
    expect(node.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(style.backgroundColor).toBe(nativeTokens.color.surfaceSubtle);
  });

  it("applies custom width and height props", () => {
    const screen = render(
      <Skeleton width={nativeTokens.space[12]} height={nativeTokens.space[4]} />,
    );
    const style = styleOf(screen.toJSON());

    expect(style.width).toBe(nativeTokens.space[12]);
    expect(style.height).toBe(nativeTokens.space[4]);
  });

  it("applies a custom radius prop", () => {
    const screen = render(
      <Skeleton
        width={nativeTokens.space[8]}
        height={nativeTokens.space[3]}
        radius={nativeTokens.radius.lg}
      />,
    );
    const style = styleOf(screen.toJSON());

    expect(style.borderRadius).toBe(nativeTokens.radius.lg);
  });

  it("renders without crashing when no props are passed", () => {
    const screen = render(<Skeleton />);

    expect(screen.toJSON()).toBeTruthy();
  });
});
