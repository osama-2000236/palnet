// ActionSheet is the native counterpart to web's Menu, and it is what the
// reaction picker becomes on touch. Two behaviours are worth pinning: the sheet
// closes *before* the item's own handler runs (otherwise a handler that pushes
// a route leaves the sheet mounted behind the new screen), and a disabled item
// stays inert.

import { fireEvent, render } from "@testing-library/react-native";

import { ActionSheet } from "../ActionSheet";

describe("ActionSheet", () => {
  it("closes before it runs the chosen item, and in that order", () => {
    const calls: string[] = [];
    const screen = render(
      <ActionSheet
        open
        onClose={() => calls.push("close")}
        label="اختر تفاعلًا"
        closeLabel="إغلاق"
        items={[
          { id: "celebrate", label: "تهنئة", onSelect: () => calls.push("select") },
          { id: "support", label: "مساندة", onSelect: jest.fn() },
        ]}
      />,
    );

    fireEvent.press(screen.getByRole("button", { name: "تهنئة" }));
    expect(calls).toEqual(["close", "select"]);
  });

  it("does not fire a disabled item", () => {
    const onSelect = jest.fn();
    const screen = render(
      <ActionSheet
        open
        onClose={jest.fn()}
        label="خيارات"
        items={[{ id: "report", label: "إبلاغ", disabled: true, onSelect }]}
      />,
    );

    fireEvent.press(screen.getByRole("button", { name: "إبلاغ" }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("renders nothing while closed", () => {
    const screen = render(
      <ActionSheet
        open={false}
        onClose={jest.fn()}
        label="خيارات"
        items={[{ id: "report", label: "إبلاغ", onSelect: jest.fn() }]}
      />,
    );

    expect(screen.queryByText("إبلاغ")).toBeNull();
  });
});
