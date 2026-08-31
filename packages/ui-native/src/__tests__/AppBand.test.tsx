import { render, screen } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";

import { AppBand } from "../AppBand";
import { ThemeProvider } from "../ThemeProvider";
import { getNativeTokens, nativeTokens } from "../tokens";

// The repo-wide mock in jest-setup pins top to 0, which would make the
// edgeToEdge assertion vacuous. Override it with a real notch here.
let mockTop = 0;
jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: () => ({ top: mockTop, right: 0, bottom: 0, left: 0 }),
}));

const bandStyle = (testID = "band"): Record<string, unknown> =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style) as Record<string, unknown>;

beforeEach(() => {
  mockTop = 0;
});

test("renders title and subtitle", () => {
  render(<AppBand testID="band" title="الخلاصة" subtitle="جولة اليوم" />);
  expect(screen.getByText("الخلاصة")).toBeTruthy();
  expect(screen.getByText("جولة اليوم")).toBeTruthy();
});

test("count renders in mono and is ignored when trailing is passed", () => {
  const { rerender } = render(<AppBand testID="band" title="الإشعارات" count={24} />);
  const count = screen.getByText("24");
  expect(StyleSheet.flatten(count.props.style).fontFamily).toBe(nativeTokens.type.family.mono);

  rerender(
    <AppBand testID="band" title="الإشعارات" count={24} trailing={<Text>تحديد الكل</Text>} />,
  );
  expect(screen.queryByText("24")).toBeNull();
  expect(screen.getByText("تحديد الكل")).toBeTruthy();
});

test("formatCount localises the count", () => {
  render(<AppBand testID="band" title="الإشعارات" count={24} formatCount={() => "٢٤"} />);
  expect(screen.getByText("٢٤")).toBeTruthy();
});

test("applies the top safe-area inset; edgeToEdge={false} does not", () => {
  mockTop = 59;
  const { rerender } = render(<AppBand testID="band" title="الخلاصة" />);
  // inset + whatever is left of the designed band padding, floored at space[4].
  expect(bandStyle().paddingTop).toBe(59 + nativeTokens.space[4]);

  rerender(<AppBand testID="band" title="الخلاصة" edgeToEdge={false} />);
  expect(bandStyle().paddingTop).toBe(nativeTokens.space[4]);
});

test("a small inset still reaches the designed band padding", () => {
  mockTop = 24; // Android status bar
  render(<AppBand testID="band" title="الخلاصة" />);
  expect(bandStyle().paddingTop).toBe(nativeTokens.chrome.bandPaddingTop);
});

test("passes tone=band to AppHeader — the title resolves to bandOn", () => {
  render(<AppBand testID="band" title="الخلاصة" subtitle="جولة اليوم" />);
  expect(StyleSheet.flatten(screen.getByText("الخلاصة").props.style).color).toBe(
    nativeTokens.color.bandOn,
  );
  expect(StyleSheet.flatten(screen.getByText("جولة اليوم").props.style).color).toBe(
    nativeTokens.color.bandOnMuted,
  );
});

test("no shadow on the band — it is separated by colour, not elevation", () => {
  render(<AppBand testID="band" title="الخلاصة" />);
  const style = bandStyle();
  expect(style.shadowOpacity).toBeUndefined();
  expect(style.elevation).toBeUndefined();
  expect(style.backgroundColor).toBe(nativeTokens.color.band);
});

test("dark theme resolves the band to the dark value", () => {
  render(
    <ThemeProvider scheme="dark">
      <AppBand testID="band" title="الخلاصة" />
    </ThemeProvider>,
  );
  expect(bandStyle().backgroundColor).toBe(getNativeTokens("dark").color.band);
});
