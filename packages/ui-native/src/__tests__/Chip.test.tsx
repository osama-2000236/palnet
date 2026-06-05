import { fireEvent, render } from "@testing-library/react-native";

import { Chip } from "../Chip";

describe("Chip", () => {
  it("renders selected state and fires presses", () => {
    const onPress = jest.fn();
    const screen = render(
      <Chip selected onPress={onPress} accessibilityLabel="Remote jobs">
        Remote
      </Chip>,
    );

    fireEvent.press(screen.getByText("Remote"));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Remote jobs")).toBeTruthy();
  });

  it("renders removable chips", () => {
    const onRemove = jest.fn();
    const screen = render(
      <Chip onRemove={onRemove} removeAccessibilityLabel="Remove design">
        Design
      </Chip>,
    );

    fireEvent.press(screen.getByLabelText("Remove design"));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
