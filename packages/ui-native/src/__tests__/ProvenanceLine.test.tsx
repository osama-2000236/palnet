import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { ProvenanceLine } from "../ProvenanceLine";
import { nativeTokens } from "../tokens";

const flat = (node: { props: { style?: unknown } }): Record<string, unknown> =>
  StyleSheet.flatten(node.props.style) as Record<string, unknown>;

// The dot is deliberately hidden from the accessibility tree, so RNTL's default
// queries skip it. Asking for it explicitly is the assertion, not a workaround.
const hidden = { includeHiddenElements: true } as const;

test("renders text and trailing", () => {
  render(
    <ProvenanceLine
      testID="prov"
      text="النتائج مرتّبة بالقرب من جنين أولًا، ثم بالملاءمة"
      trailing="٣١ نتيجة"
    />,
  );
  expect(screen.getByText("النتائج مرتّبة بالقرب من جنين أولًا، ثم بالملاءمة")).toBeTruthy();
  const trailing = screen.getByText("٣١ نتيجة");
  expect(flat(trailing).fontFamily).toBe(nativeTokens.type.family.mono);
});

test("tone=accent colours the dot accent500", () => {
  const { rerender } = render(<ProvenanceLine testID="prov" text="سبب" />);
  expect(flat(screen.getByTestId("prov-dot", hidden)).backgroundColor).toBe(
    nativeTokens.color.brand600,
  );

  rerender(<ProvenanceLine testID="prov" text="سبب" tone="accent" />);
  expect(flat(screen.getByTestId("prov-dot", hidden)).backgroundColor).toBe(
    nativeTokens.color.accent500,
  );
});

test("variant=inline renders no background or border", () => {
  render(<ProvenanceLine testID="prov" text="سبب" variant="inline" />);
  const row = flat(screen.getByTestId("prov-row"));
  expect(row.backgroundColor).toBe("transparent");
  expect(row.borderBottomWidth).toBe(0);
});

test("band variant paints surfaceBand with a hairline rule", () => {
  render(<ProvenanceLine testID="prov" text="سبب" />);
  const row = flat(screen.getByTestId("prov-row"));
  expect(row.backgroundColor).toBe(nativeTokens.color.surfaceBand);
  expect(row.borderBottomColor).toBe(nativeTokens.color.ruleHairline);
});

test("onPress gives the row role=button and at least minHit height", () => {
  const onPress = jest.fn();
  render(<ProvenanceLine testID="prov" text="سبب" onPress={onPress} />);
  const target = screen.getByTestId("prov");
  expect(target.props.accessibilityRole).toBe("button");

  expect(flat(screen.getByTestId("prov-row")).minHeight).toBe(nativeTokens.chrome.minHit);

  fireEvent.press(target);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test("text and trailing are read as one label", () => {
  render(<ProvenanceLine testID="prov" text="سبب الترتيب" trailing="٣١ نتيجة" />);
  expect(screen.getByTestId("prov").props.accessibilityLabel).toBe("سبب الترتيب — ٣١ نتيجة");
});

test("the dot is hidden from the accessibility tree", () => {
  render(<ProvenanceLine testID="prov" text="سبب" />);
  expect(screen.queryByTestId("prov-dot")).toBeNull();
  expect(screen.getByTestId("prov-dot", hidden).props.accessibilityElementsHidden).toBe(true);
});
