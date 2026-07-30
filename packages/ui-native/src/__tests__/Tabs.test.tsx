import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";

import { Tab, Tabs } from "../Tabs";
import { nativeTokens } from "../tokens";

// DESIGN.md §6.3: selected = `brand-600` underline + `ink` label, inactive =
// `ink-muted`. The pill this control shipped with inverted the selected label
// onto a brand-600 fill and drew no underline at all, so asserting both halves
// is what makes a regression to the pill fail here rather than on a device.
function renderTabs() {
  return render(
    <Tabs value="posts" onChange={() => {}}>
      <Tab value="posts">المنشورات</Tab>
      <Tab value="about">نبذة</Tab>
    </Tabs>,
  );
}

const labelColor = (label: string): unknown =>
  StyleSheet.flatten(screen.getByText(label).props.style).color;

// The underline is the tab's own child, not a border on the strip — find it by
// the one thing that identifies it, its 2px height.
const underlineColor = (label: string): unknown => {
  const tab = screen.getByLabelText(label);
  const bar = tab.find(
    (node) =>
      typeof node.type === "string" &&
      (StyleSheet.flatten(node.props.style) as ViewStyle | undefined)?.height === 2,
  );
  return (StyleSheet.flatten(bar.props.style) as ViewStyle).backgroundColor;
};

it("gives the selected tab an ink label over a brand-600 underline", () => {
  renderTabs();

  expect(labelColor("المنشورات")).toBe(nativeTokens.color.ink);
  expect(underlineColor("المنشورات")).toBe(nativeTokens.color.brand600);
});

it("leaves an unselected tab ink-muted with no underline", () => {
  renderTabs();

  expect(labelColor("نبذة")).toBe(nativeTokens.color.inkMuted);
  expect(underlineColor("نبذة")).toBe("transparent");
});

// The count goes through the injected formatter for the same reason web's does:
// this package cannot import @baydar/shared, and an unformatted count renders
// Latin digits inside an Arabic-Indic UI. A zero draws nothing — a "٠" badge is
// noise, not information — and the badge is inside the Pressable, so the count
// has to reach the accessibility label or a screen reader never hears it.
it("formats a non-zero count through the injected formatter and announces it", () => {
  render(
    <Tabs value="incoming" onChange={() => {}} formatCount={(n) => `[${n}]`}>
      <Tab value="incoming" count={12}>
        الدعوات
      </Tab>
      <Tab value="sent" count={0}>
        المرسلة
      </Tab>
    </Tabs>,
  );

  expect(screen.getByText("[12]")).toBeTruthy();
  expect(screen.getByLabelText("الدعوات ([12])")).toBeTruthy();
  expect(screen.queryByText("[0]")).toBeNull();
  expect(screen.getByLabelText("المرسلة")).toBeTruthy();
});
