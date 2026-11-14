import { fireEvent, render } from "@testing-library/react-native";

import {
  SWITCH_OFFSET,
  SWITCH_PAD,
  SWITCH_THUMB,
  SWITCH_TRACK_WIDTH,
  Switch,
  switchThumbLeft,
} from "../Switch";

describe("Switch", () => {
  it("toggles and exposes accessibility state", () => {
    const onChange = jest.fn();
    const screen = render(<Switch checked={false} onChange={onChange} ariaLabel="Email digests" />);

    const control = screen.getByLabelText("Email digests");
    fireEvent.press(control);

    expect(onChange).toHaveBeenCalledWith(true);
    expect(control.props.accessibilityRole).toBe("switch");
    expect(control.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: false, disabled: false }),
    );
  });

  it("does not fire while disabled", () => {
    const onChange = jest.fn();
    const screen = render(<Switch checked disabled onChange={onChange} ariaLabel="Moderation" />);

    fireEvent.press(screen.getByLabelText("Moderation"));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Moderation").props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true, disabled: true }),
    );
  });

  it("keeps the thumb inside the track in LTR and RTL", () => {
    const maxLeft = SWITCH_TRACK_WIDTH - SWITCH_THUMB - SWITCH_PAD;

    // LTR: off at start (left), on at end (right).
    expect(switchThumbLeft(false, false)).toBe(SWITCH_PAD);
    expect(switchThumbLeft(true, false)).toBe(SWITCH_PAD + SWITCH_OFFSET);
    expect(switchThumbLeft(true, false)).toBe(maxLeft);

    // RTL: off at start (right), on at end (left) — never negative / off-track.
    expect(switchThumbLeft(false, true)).toBe(SWITCH_PAD + SWITCH_OFFSET);
    expect(switchThumbLeft(false, true)).toBe(maxLeft);
    expect(switchThumbLeft(true, true)).toBe(SWITCH_PAD);
    expect(switchThumbLeft(true, true)).toBeGreaterThanOrEqual(0);
    expect(switchThumbLeft(false, true)).toBeLessThanOrEqual(maxLeft);
  });
});
