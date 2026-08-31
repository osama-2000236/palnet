import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { ScoreBar } from "../ScoreBar";
import { nativeTokens } from "../tokens";

/** Mirrors ScoreBar's bidi isolate so the expectations stay readable. */
const ltr = (text: string): string =>
  `${String.fromCharCode(0x2066)}${text}${String.fromCharCode(0x2069)}`;

const flat = (testID: string): Record<string, unknown> =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style) as Record<string, unknown>;

test("clamps value outside 0–1", () => {
  const { rerender } = render(<ScoreBar testID="bar" value={1.8} />);
  expect(flat("bar-fill").width).toBe("100%");
  expect(screen.getByText(ltr("100%"))).toBeTruthy();

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

test("the figure carries an LTR isolate — bidi must not turn 3 / 5 into 5 / 3", () => {
  // Caught on a real RTL device, not by a style assertion: `writingDirection`
  // is honoured on iOS and ignored by Android's text engine, so the direction
  // has to be IN the string. U+2066 … U+2069.
  render(<ScoreBar testID="bar" value={0.6} display="ratio" max={5} />);
  expect(screen.getByText(ltr("3 / 5"))).toBeTruthy();

  const style = StyleSheet.flatten(screen.getByText(ltr("3 / 5")).props.style);
  expect(style.writingDirection).toBe("ltr");
});

test("display=ratio renders value over max in mono", () => {
  render(<ScoreBar testID="bar" value={0.6} display="ratio" max={500} />);
  const figure = screen.getByText(ltr("300 / 500"));
  expect(StyleSheet.flatten(figure.props.style).fontFamily).toBe(nativeTokens.type.family.mono);
});

test("formatNumber localises the figure", () => {
  render(<ScoreBar testID="bar" value={0.89} formatNumber={() => "٨٩"} />);
  expect(screen.getByText(ltr("٨٩%"))).toBeTruthy();
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
  expect(screen.getByText(ltr("89%"))).toBeTruthy();
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
