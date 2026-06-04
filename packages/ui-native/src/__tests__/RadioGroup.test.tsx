import { fireEvent, render } from "@testing-library/react-native";

import { RadioGroup } from "../RadioGroup";

describe("RadioGroup", () => {
  it("renders options and changes value", () => {
    const onValueChange = jest.fn();
    const screen = render(
      <RadioGroup
        label="Visibility"
        value="public"
        onValueChange={onValueChange}
        items={[
          { value: "public", label: "Public" },
          { value: "private", label: "Private" },
        ]}
      />,
    );

    fireEvent.press(screen.getByText("Private"));

    expect(screen.getByText("Visibility")).toBeTruthy();
    expect(onValueChange).toHaveBeenCalledWith("private");
  });

  it("exposes radiogroup, disabled, checked, and error states", () => {
    const onValueChange = jest.fn();
    const screen = render(
      <RadioGroup
        label="Visibility"
        value="public"
        onValueChange={onValueChange}
        error
        errorMessage="Choose one"
        items={[
          { value: "public", label: "Public" },
          { value: "private", label: "Private", disabled: true },
        ]}
      />,
    );
    const group = screen.getByLabelText("Visibility");
    const publicRadio = screen.getByLabelText("Public");
    const privateRadio = screen.getByLabelText("Private");

    fireEvent.press(privateRadio);

    expect(group.props.accessibilityRole).toBe("radiogroup");
    expect(publicRadio.props.accessibilityRole).toBe("radio");
    expect(publicRadio.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true }),
    );
    expect(privateRadio.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: false, disabled: true }),
    );
    expect(screen.getByText("Choose one")).toBeTruthy();
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
