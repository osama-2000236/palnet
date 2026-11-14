import { render } from "@testing-library/react-native";

import { Input } from "../Input";

describe("Input", () => {
  it("renders a native text input with helper text", () => {
    const screen = render(
      <Input accessibilityLabel="Headline" helperText="Shown on your profile" value="Designer" />,
    );

    expect(screen.getByLabelText("Headline")).toBeTruthy();
    expect(screen.getByText("Shown on your profile")).toBeTruthy();
  });

  it("keeps the placeholder as an accessible name after typing and links validation errors", () => {
    const screen = render(
      <Input placeholder="First name" error errorMessage="First name is required" value="Ada" />,
    );

    const input = screen.getByLabelText("First name");
    expect(input.props.accessibilityLabel).toBe("First name");
    expect(input.props.accessibilityHint).toBe("First name is required");
    expect(screen.getByText("First name is required")).toBeTruthy();
  });

  it("marks invalid inputs and renders the error message", () => {
    const screen = render(
      <Input accessibilityLabel="Email" error errorMessage="Invalid email" value="" />,
    );

    expect(screen.getByLabelText("Email").props["aria-invalid"]).toBe(true);
    expect(screen.getByText("Invalid email")).toBeTruthy();
  });
});
