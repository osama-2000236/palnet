// SwitchRow exists because the whole row should be the target, not the 40pt
// switch sitting at the end of a 350pt row. That is the thing to pin — plus the
// fact that the control inside is hidden from the accessibility tree, since the
// row already announces the switch role and the state.

import { fireEvent, render } from "@testing-library/react-native";

import { SwitchRow } from "../SwitchRow";

describe("SwitchRow", () => {
  it("toggles when the row is pressed, not only the switch", () => {
    const onChange = jest.fn();
    const screen = render(
      <SwitchRow
        checked={false}
        onChange={onChange}
        label="متاح للعمل"
        description="يظهر شارة على ملفك"
      />,
    );

    fireEvent.press(screen.getByRole("switch", { name: "متاح للعمل" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("announces the row once, with its state and hint", () => {
    const screen = render(
      <SwitchRow
        checked
        onChange={jest.fn()}
        label="أوظّف الآن"
        description="يظهر شارة على ملفك"
      />,
    );

    // One switch in the tree, not two — the inner control is hidden.
    const rows = screen.getAllByRole("switch");
    expect(rows).toHaveLength(1);
    expect(rows[0].props.accessibilityState).toMatchObject({ checked: true });
    expect(rows[0].props.accessibilityHint).toBe("يظهر شارة على ملفك");
  });

  it("stays inert when disabled", () => {
    const onChange = jest.fn();
    const screen = render(
      <SwitchRow checked={false} onChange={onChange} label="متاح للعمل" disabled />,
    );

    fireEvent.press(screen.getByRole("switch", { name: "متاح للعمل" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
