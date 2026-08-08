import { fireEvent, render } from "@testing-library/react-native";

import { BandwidthChip } from "../BandwidthChip";

const labels = { light: "خفيف", normal: "عادي", full: "كامل" };

describe("BandwidthChip", () => {
  it("shows the current mode and announces what the control is", () => {
    // «خفيف» on its own tells a screen-reader user nothing — it could be a
    // filter, a plan name or a font size. The label carries the sentence.
    const screen = render(
      <BandwidthChip
        mode="light"
        labels={labels}
        label="وضع البيانات: خفيف. اضغط للتبديل."
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText("خفيف")).toBeTruthy();
    expect(screen.getByLabelText("وضع البيانات: خفيف. اضغط للتبديل.")).toBeTruthy();
  });

  it("asks the host to advance, and decides nothing itself", () => {
    const onPress = jest.fn();
    const screen = render(
      <BandwidthChip mode="normal" labels={labels} label="وضع البيانات: عادي." onPress={onPress} />,
    );

    fireEvent.press(screen.getByText("عادي"));

    expect(onPress).toHaveBeenCalledTimes(1);
    // No argument: the cycle lives in @baydar/shared so both platforms agree.
    expect(onPress).toHaveBeenCalledWith();
  });
});
