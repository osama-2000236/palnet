import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { StepRail } from "../StepRail";
import { nativeTokens } from "../tokens";

const STEPS = [
  { key: "sent", label: "أُرسل" },
  { key: "seen", label: "شوهد" },
  { key: "interview", label: "مقابلة" },
  { key: "decision", label: "قرار" },
];

// Nodes are deliberately hidden from the accessibility tree, so RNTL's default
// queries skip them; asking for them explicitly is the point.
const hidden = { includeHiddenElements: true } as const;

const bg = (testID: string): unknown =>
  (StyleSheet.flatten(screen.getByTestId(testID, hidden).props.style) as Record<string, unknown>)
    .backgroundColor;

test("renders one node per step and one more segment than nodes", () => {
  render(<StepRail testID="rail" steps={STEPS} current={1} />);
  expect(screen.getAllByTestId(/^rail-node-\d$/, hidden)).toHaveLength(4);
  expect(screen.getAllByTestId(/^rail-segment-\d$/)).toHaveLength(5);
});

test("segments before current use barFill, after use barTrack", () => {
  render(<StepRail testID="rail" steps={STEPS} current={2} />);
  expect(bg("rail-segment-0")).toBe(nativeTokens.color.barFill);
  expect(bg("rail-segment-2")).toBe(nativeTokens.color.barFill);
  expect(bg("rail-segment-3")).toBe(nativeTokens.color.barTrack);
  expect(bg("rail-segment-4")).toBe(nativeTokens.color.barTrack);
});

test("current={-1} renders no filled segment", () => {
  render(<StepRail testID="rail" steps={STEPS} current={-1} />);
  for (let i = 0; i <= STEPS.length; i += 1) {
    expect(bg(`rail-segment-${i}`)).toBe(nativeTokens.color.barTrack);
  }
});

test("completed nodes are brand600 and the current node takes the accent", () => {
  render(<StepRail testID="rail" steps={STEPS} current={2} />);
  expect(bg("rail-node-0")).toBe(nativeTokens.color.brand600);
  expect(bg("rail-node-2")).toBe(nativeTokens.color.accent500);
  expect(bg("rail-node-3")).toBe(nativeTokens.color.barTrack);
});

test("tone=brand moves the current node to brand600", () => {
  render(<StepRail testID="rail" steps={STEPS} current={1} tone="brand" />);
  expect(bg("rail-node-1")).toBe(nativeTokens.color.brand600);
});

test("terminal=closed renders every node in barTrack", () => {
  render(<StepRail testID="rail" steps={STEPS} current={2} terminal="closed" />);
  for (let i = 0; i < STEPS.length; i += 1) {
    expect(bg(`rail-node-${i}`)).toBe(nativeTokens.color.barTrack);
  }
  expect(bg("rail-segment-0")).toBe(nativeTokens.color.barTrack);
});

test("compact renders no label row", () => {
  const { rerender } = render(<StepRail testID="rail" steps={STEPS} current={1} />);
  expect(screen.getByText("أُرسل")).toBeTruthy();

  rerender(<StepRail testID="rail" steps={STEPS} current={1} compact />);
  expect(screen.queryByText("أُرسل")).toBeNull();
});

test("accessibilityValue.now equals current + 1", () => {
  render(<StepRail testID="rail" steps={STEPS} current={2} />);
  const bar = screen.getByRole("progressbar");
  expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 4, now: 3 });
  expect(bar.props.accessibilityLabel).toBe("مقابلة — 3 / 4");
});

test("throws in dev on fewer than 3 or more than 5 steps", () => {
  expect(() => render(<StepRail steps={STEPS.slice(0, 2)} current={0} />)).toThrow(/3–5/);
  expect(() => render(<StepRail steps={[...STEPS, ...STEPS].slice(0, 6)} current={0} />)).toThrow(
    /3–5/,
  );
});
