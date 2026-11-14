import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { Dialog } from "../Dialog";

describe("Dialog", () => {
  it("exposes dialog semantics and an accessible close control", () => {
    const onClose = jest.fn();
    const screen = render(
      <Dialog open onClose={onClose} title="حذف الحساب" closeLabel="إغلاق مربع الحوار">
        <Text>لا يمكن التراجع عن هذا الإجراء.</Text>
      </Dialog>,
    );

    expect(screen.getByRole("dialog", { name: "حذف الحساب" })).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "إغلاق مربع الحوار" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not expose a close control when blocking", () => {
    const screen = render(
      <Dialog open blocking onClose={jest.fn()} title="جارٍ الحفظ">
        <Text>يرجى الانتظار.</Text>
      </Dialog>,
    );

    expect(screen.getByRole("dialog", { name: "جارٍ الحفظ" })).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
