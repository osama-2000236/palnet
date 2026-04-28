import { fireEvent, render } from "@testing-library/react-native";

import { Button } from "../Button";

describe("Button", () => {
  it("fires presses and exposes button accessibility", () => {
    const onPress = jest.fn();
    const screen = render(
      <Button onPress={onPress} accessibilityLabel="Save profile">
        Save
      </Button>,
    );

    fireEvent.press(screen.getByText("Save"));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Save profile")).toBeTruthy();
  });

  it("does not fire while loading", () => {
    const onPress = jest.fn();
    const screen = render(
      <Button onPress={onPress} loading>
        Save
      </Button>,
    );

    fireEvent.press(screen.getByText("Save"));

    expect(onPress).not.toHaveBeenCalled();
  });
});
