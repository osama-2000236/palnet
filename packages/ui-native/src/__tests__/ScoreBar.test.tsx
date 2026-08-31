import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { ScoreBar } from "../ScoreBar";
import { nativeTokens } from "../tokens";

const flat = (testID: string): Record<string, unknown> =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style) as Record<string, unknown>;

test("clamps value outside 0–1", () => {
  const { rerender } = render(<ScoreBar testID="bar" value={1.8} />);
  expect(flat("bar-fill").width).toBe("100%");
  expect(screen.getByText("100%")).toBeTruthy();

  rerender(<ScoreBar testID="bar" value={-3} />);
  expect(flat("bar-fill").width).toBe("0%");
});

test("tone=auto picks barFillWeak below 0.5 and barFill at/above", () => {
  const { rerender } = render(<ScoreBar testID="bar" value={0.41} />);
  expect(flat("bar-fill").backgroundColor).toBe(nativeTokens.color.barFillWeak);

  rerender(<ScoreBar testID="bar" value={0.5} />);
  expect(flat("bar-fill").backgroundColor).toBe(nativeTokens.color.barFill);
});

test("a low value is never red", () => {
  render(<ScoreBar testID="bar" value={0.08} />);
  expect(flat("bar-fill").backgroundColor).not.toBe(nativeTokens.color.danger);
});

test("display=ratio renders value over max in mono", () => {
  render(<ScoreBar testID="bar" value={0.6} display="ratio" max={500} />);
  const figure = screen.getByText("300 / 500");
  expect(StyleSheet.flatten(figure.props.style).fontFamily).toBe(nativeTokens.type.family.mono);
});

test("formatNumber localises the figure", () => {
  render(<ScoreBar testID="bar" value={0.89} formatNumber={() => "٨٩"} />);
  expect(screen.getByText("٨٩%")).toBeTruthy();
});

test("segments fill widths sum to the total and render one progressbar", () => {
  render(
    <ScoreBar
      testID="bar"
      value={0}
      display="none"
      caption={["الحد الأدنى", "نطاقك", "وسيط"]}
      segments={[
        { value: 0.2, tone: "weak" },
        { value: 0.5, tone: "strong" },
      ]}
    />,
  );
  expect(flat("bar-segment-0").width).toBe("20%");
  expect(flat("bar-segment-1").width).toBe("50%");
  expect(screen.getAllByRole("progressbar")).toHaveLength(1);
  expect(screen.getByRole("progressbar").props.accessibilityValue.now).toBe(70);
});

test("onBand uses barOnBandTrack / barOnBandFill", () => {
  render(<ScoreBar testID="bar" value={0.7} onBand />);
  expect(flat("bar-fill").backgroundColor).toBe(nativeTokens.color.barOnBandFill);
  const track = screen.getByRole("progressbar");
  expect(StyleSheet.flatten(track.props.style).backgroundColor).toBe(
    nativeTokens.color.barOnBandTrack,
  );
});

test("size=lg uses barHeightLarge", () => {
  render(<ScoreBar testID="bar" value={0.7} size="lg" />);
  expect(StyleSheet.flatten(screen.getByRole("progressbar").props.style).height).toBe(
    nativeTokens.control.barHeightLarge,
  );
});

test("accessibilityValue.now matches the rendered percent", () => {
  render(<ScoreBar testID="bar" value={0.894} label="ملاءمة" />);
  expect(screen.getByText("89%")).toBeTruthy();
  const bar = screen.getByRole("progressbar");
  expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 89 });
  expect(bar.props.accessibilityLabel).toBe("ملاءمة 89%");
});

test("throws in dev when display=none has no caption", () => {
  expect(() => render(<ScoreBar value={0.5} display="none" />)).toThrow(/decoration/);
});

test("throws in dev when ratio has no max", () => {
  expect(() => render(<ScoreBar value={0.5} display="ratio" />)).toThrow(/requires/);
});
