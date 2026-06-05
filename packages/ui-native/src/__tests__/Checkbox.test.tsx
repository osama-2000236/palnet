import { fireEvent, render } from "@testing-library/react-native";

import { Checkbox } from "../Checkbox";

describe("Checkbox", () => {
  it("renders label and toggles", () => {
    const onChange = jest.fn();
    const screen = render(
      <Checkbox checked={false} onChange={onChange} label="Agree" ariaLabel="Agree to terms" />,
    );

    fireEvent.press(screen.getByLabelText("Agree to terms"));

    expect(screen.getByText("Agree")).toBeTruthy();
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("renders error messages", () => {
    const screen = render(
      <Checkbox checked={false} onChange={jest.fn()} error errorMessage="Required" />,
    );

    expect(screen.getByText("Required")).toBeTruthy();
  });

  it("exposes disabled and checked accessibility state", () => {
    const onChange = jest.fn();
    const screen = render(
      <Checkbox
        checked
        disabled
        onChange={onChange}
        label="Agree"
        accessibilityLabel="Agree to terms"
      />,
    );
    const checkbox = screen.getByLabelText("Agree to terms");

    fireEvent.press(checkbox);

    expect(checkbox.props.accessibilityRole).toBe("checkbox");
    expect(checkbox.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true, disabled: true }),
    );
    expect(onChange).not.toHaveBeenCalled();
  });
});
