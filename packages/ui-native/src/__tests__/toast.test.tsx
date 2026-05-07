import { act, fireEvent, render } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";

import { Toast, ToastProvider, useToast } from "../Toast";

describe("Toast", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("renders a message and dismiss action", () => {
    const onDismiss = jest.fn();
    const screen = render(
      <Toast message="Saved" kind="success" onDismiss={onDismiss} dismissLabel="Dismiss toast" />,
    );

    expect(screen.getByText("Saved")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Dismiss toast"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("auto-dismisses shown toasts after the timer", () => {
    function Harness(): JSX.Element {
      const { showToast } = useToast();
      return (
        <Pressable
          accessibilityRole="button"
          onPress={() => showToast({ message: "Profile saved", kind: "success", durationMs: 1000 })}
        >
          <Text>Show toast</Text>
        </Pressable>
      );
    }

    const screen = render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );

    fireEvent.press(screen.getByText("Show toast"));
    expect(screen.getByText("Profile saved")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.queryByText("Profile saved")).toBeNull();
  });
});
