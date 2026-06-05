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

  it("marks invalid inputs and renders the error message", () => {
    const screen = render(
      <Input accessibilityLabel="Email" error errorMessage="Invalid email" value="" />,
    );

    expect(screen.getByLabelText("Email").props["aria-invalid"]).toBe(true);
    expect(screen.getByText("Invalid email")).toBeTruthy();
  });
});
