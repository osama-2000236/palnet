import { fireEvent, render } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";

import { Sheet } from "../Sheet";

describe("Sheet", () => {
  it("hides title and content when closed", () => {
    const screen = render(
      <Sheet open={false} onClose={jest.fn()} title="خيارات البحث" closeLabel="إغلاق اللوحة">
        <Text>فرز حسب الأحدث</Text>
      </Sheet>,
    );

    expect(screen.queryByText("خيارات البحث")).toBeNull();
    expect(screen.queryByText("فرز حسب الأحدث")).toBeNull();
  });

  it("renders title, content, and accessible close controls when open", () => {
    const screen = render(
      <Sheet open onClose={jest.fn()} title="خيارات البحث" closeLabel="إغلاق اللوحة">
        <Text>فرز حسب الأحدث</Text>
      </Sheet>,
    );

    expect(screen.getByText("خيارات البحث")).toBeTruthy();
    expect(screen.getByText("فرز حسب الأحدث")).toBeTruthy();
    // Only the header close button is in the a11y tree; the backdrop Pressable
    // is hidden because the modal wrapper sets accessibilityViewIsModal.
    expect(screen.getAllByRole("button", { name: "إغلاق اللوحة" })).toHaveLength(1);
  });

  it("fires onClose when a dismiss control is pressed", () => {
    const onClose = jest.fn();
    const screen = render(
      <Sheet open onClose={onClose} title="خيارات البحث" closeLabel="إغلاق اللوحة">
        <Text>فرز حسب الأحدث</Text>
      </Sheet>,
    );

    fireEvent.press(screen.getAllByLabelText("إغلاق اللوحة")[0]);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders provided action content with its label", () => {
    const onApply = jest.fn();
    const screen = render(
      <Sheet open onClose={jest.fn()} title="خيارات البحث" closeLabel="إغلاق اللوحة" scroll={false}>
        <Pressable onPress={onApply} accessibilityRole="button" accessibilityLabel="تطبيق المرشحات">
          <Text>تطبيق</Text>
        </Pressable>
      </Sheet>,
    );

    fireEvent.press(screen.getByRole("button", { name: "تطبيق المرشحات" }));

    expect(screen.getByText("تطبيق")).toBeTruthy();
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("names the modal wrapper without an invalid accessibilityRole", () => {
    const screen = render(
      <Sheet open onClose={jest.fn()} title="خيارات البحث" closeLabel="إغلاق اللوحة">
        <Text>فرز حسب الأحدث</Text>
      </Sheet>,
    );

    // RN has no "dialog" role — Android throws "Invalid accessibility role
    // value: dialog" at mount. The wrapper carries the name via its label.
    const wrapper = screen.getByLabelText("خيارات البحث");
    expect(wrapper.props.accessibilityViewIsModal).toBe(true);
    expect(wrapper.props.accessibilityRole).toBeUndefined();
  });
});
