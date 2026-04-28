import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { Surface } from "../Surface";

describe("Surface", () => {
  it("renders children for each supported variant", () => {
    for (const variant of ["flat", "card", "hero", "tinted", "row"] as const) {
      const screen = render(
        <Surface variant={variant} padding="4">
          <Text>{variant}</Text>
        </Surface>,
      );

      expect(screen.getByText(variant)).toBeTruthy();
      screen.unmount();
    }
  });
});
